import json
from io import BytesIO
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.triage import (
    _build_triage_messages,
    _parse_triage_response,
    _strip_fences,
    TriageSymptomCard,
)

client = TestClient(app)


# ── _build_triage_messages ───────────────────────────────────────────────────


def test_build_triage_messages_includes_user_text():
    msgs = _build_triage_messages("I have a headache and feel dizzy")
    assert len(msgs) == 2
    assert msgs[0]["role"] == "system"
    assert msgs[1]["role"] == "user"
    assert "headache and feel dizzy" in msgs[1]["content"]


def test_build_triage_messages_asks_for_json_array():
    msgs = _build_triage_messages("test")
    user_text = msgs[1]["content"]
    assert "JSON array" in user_text
    assert "3" in user_text and "5" in user_text


# ── _parse_triage_response ───────────────────────────────────────────────────


def test_parse_triage_response_returns_cards():
    raw = json.dumps([
        {"label": "Headache", "explanation": "Pain in your head.", "severity": 3},
        {"label": "Dizziness", "explanation": "Feeling unsteady.", "severity": 2},
        {"label": "Nausea", "explanation": "Feeling sick to your stomach.", "severity": 1},
    ])
    cards = _parse_triage_response(raw)
    assert len(cards) == 3
    assert cards[0].label == "Headache"
    assert cards[0].severity == 3
    assert cards[0].id.startswith("triage_")


def test_parse_triage_response_caps_at_five():
    items = [
        {"label": f"Symptom {i}", "explanation": f"Desc {i}", "severity": i}
        for i in range(1, 8)
    ]
    cards = _parse_triage_response(json.dumps(items))
    assert len(cards) == 5


def test_parse_triage_response_clamps_severity():
    raw = json.dumps([
        {"label": "A", "explanation": "a", "severity": 0},
        {"label": "B", "explanation": "b", "severity": 10},
        {"label": "C", "explanation": "c", "severity": 3},
    ])
    cards = _parse_triage_response(raw)
    assert cards[0].severity == 1
    assert cards[1].severity == 5
    assert cards[2].severity == 3


def test_parse_triage_response_rejects_too_few():
    raw = json.dumps([
        {"label": "Only one", "explanation": "not enough", "severity": 2},
    ])
    with pytest.raises(ValueError, match="at least 3"):
        _parse_triage_response(raw)


def test_parse_triage_response_strips_code_fences():
    inner = json.dumps([
        {"label": "A", "explanation": "a", "severity": 1},
        {"label": "B", "explanation": "b", "severity": 2},
        {"label": "C", "explanation": "c", "severity": 3},
    ])
    fenced = f"```json\n{inner}\n```"
    cards = _parse_triage_response(fenced)
    assert len(cards) == 3


# ── Route: POST /triage/extract ──────────────────────────────────────────────


def test_triage_extract_returns_400_when_text_empty():
    resp = client.post("/triage/extract", json={"text": "  "})
    assert resp.status_code == 422


def test_triage_extract_returns_symptoms(monkeypatch):
    fake_response = json.dumps([
        {"label": "Headache", "explanation": "Pain in your head.", "severity": 3},
        {"label": "Dizziness", "explanation": "Feeling unsteady.", "severity": 2},
        {"label": "Fatigue", "explanation": "Feeling very tired.", "severity": 4},
    ])

    monkeypatch.setattr(
        "app.triage.call_medgemma",
        lambda **kwargs: fake_response,
    )

    resp = client.post("/triage/extract", json={"text": "I have a headache and feel dizzy and tired"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["symptoms"]) == 3
    assert data["symptoms"][0]["label"] == "Headache"
    assert data["symptoms"][0]["severity"] == 3


def test_triage_extract_returns_502_on_medgemma_failure(monkeypatch):
    def raise_error(**kwargs):
        raise RuntimeError("SageMaker down")

    monkeypatch.setattr("app.triage.call_medgemma", raise_error)

    resp = client.post("/triage/extract", json={"text": "I feel bad"})
    assert resp.status_code == 502


def test_triage_extract_returns_504_on_timeout(monkeypatch):
    def raise_timeout(**kwargs):
        raise TimeoutError("timed out")

    monkeypatch.setattr("app.triage.call_medgemma", raise_timeout)

    resp = client.post("/triage/extract", json={"text": "I feel bad"})
    assert resp.status_code == 504


def test_triage_extract_returns_500_on_bad_parse(monkeypatch):
    monkeypatch.setattr(
        "app.triage.call_medgemma",
        lambda **kwargs: "this is not valid json at all",
    )

    resp = client.post("/triage/extract", json={"text": "I feel bad"})
    assert resp.status_code == 500
