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

    mock_appointments_coll = MagicMock()
    mock_appointments_coll.insert_one.return_value = MagicMock()
    mock_appointments_coll.update_one.return_value = MagicMock()

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
    def test_success_creates_patient_and_runs_pipeline(self, mock_pipeline):
        """Happy path — creates patient, runs pipeline, returns completed record."""
        client, mock_patients, mock_appointments = _make_client()
        resp = client.post("/api/v1/patients/test")
        assert resp.status_code == 200
        body = resp.json()

        # Patient record returned with expected fields
        assert body["name"] == "Test Patient"
        assert body["email"] == "test@demo.myhealthpal.com"
        assert body["status"] == "Completed"
        assert body["concern"] == "Severe Pelvic Pain"
        assert "id" in body

        # Pipeline was called
        mock_pipeline.assert_called_once()

        # DB inserts: one for patient, one for appointment
        assert mock_patients.insert_one.call_count == 1
        assert mock_appointments.insert_one.call_count == 1

        # DB updates: appointment marked completed, patient status updated
        assert mock_appointments.update_one.call_count == 1
        appt_update = mock_appointments.update_one.call_args[0][1]
        assert appt_update["$set"]["status"] == "completed"
        assert "analysis_result" in appt_update["$set"]

        assert mock_patients.update_one.call_count == 1
        patient_update = mock_patients.update_one.call_args[0][1]
        assert patient_update["$set"]["status"] == "Completed"

    @patch(
        "app.routes.patients.analyze_patient_pipeline",
        new_callable=AsyncMock,
        side_effect=RuntimeError("LLM timed out"),
    )
    def test_500_on_pipeline_failure(self, mock_pipeline):
        """ML pipeline failure → 500 with error detail."""
        client, _, _ = _make_client()
        resp = client.post("/api/v1/patients/test")
        assert resp.status_code == 500
        assert "pipeline" in resp.json()["detail"].lower()
