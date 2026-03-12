"""Tests for GET /api/v1/patients/{patient_id}/dashboard read endpoint.

Verifies that the dashboard route returns pre-computed analysis results
from MongoDB without triggering any ML processing.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.models.patient import (
    AnalysisResponse,
    BiometricDelta,
    ClinicalBrief,
    ConditionMatch,
    RiskProfile,
)


# Stub analysis result as stored in the appointment document
STUB_ANALYSIS_DICT = AnalysisResponse(
    patient_id="pt_test",
    clinical_brief=ClinicalBrief(
        summary="stub",
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
).model_dump()

PATIENT_ID = "pt_dashboard_test"


def _make_client(appointment_doc=None):
    """Create a TestClient with a mocked MongoDB that returns the given doc."""
    from app.main import app

    mock_collection = MagicMock()
    mock_collection.find_one.return_value = appointment_doc

    mock_db = MagicMock()
    mock_db.appointments = mock_collection

    mock_mongo = MagicMock()
    mock_mongo.__getitem__ = MagicMock(return_value=mock_db)

    app.state.mongo_client = mock_mongo
    app.state.db_name = "diagnostic_test"
    app.state.embedding_model = MagicMock()

    return TestClient(app, raise_server_exceptions=False), mock_collection


class TestDashboardRoute:
    """Tests for GET /api/v1/patients/{patient_id}/dashboard."""

    def test_returns_precomputed_analysis(self):
        """Completed appointment with analysis_result → 200 with data."""
        client, mock_coll = _make_client(
            appointment_doc={
                "patient_id": PATIENT_ID,
                "status": "completed",
                "analysis_result": STUB_ANALYSIS_DICT,
            }
        )
        resp = client.get(f"/api/v1/patients/{PATIENT_ID}/dashboard")
        assert resp.status_code == 200
        body = resp.json()
        assert body["patient_id"] == "pt_test"
        assert body["clinical_brief"]["summary"] == "stub"
        assert len(body["biometric_deltas"]) == 1
        assert len(body["condition_matches"]) == 1

    def test_404_when_no_completed_appointment(self):
        """No completed appointment for patient → 404."""
        client, _ = _make_client(appointment_doc=None)
        resp = client.get(f"/api/v1/patients/{PATIENT_ID}/dashboard")
        assert resp.status_code == 404
        assert "no completed analysis" in resp.json()["detail"].lower()

    def test_404_when_analysis_result_missing(self):
        """Completed appointment but no analysis_result field → 404."""
        client, _ = _make_client(
            appointment_doc={
                "patient_id": PATIENT_ID,
                "status": "completed",
            }
        )
        resp = client.get(f"/api/v1/patients/{PATIENT_ID}/dashboard")
        assert resp.status_code == 404
        assert "missing" in resp.json()["detail"].lower()
