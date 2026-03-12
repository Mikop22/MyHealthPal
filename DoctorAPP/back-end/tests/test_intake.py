"""Tests for the POST /api/v1/intake/{token}/submit orchestrator route.

Uses unittest.mock to stub out MongoDB, the ML pipeline, and the XRP
payout so the route logic can be exercised without external dependencies.
"""

from __future__ import annotations

import asyncio
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

# ---------------------------------------------------------------------------
# Minimal test payload (only required fields, values don't need clinical sense)
# ---------------------------------------------------------------------------
METRIC = {"date": "2026-02-15", "value": 1.0, "unit": "bpm"}
LONG = {"week_start": "2025-08-24", "value": 1.0, "unit": "bpm"}

PAYLOAD = {
    "patient_id": "pt_test",
    "sync_timestamp": "2026-02-21T12:00:00Z",
    "hardware_source": "Test Watch",
    "patient_narrative": "Test narrative.",
    "data": {
        "acute_7_day": {
            "granularity": "daily_summary",
            "metrics": {
                "heartRateVariabilitySDNN": [METRIC] * 7,
                "restingHeartRate": [METRIC] * 7,
                "appleSleepingWristTemperature": [METRIC] * 7,
                "respiratoryRate": [METRIC] * 7,
                "walkingAsymmetryPercentage": [METRIC] * 7,
                "stepCount": [METRIC] * 7,
                "sleepAnalysis_awakeSegments": [METRIC] * 7,
            },
        },
        "longitudinal_6_month": {
            "granularity": "weekly_average",
            "metrics": {
                "restingHeartRate": [LONG] * 26,
                "walkingAsymmetryPercentage": [LONG] * 26,
            },
        },
    },
    "risk_profile": {"factors": []},
}

# Stub analysis response returned by the mocked pipeline
STUB_ANALYSIS = AnalysisResponse(
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
)

TOKEN = "rHb9CJAWyB4rj91VRWnTestToken"


# ---------------------------------------------------------------------------
# Build a TestClient with a mocked MongoDB + embedding model on app.state
# ---------------------------------------------------------------------------

def _make_client(appointment_doc=None):
    """Create a fresh TestClient with a mocked MongoDB collection.

    Args:
        appointment_doc: The document that find_one will return, or None for 404.
    """
    # Import app *inside* the function so we don't trigger lifespan
    from app.main import app

    # Prepare a mock collection
    mock_collection = MagicMock()
    mock_collection.find_one.return_value = appointment_doc
    mock_collection.update_one.return_value = MagicMock()

    # Prepare mock db that returns the collection via attribute access
    mock_db = MagicMock()
    mock_db.appointments = mock_collection

    # Prepare mock mongo_client so client[db_name] → mock_db
    mock_mongo = MagicMock()
    mock_mongo.__getitem__ = MagicMock(return_value=mock_db)

    # Attach to app.state (bypass the lifespan which needs real connections)
    app.state.mongo_client = mock_mongo
    app.state.db_name = "diagnostic_test"
    app.state.embedding_model = MagicMock()

    return TestClient(app, raise_server_exceptions=False), mock_collection


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestIntakeRoute:
    """Tests for POST /api/v1/intake/{token}/submit."""

    def test_404_when_appointment_not_found(self):
        """Token with no matching appointment → 404."""
        client, _ = _make_client(appointment_doc=None)
        resp = client.post(f"/api/v1/intake/{TOKEN}/submit", json=PAYLOAD)
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_400_when_already_completed(self):
        """Appointment already completed → 400 (double-submission guard)."""
        client, _ = _make_client(
            appointment_doc={"form_token": TOKEN, "status": "completed"}
        )
        resp = client.post(f"/api/v1/intake/{TOKEN}/submit", json=PAYLOAD)
        assert resp.status_code == 400
        assert "already" in resp.json()["detail"].lower()

    @patch(
        "app.routes.intake.analyze_patient_pipeline",
        new_callable=AsyncMock,
        return_value=STUB_ANALYSIS,
    )
    @patch(
        "app.routes.intake.process_research_payout",
        new_callable=AsyncMock,
    )
    def test_success_path(self, mock_payout, mock_pipeline):
        """Happy path — valid token, scheduled appointment → 200 + success JSON."""
        client, mock_coll = _make_client(
            appointment_doc={"form_token": TOKEN, "status": "scheduled"}
        )
        resp = client.post(f"/api/v1/intake/{TOKEN}/submit", json=PAYLOAD)
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert "payout" in body["message"].lower()

        # Verify DB was updated to 'completed'
        mock_coll.update_one.assert_called_once()
        update_args = mock_coll.update_one.call_args
        assert update_args[0][1]["$set"]["status"] == "completed"

    @patch(
        "app.routes.intake.analyze_patient_pipeline",
        new_callable=AsyncMock,
        side_effect=TimeoutError("LLM timed out"),
    )
    def test_500_on_pipeline_failure(self, mock_pipeline):
        """ML pipeline failure → 500 with clean error message."""
        client, _ = _make_client(
            appointment_doc={"form_token": TOKEN, "status": "scheduled"}
        )
        resp = client.post(f"/api/v1/intake/{TOKEN}/submit", json=PAYLOAD)
        assert resp.status_code == 500
        assert "pipeline" in resp.json()["detail"].lower()
