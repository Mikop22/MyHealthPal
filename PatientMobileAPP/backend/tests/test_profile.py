"""Tests for the Profile GET/PUT endpoints.

Uses pytest with FastAPI TestClient and monkeypatch, following
the existing PatientMobileAPP test patterns.
"""

from __future__ import annotations

import json
import os
import tempfile

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def tmp_profile_path(tmp_path, monkeypatch):
    """Create a temporary profile data file and configure the env var."""
    profile_file = tmp_path / "profiles.json"
    monkeypatch.setenv("PROFILE_DATA_PATH", str(profile_file))
    return profile_file


@pytest.fixture()
def client(tmp_profile_path):
    """Create a test client with temporary profile storage."""
    from app.main import app

    return TestClient(app, raise_server_exceptions=False)


PATIENT_ID = "patient-123"


class TestGetProfile:
    def test_returns_defaults_when_no_profile_exists(self, client):
        resp = client.get(f"/profile/{PATIENT_ID}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["age"] is None
        assert data["sex"] is None
        assert data["primary_language"] is None
        assert data["ethnicity"] == []
        assert data["email"] is None

    def test_returns_stored_profile(self, client, tmp_profile_path):
        profile_data = {
            PATIENT_ID: {
                "age": 30,
                "sex": "female",
                "primary_language": "en",
                "ethnicity": ["black_african_american"],
                "email": "test@example.com",
            }
        }
        tmp_profile_path.write_text(json.dumps(profile_data))

        resp = client.get(f"/profile/{PATIENT_ID}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["age"] == 30
        assert data["sex"] == "female"
        assert data["email"] == "test@example.com"


class TestUpdateProfile:
    def test_creates_new_profile(self, client, tmp_profile_path):
        payload = {
            "age": 25,
            "sex": "male",
            "primary_language": "es",
            "ethnicity": ["hispanic_latino"],
            "email": "new@example.com",
        }
        resp = client.put(f"/profile/{PATIENT_ID}", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["age"] == 25
        assert data["sex"] == "male"
        assert data["email"] == "new@example.com"

        # Verify persisted to file
        stored = json.loads(tmp_profile_path.read_text())
        assert PATIENT_ID in stored
        assert stored[PATIENT_ID]["age"] == 25

    def test_updates_existing_profile(self, client, tmp_profile_path):
        # First create a profile
        initial = {
            "age": 25,
            "sex": "male",
            "primary_language": "es",
            "ethnicity": [],
            "email": "old@example.com",
        }
        client.put(f"/profile/{PATIENT_ID}", json=initial)

        # Now update it
        updated = {
            "age": 26,
            "sex": "male",
            "primary_language": "en",
            "ethnicity": ["white"],
            "email": "new@example.com",
        }
        resp = client.put(f"/profile/{PATIENT_ID}", json=updated)
        assert resp.status_code == 200
        data = resp.json()
        assert data["age"] == 26
        assert data["email"] == "new@example.com"

    def test_partial_update_with_null_fields(self, client):
        payload = {
            "age": None,
            "sex": None,
            "primary_language": None,
            "ethnicity": [],
            "email": None,
        }
        resp = client.put(f"/profile/{PATIENT_ID}", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["age"] is None
