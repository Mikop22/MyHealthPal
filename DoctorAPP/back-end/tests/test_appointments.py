"""Tests for the date-filtered appointments list endpoint.

Uses the same _make_client() pattern as test_intake.py — mocks MongoDB
via app.state so no real database is needed.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient


def _make_client(appointment_docs=None):
    """Create a fresh TestClient with mocked MongoDB collections."""
    from app.main import app

    mock_appointments = MagicMock()

    # find() returns a cursor that can be sorted and iterated
    mock_cursor = MagicMock()
    docs = appointment_docs if appointment_docs is not None else []
    mock_cursor.sort.return_value = docs
    mock_cursor.__iter__ = lambda self: iter(docs)
    mock_appointments.find.return_value = mock_cursor

    mock_patients = MagicMock()
    mock_prep = MagicMock()

    mock_db = MagicMock()
    mock_db.appointments = mock_appointments
    mock_db.patients = mock_patients
    mock_db.prep_episodes = mock_prep

    mock_mongo = MagicMock()
    mock_mongo.__getitem__ = MagicMock(return_value=mock_db)

    app.state.mongo_client = mock_mongo
    app.state.db_name = "diagnostic_test"
    app.state.embedding_model = MagicMock()

    return TestClient(app, raise_server_exceptions=False), mock_appointments


APPT_DOC = {
    "id": "appt-1",
    "patient_id": "patient-1",
    "date": "2026-03-13",
    "time": "10:00 AM",
    "status": "scheduled",
    "form_token": "tok-1",
    "created_at": "2026-03-10T00:00:00+00:00",
}


class TestListAppointmentsByDate:
    def test_returns_empty_list(self):
        client, _ = _make_client(appointment_docs=[])
        resp = client.get("/api/v1/appointments?date=2026-03-13")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_appointments_for_date(self):
        client, mock_coll = _make_client(appointment_docs=[APPT_DOC])
        resp = client.get("/api/v1/appointments?date=2026-03-13")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "appt-1"
        assert data[0]["date"] == "2026-03-13"

        # Verify the correct MongoDB query was made
        call_args = mock_coll.find.call_args
        assert call_args[0][0] == {"date": "2026-03-13"}

    def test_returns_all_without_date_filter(self):
        client, mock_coll = _make_client(appointment_docs=[APPT_DOC])
        resp = client.get("/api/v1/appointments")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

        # Verify empty query (no date filter)
        call_args = mock_coll.find.call_args
        assert call_args[0][0] == {}

    def test_returns_multiple_appointments(self):
        appt2 = {**APPT_DOC, "id": "appt-2", "time": "2:00 PM"}
        client, _ = _make_client(appointment_docs=[APPT_DOC, appt2])
        resp = client.get("/api/v1/appointments?date=2026-03-13")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
