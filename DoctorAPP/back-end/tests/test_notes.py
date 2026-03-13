"""Tests for the Notes CRUD endpoints.

Uses the same _make_client() pattern as test_intake.py — mocks MongoDB
via app.state so no real database is needed.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient


def _make_client(notes_docs=None):
    """Create a fresh TestClient with mocked MongoDB collections."""
    from app.main import app

    mock_notes = MagicMock()

    # find() returns a cursor that can be sorted and iterated
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = notes_docs if notes_docs is not None else []
    mock_cursor.__iter__ = lambda self: iter(
        notes_docs if notes_docs is not None else []
    )
    mock_notes.find.return_value = mock_cursor

    mock_notes.find_one.return_value = None
    mock_notes.insert_one.return_value = MagicMock()
    mock_notes.update_one.return_value = MagicMock()
    mock_notes.delete_one.return_value = MagicMock(deleted_count=1)

    mock_db = MagicMock()
    mock_db.notes = mock_notes

    mock_mongo = MagicMock()
    mock_mongo.__getitem__ = MagicMock(return_value=mock_db)

    app.state.mongo_client = mock_mongo
    app.state.db_name = "diagnostic_test"
    app.state.embedding_model = MagicMock()

    return TestClient(app, raise_server_exceptions=False), mock_notes


PATIENT_ID = "patient-123"


class TestListNotes:
    def test_returns_empty_list(self):
        client, _ = _make_client(notes_docs=[])
        resp = client.get(f"/api/v1/patients/{PATIENT_ID}/notes")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_existing_notes(self):
        note_doc = {
            "id": "note-1",
            "patient_id": PATIENT_ID,
            "appointment_id": None,
            "content": "Test note",
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }
        client, _ = _make_client(notes_docs=[note_doc])
        resp = client.get(f"/api/v1/patients/{PATIENT_ID}/notes")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "note-1"
        assert data[0]["content"] == "Test note"


class TestCreateNote:
    def test_creates_note(self):
        client, mock_coll = _make_client()
        resp = client.post(
            f"/api/v1/patients/{PATIENT_ID}/notes",
            json={"content": "New note content"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["content"] == "New note content"
        assert body["patient_id"] == PATIENT_ID
        assert "id" in body
        assert "created_at" in body
        mock_coll.insert_one.assert_called_once()

    def test_creates_note_with_appointment_id(self):
        client, _ = _make_client()
        resp = client.post(
            f"/api/v1/patients/{PATIENT_ID}/notes",
            json={"content": "Appt note", "appointment_id": "appt-1"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["appointment_id"] == "appt-1"


class TestUpdateNote:
    def test_updates_existing_note(self):
        existing = {
            "id": "note-1",
            "patient_id": PATIENT_ID,
            "appointment_id": None,
            "content": "Old content",
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
        }
        client, mock_coll = _make_client()
        mock_coll.find_one.return_value = existing
        resp = client.put(
            f"/api/v1/patients/{PATIENT_ID}/notes/note-1",
            json={"content": "Updated content"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["content"] == "Updated content"
        mock_coll.update_one.assert_called_once()

    def test_returns_404_for_missing_note(self):
        client, mock_coll = _make_client()
        mock_coll.find_one.return_value = None
        resp = client.put(
            f"/api/v1/patients/{PATIENT_ID}/notes/nonexistent",
            json={"content": "Updated content"},
        )
        assert resp.status_code == 404


class TestDeleteNote:
    def test_deletes_existing_note(self):
        client, mock_coll = _make_client()
        mock_coll.delete_one.return_value = MagicMock(deleted_count=1)
        resp = client.delete(f"/api/v1/patients/{PATIENT_ID}/notes/note-1")
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    def test_returns_404_for_missing_note(self):
        client, mock_coll = _make_client()
        mock_coll.delete_one.return_value = MagicMock(deleted_count=0)
        resp = client.delete(f"/api/v1/patients/{PATIENT_ID}/notes/nonexistent")
        assert resp.status_code == 404
