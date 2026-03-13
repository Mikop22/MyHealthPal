"""Tests for the appointment-prep proxy routes (/prep/...).

All DoctorAPP HTTP calls are mocked via monkeypatch so tests run
without a live upstream service.
"""

import httpx
import pytest
from fastapi.testclient import TestClient

import app.prep as prep_module
from app.doctorapp_client import DoctorAppClientError
import app.doctorapp_client as client_module
from app.main import app


client = TestClient(app)


# ---- Fixtures / helpers ---------------------------------------------------

SAMPLE_INVITE_RESPONSE = {
    "prep_episode_id": "prep_123",
    "patient_id": "pt_123",
    "appointment_id": "appt_123",
    "status": "invite_opened",
    "patient_first_name": "Jane",
    "appointment": {
        "date": "2026-03-20",
        "time": "10:30",
        "clinic_name": "MyHealthPal Clinic",
        "clinician_name": "Dr. Smith",
    },
    "can_resume": False,
    "has_submitted": False,
}

SAMPLE_START_RESPONSE = {
    "prep_episode_id": "prep_123",
    "status": "started",
    "checkin_payload": None,
}

SAMPLE_SAVE_RESPONSE = {
    "prep_episode_id": "prep_123",
    "status": "in_progress",
    "message": "Check-in saved.",
}

SAMPLE_SUBMIT_RESPONSE = {
    "status": "ready_for_review",
    "summary_ready": True,
    "prep_episode_id": "prep_123",
}

SAMPLE_SUMMARY_RESPONSE = {
    "status": "ready",
    "summary": [
        "You reported abdominal pain and fatigue.",
        "You shared that this has affected sleep.",
    ],
    "questions_to_ask": [
        "What possibilities should we rule out?",
        "What tests would help?",
        "When should I seek urgent care?",
    ],
}

SAMPLE_STATUS_RESPONSE = {
    "prep_episode_id": "prep_123",
    "status": "in_progress",
    "doctor_facing_label": "In progress",
    "can_resume": True,
    "has_submitted": False,
}


# ===========================================================================
# resolve invite
# ===========================================================================


class TestResolveInvite:

    def test_success(self, monkeypatch):
        async def fake(*a, **kw):
            return SAMPLE_INVITE_RESPONSE

        monkeypatch.setattr(prep_module, "_resolve_invite", fake)

        resp = client.get("/prep/invite/tok_abc")
        assert resp.status_code == 200
        body = resp.json()
        assert body["prep_episode_id"] == "prep_123"
        assert body["patient_first_name"] == "Jane"
        assert body["appointment"]["clinic_name"] == "MyHealthPal Clinic"

    def test_404_from_upstream(self, monkeypatch):
        async def fake(*a, **kw):
            raise DoctorAppClientError(404, "Invite token not found.")

        monkeypatch.setattr(prep_module, "_resolve_invite", fake)

        resp = client.get("/prep/invite/bad_token")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_410_expired(self, monkeypatch):
        async def fake(*a, **kw):
            raise DoctorAppClientError(410, "Invite token has expired.")

        monkeypatch.setattr(prep_module, "_resolve_invite", fake)

        resp = client.get("/prep/invite/expired_tok")
        assert resp.status_code == 410

    def test_502_when_upstream_unreachable(self, monkeypatch):
        async def fake(*a, **kw):
            raise httpx.ConnectError("Connection refused")

        monkeypatch.setattr(prep_module, "_resolve_invite", fake)

        resp = client.get("/prep/invite/tok_abc")
        assert resp.status_code == 502
        assert "unreachable" in resp.json()["detail"].lower()

    def test_502_on_other_request_errors(self, monkeypatch):
        async def fake(*a, **kw):
            raise httpx.ReadError("peer closed connection")

        monkeypatch.setattr(prep_module, "_resolve_invite", fake)

        resp = client.get("/prep/invite/tok_abc")
        assert resp.status_code == 502

    def test_504_when_upstream_times_out(self, monkeypatch):
        async def fake(*a, **kw):
            raise httpx.ReadTimeout("timed out")

        monkeypatch.setattr(prep_module, "_resolve_invite", fake)

        resp = client.get("/prep/invite/tok_abc")
        assert resp.status_code == 504


# ===========================================================================
# start prep
# ===========================================================================


class TestStartPrep:

    def test_success(self, monkeypatch):
        async def fake(*a, **kw):
            return SAMPLE_START_RESPONSE

        monkeypatch.setattr(prep_module, "_start_prep", fake)

        resp = client.post("/prep/tok_abc/start")
        assert resp.status_code == 200
        assert resp.json()["status"] == "started"

    def test_400_already_submitted(self, monkeypatch):
        async def fake(*a, **kw):
            raise DoctorAppClientError(400, "Cannot start prep in status 'submitted'.")

        monkeypatch.setattr(prep_module, "_start_prep", fake)

        resp = client.post("/prep/tok_abc/start")
        assert resp.status_code == 400

    def test_returns_existing_draft(self, monkeypatch):
        async def fake(*a, **kw):
            return {
                "prep_episode_id": "prep_123",
                "status": "in_progress",
                "checkin_payload": {
                    "raw_text": "I have a headache.",
                    "extracted_symptoms": [],
                    "confirmed_symptoms": [],
                    "dismissed_symptoms": [],
                },
            }

        monkeypatch.setattr(prep_module, "_start_prep", fake)

        resp = client.post("/prep/tok_abc/start")
        assert resp.status_code == 200
        assert resp.json()["checkin_payload"]["raw_text"] == "I have a headache."


# ===========================================================================
# save check-in
# ===========================================================================


class TestSaveCheckin:

    def test_success(self, monkeypatch):
        async def fake(token, payload):
            assert token == "tok_abc"
            assert payload["raw_text"] == "stomach pain for 4 days"
            return SAMPLE_SAVE_RESPONSE

        monkeypatch.setattr(prep_module, "_save_checkin", fake)

        resp = client.post(
            "/prep/tok_abc/save-checkin",
            json={
                "raw_text": "stomach pain for 4 days",
                "extracted_symptoms": [
                    {"id": "sym_1", "label": "stomach pain", "severity": 4}
                ],
                "confirmed_symptoms": ["sym_1"],
                "dismissed_symptoms": [],
            },
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "Check-in saved."

    def test_422_when_raw_text_missing(self):
        resp = client.post("/prep/tok_abc/save-checkin", json={})
        assert resp.status_code == 422

    def test_400_when_already_submitted(self, monkeypatch):
        async def fake(*a, **kw):
            raise DoctorAppClientError(400, "Cannot save check-in in status 'submitted'.")

        monkeypatch.setattr(prep_module, "_save_checkin", fake)

        resp = client.post(
            "/prep/tok_abc/save-checkin",
            json={"raw_text": "test"},
        )
        assert resp.status_code == 400


# ===========================================================================
# save documents
# ===========================================================================


class TestSaveDocuments:

    def test_success(self, monkeypatch):
        async def fake(token, payload):
            return {
                "prep_episode_id": "prep_123",
                "status": "in_progress",
                "message": "Documents saved.",
            }

        monkeypatch.setattr(prep_module, "_save_documents", fake)

        resp = client.post(
            "/prep/tok_abc/save-documents",
            json={
                "documents": [
                    {
                        "document_id": "doc_1",
                        "title": "Lab results",
                        "summary_bullets": ["Normal CBC"],
                        "patient_note": "From urgent care",
                        "shared": True,
                    }
                ]
            },
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "Documents saved."

    def test_empty_documents_allowed(self, monkeypatch):
        async def fake(token, payload):
            return {
                "prep_episode_id": "prep_123",
                "status": "in_progress",
                "message": "Documents saved.",
            }

        monkeypatch.setattr(prep_module, "_save_documents", fake)

        resp = client.post("/prep/tok_abc/save-documents", json={"documents": []})
        assert resp.status_code == 200


# ===========================================================================
# save health data
# ===========================================================================


class TestSaveHealthData:

    def test_success(self, monkeypatch):
        async def fake(token, payload):
            return {
                "prep_episode_id": "prep_123",
                "status": "in_progress",
                "message": "Health data saved.",
            }

        monkeypatch.setattr(prep_module, "_save_health_data", fake)

        resp = client.post(
            "/prep/tok_abc/save-health-data",
            json={
                "source": "apple_health",
                "sync_timestamp": "2026-03-13T12:00:00Z",
                "metrics": {"restingHeartRate": [72, 74]},
                "shared": True,
            },
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "Health data saved."

    def test_defaults_applied(self, monkeypatch):
        captured = {}

        async def fake(token, payload):
            captured.update(payload)
            return {
                "prep_episode_id": "prep_123",
                "status": "in_progress",
                "message": "Health data saved.",
            }

        monkeypatch.setattr(prep_module, "_save_health_data", fake)

        resp = client.post("/prep/tok_abc/save-health-data", json={})
        assert resp.status_code == 200
        assert captured["source"] == "unknown"
        assert captured["shared"] is True


# ===========================================================================
# submit
# ===========================================================================


class TestSubmitPrep:

    def test_success(self, monkeypatch):
        async def fake(*a, **kw):
            return SAMPLE_SUBMIT_RESPONSE

        monkeypatch.setattr(prep_module, "_submit_prep", fake)

        resp = client.post("/prep/tok_abc/submit")
        assert resp.status_code == 200
        assert resp.json()["summary_ready"] is True

    def test_400_already_submitted(self, monkeypatch):
        async def fake(*a, **kw):
            raise DoctorAppClientError(400, "Prep has already been submitted.")

        monkeypatch.setattr(prep_module, "_submit_prep", fake)

        resp = client.post("/prep/tok_abc/submit")
        assert resp.status_code == 400


# ===========================================================================
# summary
# ===========================================================================


class TestGetSummary:

    def test_success(self, monkeypatch):
        async def fake(*a, **kw):
            return SAMPLE_SUMMARY_RESPONSE

        monkeypatch.setattr(prep_module, "_get_summary", fake)

        resp = client.get("/prep/tok_abc/summary")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["summary"]) == 2
        assert len(body["questions_to_ask"]) == 3

    def test_404_not_submitted_yet(self, monkeypatch):
        async def fake(*a, **kw):
            raise DoctorAppClientError(404, "Summary not yet available.")

        monkeypatch.setattr(prep_module, "_get_summary", fake)

        resp = client.get("/prep/tok_abc/summary")
        assert resp.status_code == 404


# ===========================================================================
# status
# ===========================================================================


class TestGetStatus:

    def test_success(self, monkeypatch):
        async def fake(*a, **kw):
            return SAMPLE_STATUS_RESPONSE

        monkeypatch.setattr(prep_module, "_get_status", fake)

        resp = client.get("/prep/tok_abc/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "in_progress"
        assert body["can_resume"] is True
        assert body["has_submitted"] is False

    def test_404_unknown_token(self, monkeypatch):
        async def fake(*a, **kw):
            raise DoctorAppClientError(404, "Prep episode not found.")

        monkeypatch.setattr(prep_module, "_get_status", fake)

        resp = client.get("/prep/bad_tok/status")
        assert resp.status_code == 404


# ===========================================================================
# DoctorAppClientError
# ===========================================================================


class TestDoctorAppClientError:

    def test_attributes(self):
        err = DoctorAppClientError(409, "Conflict")
        assert err.status_code == 409
        assert err.detail == "Conflict"
        assert "409" in str(err)


# ===========================================================================
# doctorapp_client internals
# ===========================================================================


class TestClientHelpers:

    def test_base_url_defaults(self, monkeypatch):
        monkeypatch.delenv("DOCTORAPP_BASE_URL", raising=False)
        assert client_module._base_url() == "http://localhost:8001"

    def test_base_url_from_env(self, monkeypatch):
        monkeypatch.setenv("DOCTORAPP_BASE_URL", "https://api.example.com")
        assert client_module._base_url() == "https://api.example.com"

    def test_base_url_strips_trailing_slash(self, monkeypatch):
        monkeypatch.setenv("DOCTORAPP_BASE_URL", "https://api.example.com/")
        assert client_module._base_url() == "https://api.example.com"

    def test_timeout_defaults(self, monkeypatch):
        monkeypatch.delenv("DOCTORAPP_TIMEOUT", raising=False)
        assert client_module._timeout() == 30.0

    def test_timeout_from_env(self, monkeypatch):
        monkeypatch.setenv("DOCTORAPP_TIMEOUT", "60")
        assert client_module._timeout() == 60.0

    def test_timeout_invalid_falls_back(self, monkeypatch):
        monkeypatch.setenv("DOCTORAPP_TIMEOUT", "not-a-number")
        assert client_module._timeout() == 30.0
