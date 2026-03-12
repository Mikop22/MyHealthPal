"""Tests for the Apple Health webhook and intake status routes.

POST /api/v1/webhook/apple-health/{token}
GET  /api/v1/intake/{token}/status

Uses unittest.mock to stub MongoDB so the routes can be exercised
without external dependencies — consistent with the existing test patterns
in test_intake.py and test_dashboard.py.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient


TOKEN = "rHb9CJAWyB4rj91VRWnTestToken"

BIOMETRIC_PAYLOAD = {
    "heartRate": [{"date": "2026-02-18", "value": 78, "unit": "bpm"}],
    "steps": [{"date": "2026-02-18", "value": 1200, "unit": "count"}],
}


# ---------------------------------------------------------------------------
# Test-client factory (mirrors existing pattern from test_intake.py)
# ---------------------------------------------------------------------------

def _make_client(appointment_doc=None):
    """Create a fresh TestClient with a mocked MongoDB collection."""
    from app.main import app

    mock_collection = MagicMock()
    mock_collection.find_one.return_value = appointment_doc
    mock_collection.update_one.return_value = MagicMock()

    mock_db = MagicMock()
    mock_db.appointments = mock_collection

    mock_mongo = MagicMock()
    mock_mongo.__getitem__ = MagicMock(return_value=mock_db)

    app.state.mongo_client = mock_mongo
    app.state.db_name = "diagnostic_test"
    app.state.embedding_model = MagicMock()

    return TestClient(app, raise_server_exceptions=False), mock_collection


# ---------------------------------------------------------------------------
# POST /api/v1/webhook/apple-health/{token}
# ---------------------------------------------------------------------------

class TestAppleHealthWebhook:
    """Tests for the webhook that catches Apple Health payloads."""

    def test_404_when_token_not_found(self):
        """Unknown token → 404."""
        client, _ = _make_client(appointment_doc=None)
        resp = client.post(
            f"/api/v1/webhook/apple-health/{TOKEN}",
            json=BIOMETRIC_PAYLOAD,
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_success_receives_payload(self):
        """Valid token → 200, biometrics persisted with $set."""
        client, mock_coll = _make_client(
            appointment_doc={"form_token": TOKEN, "status": "scheduled"},
        )
        resp = client.post(
            f"/api/v1/webhook/apple-health/{TOKEN}",
            json=BIOMETRIC_PAYLOAD,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "received"
        assert body["token"] == TOKEN

        # Verify MongoDB was updated with biometrics + flag
        mock_coll.update_one.assert_called_once()
        update_args = mock_coll.update_one.call_args
        set_dict = update_args[0][1]["$set"]
        assert set_dict["biometrics"] == BIOMETRIC_PAYLOAD
        assert set_dict["biometrics_received"] is True


# ---------------------------------------------------------------------------
# GET /api/v1/intake/{token}/status
# ---------------------------------------------------------------------------

class TestIntakeStatus:
    """Tests for the lightweight polling endpoint."""

    def test_404_when_token_not_found(self):
        """Unknown token → 404."""
        client, _ = _make_client(appointment_doc=None)
        resp = client.get(f"/api/v1/intake/{TOKEN}/status")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_returns_false_before_webhook(self):
        """Appointment exists but no biometrics yet → false."""
        client, _ = _make_client(
            appointment_doc={"form_token": TOKEN, "status": "scheduled"},
        )
        resp = client.get(f"/api/v1/intake/{TOKEN}/status")
        assert resp.status_code == 200
        assert resp.json()["biometrics_received"] is False

    def test_returns_true_after_webhook(self):
        """Appointment with biometrics_received flag → true."""
        client, _ = _make_client(
            appointment_doc={
                "form_token": TOKEN,
                "status": "scheduled",
                "biometrics_received": True,
            },
        )
        resp = client.get(f"/api/v1/intake/{TOKEN}/status")
        assert resp.status_code == 200
        assert resp.json()["biometrics_received"] is True
