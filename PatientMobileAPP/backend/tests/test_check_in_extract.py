from fastapi.testclient import TestClient

import app.check_in as check_in_module
from app.main import app


client = TestClient(app)


def test_extract_returns_structured_symptoms(monkeypatch):
    monkeypatch.setattr(
        check_in_module,
        "call_gpt4o_text",
        lambda *args, **kwargs: (
            '[{"symptom": "chest tightness", "context": "when walking"}, '
            '{"symptom": "dizziness", "context": "after meals"}]'
        ),
    )

    response = client.post(
        "/check-in/extract",
        json={"transcript": "I have chest tightness when I walk and dizziness after meals."},
    )

    assert response.status_code == 200
    assert response.json()["symptoms"] == [
        {"symptom": "chest tightness", "context": "when walking"},
        {"symptom": "dizziness", "context": "after meals"},
    ]
    assert response.json()["matched_card_ids"][:2] == ["chest-tight", "dizzy-meals"]


def test_check_in_cards_returns_backend_card_bank():
    response = client.get("/check-in/cards")

    assert response.status_code == 200
    body = response.json()
    assert body
    assert body[0]["id"] == "chest-tight"
    assert "tags" in body[0]


def test_extract_returns_500_when_llm_output_cannot_be_parsed(monkeypatch):
    monkeypatch.setattr(check_in_module, "call_gpt4o_text", lambda *args, **kwargs: "not json")

    response = client.post(
        "/check-in/extract",
        json={"transcript": "I feel off and tired."},
    )

    assert response.status_code == 500
    assert response.json() == {"detail": "Could not process check-in extraction"}


def test_extract_returns_422_for_empty_transcript():
    response = client.post(
        "/check-in/extract",
        json={"transcript": "   "},
    )

    assert response.status_code == 422
