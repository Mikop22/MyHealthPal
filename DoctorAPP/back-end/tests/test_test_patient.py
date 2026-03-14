"""Tests for POST /api/v1/patients/test — test patient creation endpoint.

Verifies the endpoint that creates a demo patient with mock biometric data
and runs the full AI analysis pipeline, storing results for the dashboard.
"""

from __future__ import annotations

from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.patient import (
    AnalysisResponse,
    BiometricDelta,
    ClinicalBrief,
    ConditionMatch,
    RiskProfile,
)


# Stub analysis response returned by the mocked pipeline
STUB_ANALYSIS = AnalysisResponse(
    patient_id="pt_test",
    clinical_brief=ClinicalBrief(
        summary="stub",
        clinical_intake="stub intake",
        primary_concern="Severe Pelvic Pain",
        key_symptoms=["pain"],
        severity_assessment="moderate",
        recommended_actions=["rest"],
        cited_sources=["src"],
        guiding_questions=["q?"],
    ),
    biometric_deltas=[
        BiometricDelta(
            metric="restingHeartRate",
            acute_avg=70.0,
            longitudinal_avg=65.0,
            delta=5.0,
            unit="bpm",
            clinically_significant=True,
        )
    ],
    condition_matches=[
        ConditionMatch(
            condition="test",
            similarity_score=0.9,
            pmcid="PMC000",
            title="Test Paper",
            snippet="snippet",
        )
    ],
    risk_profile=RiskProfile(factors=[]),
)


def _make_client():
    """Create a TestClient with a mocked MongoDB."""
    from app.main import app

    mock_patients_coll = MagicMock()
    mock_patients_coll.insert_one.return_value = MagicMock()
    mock_patients_coll.update_one.return_value = MagicMock()
    mock_patients_coll.delete_one.return_value = MagicMock()

    mock_appointments_coll = MagicMock()
    mock_appointments_coll.insert_one.return_value = MagicMock()
    mock_appointments_coll.update_one.return_value = MagicMock()
    mock_appointments_coll.delete_one.return_value = MagicMock()

    mock_db = MagicMock()
    mock_db.patients = mock_patients_coll
    mock_db.appointments = mock_appointments_coll

    mock_mongo = MagicMock()
    mock_mongo.__getitem__ = MagicMock(return_value=mock_db)

    app.state.mongo_client = mock_mongo
    app.state.db_name = "diagnostic_test"
    app.state.embedding_model = MagicMock()

    return TestClient(app, raise_server_exceptions=False), mock_patients_coll, mock_appointments_coll


class TestCreateTestPatient:
    """Tests for POST /api/v1/patients/test."""

    @patch(
        "app.routes.patients.analyze_patient_pipeline",
        new_callable=AsyncMock,
        return_value=STUB_ANALYSIS,
    )
    @patch("app.routes.patients.settings")
    def test_success_creates_patient_and_returns_in_progress(self, mock_settings, mock_pipeline):
        """Happy path — creates patient with In Progress status, stores narrative for later analysis."""
        mock_settings.ENABLE_DEMO_ENDPOINTS = True
        client, mock_patients, mock_appointments = _make_client()
        resp = client.post("/api/v1/patients/test")
        assert resp.status_code == 200
        body = resp.json()

        # Patient record returned with expected fields
        assert body["name"] == "Test Patient"
        assert body["email"] == "test@demo.myhealthpal.com"
        assert body["status"] == "In Progress"
        assert body["concern"] == ""
        assert "id" in body

        # Pipeline should NOT be called in the create endpoint
        mock_pipeline.assert_not_called()

        # DB inserts: one for patient, one for appointment
        assert mock_patients.insert_one.call_count == 1
        assert mock_appointments.insert_one.call_count == 1

        # DB updates: appointment should have narrative stored, patient status unchanged
        assert mock_appointments.update_one.call_count == 1
        appt_update = mock_appointments.update_one.call_args[0][1]
        assert "patient_narrative" in appt_update["$set"]
        # Should contain the actual test narrative, not "stub"
        assert "I've been experiencing severe lower abdominal pain" in appt_update["$set"]["patient_narrative"]

        # Patient should not be updated yet
        assert mock_patients.update_one.call_count == 0

    @patch("app.routes.patients.settings")
    def test_creates_patient_successfully_even_with_pipeline_mocked(self, mock_settings):
        """Create endpoint should succeed regardless of pipeline issues (pipeline not called)."""
        mock_settings.ENABLE_DEMO_ENDPOINTS = True
        client, mock_patients, mock_appointments = _make_client()
        resp = client.post("/api/v1/patients/test")
        assert resp.status_code == 200
        body = resp.json()

        # Should return patient with In Progress status
        assert body["status"] == "In Progress"
        assert body["name"] == "Test Patient"
        assert body["email"] == "test@demo.myhealthpal.com"

    @patch("app.routes.patients.settings")
    def test_403_when_demo_endpoints_disabled(self, mock_settings):
        """Endpoint returns 403 when ENABLE_DEMO_ENDPOINTS is false."""
        mock_settings.ENABLE_DEMO_ENDPOINTS = False
        client, _, _ = _make_client()
        resp = client.post("/api/v1/patients/test")
        assert resp.status_code == 403
        assert "disabled" in resp.json()["detail"].lower()


class TestSubmitTestPatientAnalysis:
    """Tests for POST /api/v1/patients/test/submit."""

    @patch(
        "app.routes.patients.analyze_patient_pipeline",
        new_callable=AsyncMock,
        return_value=STUB_ANALYSIS,
    )
    @patch("app.routes.patients.settings")
    def test_success_runs_pipeline_and_updates_patient(self, mock_settings, mock_pipeline):
        """Happy path — runs pipeline, updates patient and appointment status."""
        mock_settings.ENABLE_DEMO_ENDPOINTS = True
        client, mock_patients, mock_appointments = _make_client()
        
        # First create a test patient
        create_resp = client.post("/api/v1/patients/test")
        patient_id = create_resp.json()["id"]
        
        # Mock the appointment lookup to return a test appointment
        mock_appointments.find_one.return_value = {
            "patient_id": patient_id,
            "patient_narrative": "Test symptoms",
        }
        
        # Now submit the analysis
        resp = client.post("/api/v1/patients/test/submit", json={"patient_id": patient_id})
        assert resp.status_code == 200
        body = resp.json()
        
        assert body["status"] == "success"
        assert "primary_concern" in body
        
        # Pipeline should be called
        mock_pipeline.assert_called_once()
        
        # Appointment should be updated with completed status and analysis
        assert mock_appointments.update_one.call_count >= 1
        # Patient should be updated with completed status
        assert mock_patients.update_one.call_count >= 1

    @patch("app.routes.patients.settings")
    def test_404_when_patient_not_found(self, mock_settings):
        """Returns 404 when patient doesn't exist."""
        mock_settings.ENABLE_DEMO_ENDPOINTS = True
        client, mock_patients, mock_appointments = _make_client()
        
        # Mock both lookups to return None (not found)
        mock_patients.find_one.return_value = None
        mock_appointments.find_one.return_value = None
        
        resp = client.post("/api/v1/patients/test/submit", json={"patient_id": "nonexistent"})
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @patch("app.routes.patients.settings")
    def test_403_when_demo_endpoints_disabled(self, mock_settings):
        """Returns 403 when demo endpoints are disabled."""
        mock_settings.ENABLE_DEMO_ENDPOINTS = False
        client, _, _ = _make_client()
        
        resp = client.post("/api/v1/patients/test/submit", json={"patient_id": "test-id"})
        assert resp.status_code == 403
        assert "disabled" in resp.json()["detail"].lower()
