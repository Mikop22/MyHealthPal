"""Tests for the mobile-prep API routes.

Covers all eight endpoints under ``/api/v1/mobile-prep``.

Uses unittest.mock to stub MongoDB so the routes can be exercised
without external dependencies — consistent with the existing test patterns
in test_intake.py, test_dashboard.py, and test_webhook.py.
"""

from __future__ import annotations

from copy import deepcopy
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

TOKEN = "inv_test_token_1234"
PREP_EPISODE_ID = "prep_001"
PATIENT_ID = "pt_001"
APPOINTMENT_ID = "appt_001"

# A minimal prep-episode document as it would appear in MongoDB.
BASE_PREP_DOC = {
    "id": PREP_EPISODE_ID,
    "patient_id": PATIENT_ID,
    "appointment_id": APPOINTMENT_ID,
    "invite_token": TOKEN,
    "status": "invite_sent",
    "source": "mobile",
    "invite_sent_at": "2026-03-13T10:00:00+00:00",
    "invite_opened_at": None,
    "started_at": None,
    "submitted_at": None,
    "reviewed_at": None,
    "checkin_payload": None,
    "documents": [],
    "health_data_payload": None,
    "patient_safe_summary": None,
    "questions_to_ask": None,
    "analysis_response": None,
    "created_at": "2026-03-13T10:00:00+00:00",
    "updated_at": "2026-03-13T10:00:00+00:00",
}

APPOINTMENT_DOC = {
    "id": APPOINTMENT_ID,
    "patient_id": PATIENT_ID,
    "date": "2026-03-20",
    "time": "10:30",
    "status": "scheduled",
    "form_token": "legacy_form_token",
    "created_at": "2026-03-13T10:00:00+00:00",
}

PATIENT_DOC = {
    "id": PATIENT_ID,
    "name": "Jane Doe",
    "email": "jane@example.com",
}


# ---------------------------------------------------------------------------
# Test-client factory — mirrors existing pattern from test_intake.py
# ---------------------------------------------------------------------------

def _make_client(prep_doc=None, appointment_doc=None, patient_doc=None):
    """Create a fresh TestClient with mocked MongoDB collections."""
    from app.main import app

    mock_prep_coll = MagicMock()
    mock_prep_coll.find_one.return_value = deepcopy(prep_doc)
    mock_prep_coll.update_one.return_value = MagicMock()

    mock_appt_coll = MagicMock()
    mock_appt_coll.find_one.return_value = deepcopy(appointment_doc)

    mock_patient_coll = MagicMock()
    mock_patient_coll.find_one.return_value = deepcopy(patient_doc)

    mock_db = MagicMock()
    mock_db.prep_episodes = mock_prep_coll
    mock_db.appointments = mock_appt_coll
    mock_db.patients = mock_patient_coll

    mock_mongo = MagicMock()
    mock_mongo.__getitem__ = MagicMock(return_value=mock_db)

    app.state.mongo_client = mock_mongo
    app.state.db_name = "diagnostic_test"
    app.state.embedding_model = MagicMock()

    return TestClient(app, raise_server_exceptions=False), mock_prep_coll


# ===========================================================================
# GET /api/v1/mobile-prep/invite/{token}
# ===========================================================================

class TestResolveInvite:
    """Tests for invite resolution."""

    def test_404_unknown_token(self):
        client, _ = _make_client(prep_doc=None)
        resp = client.get(f"/api/v1/mobile-prep/invite/{TOKEN}")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_success_returns_context(self):
        client, mock_coll = _make_client(
            prep_doc=BASE_PREP_DOC,
            appointment_doc=APPOINTMENT_DOC,
            patient_doc=PATIENT_DOC,
        )
        resp = client.get(f"/api/v1/mobile-prep/invite/{TOKEN}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["prep_episode_id"] == PREP_EPISODE_ID
        assert body["patient_first_name"] == "Jane"
        assert body["appointment"]["date"] == "2026-03-20"
        assert body["has_submitted"] is False

    def test_marks_invite_opened(self):
        client, mock_coll = _make_client(
            prep_doc=BASE_PREP_DOC,
            appointment_doc=APPOINTMENT_DOC,
            patient_doc=PATIENT_DOC,
        )
        client.get(f"/api/v1/mobile-prep/invite/{TOKEN}")
        mock_coll.update_one.assert_called_once()
        update_args = mock_coll.update_one.call_args[0][1]["$set"]
        assert update_args["status"] == "invite_opened"
        assert "invite_opened_at" in update_args

    def test_does_not_regress_submitted_status_on_first_open(self):
        doc = {**BASE_PREP_DOC, "status": "submitted"}
        client, mock_coll = _make_client(
            prep_doc=doc,
            appointment_doc=APPOINTMENT_DOC,
            patient_doc=PATIENT_DOC,
        )
        resp = client.get(f"/api/v1/mobile-prep/invite/{TOKEN}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "submitted"
        assert body["has_submitted"] is True

        update_args = mock_coll.update_one.call_args[0][1]["$set"]
        assert "invite_opened_at" in update_args
        assert "status" not in update_args


# ===========================================================================
# POST /api/v1/mobile-prep/{token}/start
# ===========================================================================

class TestStartPrep:
    """Tests for starting a prep episode."""

    def test_404_unknown_token(self):
        client, _ = _make_client(prep_doc=None)
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/start")
        assert resp.status_code == 404

    def test_success(self):
        client, mock_coll = _make_client(prep_doc=BASE_PREP_DOC)
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/start")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "started"
        assert body["prep_episode_id"] == PREP_EPISODE_ID

    def test_400_already_submitted(self):
        doc = {**BASE_PREP_DOC, "status": "submitted"}
        client, _ = _make_client(prep_doc=doc)
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/start")
        assert resp.status_code == 400

    def test_returns_existing_draft(self):
        doc = {
            **BASE_PREP_DOC,
            "status": "in_progress",
            "checkin_payload": {
                "raw_text": "I feel dizzy",
                "extracted_symptoms": [],
                "confirmed_symptoms": [],
                "dismissed_symptoms": [],
            },
        }
        client, _ = _make_client(prep_doc=doc)
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/start")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "in_progress"
        assert body["checkin_payload"]["raw_text"] == "I feel dizzy"

    def test_does_not_regress_in_progress_status(self):
        doc = {
            **BASE_PREP_DOC,
            "status": "in_progress",
            "checkin_payload": {
                "raw_text": "I feel dizzy",
                "extracted_symptoms": [],
                "confirmed_symptoms": [],
                "dismissed_symptoms": [],
            },
        }
        client, mock_coll = _make_client(prep_doc=doc)
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/start")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "in_progress"

        update_set = mock_coll.update_one.call_args[0][1]["$set"]
        assert update_set["status"] == "in_progress"


# ===========================================================================
# POST /api/v1/mobile-prep/{token}/save-checkin
# ===========================================================================

class TestSaveCheckin:
    """Tests for saving check-in data."""

    def test_404_unknown_token(self):
        client, _ = _make_client(prep_doc=None)
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-checkin",
            json={"raw_text": "test"},
        )
        assert resp.status_code == 404

    def test_success_saves_payload(self):
        client, mock_coll = _make_client(prep_doc=BASE_PREP_DOC)
        payload = {
            "raw_text": "I have had headaches for a week.",
            "extracted_symptoms": [
                {"id": "sym_1", "label": "headache", "severity": 3}
            ],
            "confirmed_symptoms": ["sym_1"],
            "dismissed_symptoms": [],
        }
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-checkin",
            json=payload,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "in_progress"
        assert body["message"] == "Check-in saved."

        # Verify DB update
        mock_coll.update_one.assert_called_once()
        update_set = mock_coll.update_one.call_args[0][1]["$set"]
        assert update_set["checkin_payload"]["raw_text"] == payload["raw_text"]

    def test_rejects_updates_after_submit(self):
        doc = {**BASE_PREP_DOC, "status": "submitted"}
        client, mock_coll = _make_client(prep_doc=doc)
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-checkin",
            json={"raw_text": "test"},
        )
        assert resp.status_code == 400
        assert "cannot save check-in" in resp.json()["detail"].lower()
        mock_coll.update_one.assert_not_called()


# ===========================================================================
# POST /api/v1/mobile-prep/{token}/save-documents
# ===========================================================================

class TestSaveDocuments:
    """Tests for saving document data."""

    def test_404_unknown_token(self):
        client, _ = _make_client(prep_doc=None)
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-documents",
            json={"documents": []},
        )
        assert resp.status_code == 404

    def test_success_saves_documents(self):
        client, mock_coll = _make_client(prep_doc=BASE_PREP_DOC)
        payload = {
            "documents": [
                {
                    "document_id": "doc_1",
                    "title": "Lab results",
                    "summary_bullets": ["Normal range"],
                    "patient_note": "From last visit",
                    "shared": True,
                }
            ],
        }
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-documents",
            json=payload,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "Documents saved."

    def test_rejects_updates_after_submit(self):
        doc = {**BASE_PREP_DOC, "status": "analysis_running"}
        client, mock_coll = _make_client(prep_doc=doc)
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-documents",
            json={"documents": []},
        )
        assert resp.status_code == 400
        assert "cannot save documents" in resp.json()["detail"].lower()
        mock_coll.update_one.assert_not_called()


# ===========================================================================
# POST /api/v1/mobile-prep/{token}/save-health-data
# ===========================================================================

class TestSaveHealthData:
    """Tests for saving health data."""

    def test_404_unknown_token(self):
        client, _ = _make_client(prep_doc=None)
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-health-data",
            json={"source": "apple_health", "shared": True},
        )
        assert resp.status_code == 404

    def test_success_saves_health_data(self):
        client, mock_coll = _make_client(prep_doc=BASE_PREP_DOC)
        payload = {
            "source": "apple_health",
            "sync_timestamp": "2026-03-13T12:00:00Z",
            "metrics": {"restingHeartRate": [72, 74]},
            "shared": True,
        }
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-health-data",
            json=payload,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "Health data saved."

    def test_rejects_updates_after_submit(self):
        doc = {**BASE_PREP_DOC, "status": "ready_for_review"}
        client, mock_coll = _make_client(prep_doc=doc)
        resp = client.post(
            f"/api/v1/mobile-prep/{TOKEN}/save-health-data",
            json={"source": "apple_health", "shared": True},
        )
        assert resp.status_code == 400
        assert "cannot save health data" in resp.json()["detail"].lower()
        mock_coll.update_one.assert_not_called()


# ===========================================================================
# POST /api/v1/mobile-prep/{token}/submit
# ===========================================================================

class TestSubmitPrep:
    """Tests for submitting the prep package."""

    def test_404_unknown_token(self):
        client, _ = _make_client(prep_doc=None)
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/submit")
        assert resp.status_code == 404

    def test_400_already_submitted(self):
        doc = {**BASE_PREP_DOC, "status": "submitted"}
        client, _ = _make_client(prep_doc=doc)
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/submit")
        assert resp.status_code == 400
        assert "already" in resp.json()["detail"].lower()

    def test_success_with_checkin(self):
        doc = {
            **BASE_PREP_DOC,
            "status": "in_progress",
            "checkin_payload": {
                "raw_text": "Stomach pain for days",
                "extracted_symptoms": [
                    {"id": "sym_1", "label": "stomach pain", "severity": 4}
                ],
                "confirmed_symptoms": ["sym_1"],
                "dismissed_symptoms": [],
            },
        }
        client, mock_coll = _make_client(prep_doc=doc)
        # Explicitly mock the analysis pipeline to fail so we exercise the
        # failure-handling path deterministically without relying on real deps.
        client.app.state.analyze_patient_pipeline = MagicMock(
            side_effect=RuntimeError("analysis failed")
        )
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/submit")
        assert resp.status_code == 200
        body = resp.json()
        # Pipeline is mocked to fail so status falls back to submitted
        assert body["status"] == "submitted"
        assert body["summary_ready"] is True

        # Verify the first update persisted the summary
        first_update = mock_coll.update_one.call_args_list[0][0][1]["$set"]
        assert isinstance(first_update["patient_safe_summary"], list)
        assert len(first_update["patient_safe_summary"]) > 0
        assert isinstance(first_update["questions_to_ask"], list)
        assert first_update["status"] == "analysis_running"

    def test_success_minimal(self):
        """Submit with no check-in data — still generates a fallback summary."""
        doc = {**BASE_PREP_DOC, "status": "started"}
        client, mock_coll = _make_client(prep_doc=doc)
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/submit")
        assert resp.status_code == 200
        body = resp.json()
        assert body["summary_ready"] is True

    def test_analysis_failure_falls_back_to_submitted(self):
        """When the analysis pipeline fails the status should fall back to submitted."""
        doc = {
            **BASE_PREP_DOC,
            "status": "in_progress",
            "checkin_payload": {
                "raw_text": "Stomach pain",
                "extracted_symptoms": [],
                "confirmed_symptoms": [],
                "dismissed_symptoms": [],
            },
        }
        client, mock_coll = _make_client(prep_doc=doc)
        # Explicitly mock the analysis pipeline to raise so this test does not
        # depend on incidental failures from mocked downstream dependencies.
        client.app.state.analyze_patient_pipeline = MagicMock(
            side_effect=RuntimeError("analysis failed")
        )
        resp = client.post(f"/api/v1/mobile-prep/{TOKEN}/submit")
        assert resp.status_code == 200

        # The mocked analysis pipeline raised, so verify the fallback occurred.
        # The last update_one sets status back to submitted on failure.
        last_update = mock_coll.update_one.call_args_list[-1][0][1]["$set"]
        assert last_update["status"] == "submitted"


# ===========================================================================
# GET /api/v1/mobile-prep/{token}/summary
# ===========================================================================

class TestGetSummary:
    """Tests for retrieving the patient-safe summary."""

    def test_404_unknown_token(self):
        client, _ = _make_client(prep_doc=None)
        resp = client.get(f"/api/v1/mobile-prep/{TOKEN}/summary")
        assert resp.status_code == 404

    def test_404_not_yet_submitted(self):
        client, _ = _make_client(prep_doc=BASE_PREP_DOC)
        resp = client.get(f"/api/v1/mobile-prep/{TOKEN}/summary")
        assert resp.status_code == 404
        assert "not yet available" in resp.json()["detail"].lower()

    def test_success_returns_summary(self):
        doc = {
            **BASE_PREP_DOC,
            "status": "submitted",
            "patient_safe_summary": ["You shared your concerns."],
            "questions_to_ask": ["What should I ask?"],
        }
        client, _ = _make_client(prep_doc=doc)
        resp = client.get(f"/api/v1/mobile-prep/{TOKEN}/summary")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ready"
        assert len(body["summary"]) == 1
        assert len(body["questions_to_ask"]) == 1


# ===========================================================================
# GET /api/v1/mobile-prep/{token}/status
# ===========================================================================

class TestGetPrepStatus:
    """Tests for the status polling endpoint."""

    def test_404_unknown_token(self):
        client, _ = _make_client(prep_doc=None)
        resp = client.get(f"/api/v1/mobile-prep/{TOKEN}/status")
        assert resp.status_code == 404

    def test_returns_status_before_submit(self):
        doc = {**BASE_PREP_DOC, "status": "invite_sent"}
        client, _ = _make_client(prep_doc=doc)
        resp = client.get(f"/api/v1/mobile-prep/{TOKEN}/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "invite_sent"
        assert body["has_submitted"] is False
        assert body["can_resume"] is False
        assert body["doctor_facing_label"] == "Not started"

    def test_returns_status_after_submit(self):
        doc = {**BASE_PREP_DOC, "status": "submitted"}
        client, _ = _make_client(prep_doc=doc)
        resp = client.get(f"/api/v1/mobile-prep/{TOKEN}/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["has_submitted"] is True
        assert body["doctor_facing_label"] == "Submitted"

    def test_returns_in_progress_can_resume(self):
        doc = {**BASE_PREP_DOC, "status": "in_progress"}
        client, _ = _make_client(prep_doc=doc)
        resp = client.get(f"/api/v1/mobile-prep/{TOKEN}/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["can_resume"] is True
        assert body["doctor_facing_label"] == "In progress"


# ===========================================================================
# Token expiry validation
# ===========================================================================

class TestTokenExpiry:
    """Tests for invite token expiry enforcement."""

    def test_expired_token_rejected_on_invite(self):
        doc = {
            **BASE_PREP_DOC,
            "invite_expires_at": "2020-01-01T00:00:00+00:00",
        }
        client, _ = _make_client(
            prep_doc=doc,
            appointment_doc=APPOINTMENT_DOC,
            patient_doc=PATIENT_DOC,
        )
        resp = client.get(f"/api/v1/mobile-prep/invite/{TOKEN}")
        assert resp.status_code == 410
        assert "expired" in resp.json()["detail"].lower()

    def test_valid_token_accepted_on_invite(self):
        doc = {
            **BASE_PREP_DOC,
            "invite_expires_at": "2099-12-31T23:59:59+00:00",
        }
        client, _ = _make_client(
            prep_doc=doc,
            appointment_doc=APPOINTMENT_DOC,
            patient_doc=PATIENT_DOC,
        )
        resp = client.get(f"/api/v1/mobile-prep/invite/{TOKEN}")
        assert resp.status_code == 200

    def test_missing_expiry_treated_as_valid(self):
        doc = {**BASE_PREP_DOC}
        doc.pop("invite_expires_at", None)
        client, _ = _make_client(
            prep_doc=doc,
            appointment_doc=APPOINTMENT_DOC,
            patient_doc=PATIENT_DOC,
        )
        resp = client.get(f"/api/v1/mobile-prep/invite/{TOKEN}")
        assert resp.status_code == 200


# ===========================================================================
# Appointment creates prep episode
# ===========================================================================

class TestAppointmentCreatesPrep:
    """Tests that appointment creation also creates a prep episode."""

    def _make_appointment_client(self):
        from app.main import app

        mock_patient_coll = MagicMock()
        mock_patient_coll.find_one.return_value = deepcopy(PATIENT_DOC)

        mock_appt_coll = MagicMock()
        mock_appt_coll.insert_one.return_value = MagicMock()

        mock_prep_coll = MagicMock()
        mock_prep_coll.insert_one.return_value = MagicMock()

        mock_db = MagicMock()
        mock_db.patients = mock_patient_coll
        mock_db.appointments = mock_appt_coll
        mock_db.prep_episodes = mock_prep_coll

        mock_mongo = MagicMock()
        mock_mongo.__getitem__ = MagicMock(return_value=mock_db)

        app.state.mongo_client = mock_mongo
        app.state.db_name = "diagnostic_test"
        app.state.embedding_model = MagicMock()

        return TestClient(app, raise_server_exceptions=False), mock_db

    def test_prep_episode_inserted_on_appointment_creation(self):
        client, mock_db = self._make_appointment_client()
        resp = client.post(
            "/api/v1/appointments",
            json={
                "patient_id": PATIENT_ID,
                "date": "2026-04-01",
                "time": "14:00",
            },
        )
        assert resp.status_code == 200

        # Verify prep_episodes.insert_one was called
        mock_db.prep_episodes.insert_one.assert_called_once()
        prep_doc = mock_db.prep_episodes.insert_one.call_args[0][0]

        assert prep_doc["patient_id"] == PATIENT_ID
        assert prep_doc["status"] == "invite_sent"
        assert prep_doc["source"] == "mobile"
        assert prep_doc["invite_token"]  # non-empty
        assert prep_doc["invite_sent_at"]
        assert prep_doc["invite_expires_at"]  # TTL set

    def test_prep_episode_linked_to_appointment(self):
        client, mock_db = self._make_appointment_client()
        resp = client.post(
            "/api/v1/appointments",
            json={
                "patient_id": PATIENT_ID,
                "date": "2026-04-01",
                "time": "14:00",
            },
        )
        assert resp.status_code == 200
        appt = resp.json()

        prep_doc = mock_db.prep_episodes.insert_one.call_args[0][0]
        assert prep_doc["appointment_id"] == appt["id"]
