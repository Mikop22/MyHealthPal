import json

from fastapi.testclient import TestClient

import app.check_in as check_in_module
from app.main import app


client = TestClient(app)


def test_action_plan_returns_summary_bullets_and_questions(monkeypatch):
    monkeypatch.setattr(
        check_in_module,
        "call_gpt4o_text",
        lambda *args, **kwargs: (
            '{'
            '"summary_bullets": ["Chest tightness happens with activity", "Dizziness happens after meals", "Symptoms have been noticeable enough to mention today"], '
            '"questions": ["What could be causing this?", "What should I track next?", '
            '"When should I come back?", "Are there tests I should ask about?", '
            '"What changes should I watch for?"]'
            "}"
        ),
    )

    response = client.post(
        "/check-in/action-plan",
        json={
            "transcript": "I have chest tightness when I walk and dizziness after meals.",
            "confirmed_card_ids": ["chest-tight", "dizzy-meals"],
            "rejected_card_ids": ["headache"],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "summary_bullets": [
            "Chest tightness happens with activity",
            "Dizziness happens after meals",
            "Symptoms have been noticeable enough to mention today",
        ],
        "questions": [
            "What could be causing this?",
            "What should I track next?",
            "When should I come back?",
            "Are there tests I should ask about?",
            "What changes should I watch for?",
        ],
    }


def test_action_plan_uses_confirmed_and_rejected_cards_without_recomputing_matches(monkeypatch):
    captured = {}

    def fake_llm(*args, **kwargs):
        captured["messages"] = kwargs["messages"]
        return (
            '{'
            '"summary_bullets": ["Bullet 1", "Bullet 2", "Bullet 3"], '
            '"questions": ["Q1?", "Q2?", "Q3?", "Q4?", "Q5?"]'
            "}"
        )

    monkeypatch.setattr(check_in_module, "call_gpt4o_text", fake_llm)

    response = client.post(
        "/check-in/action-plan",
        json={
            "transcript": "I mentioned a headache, but the user confirmed chest tightness instead.",
            "confirmed_card_ids": ["chest-tight"],
            "rejected_card_ids": ["headache"],
        },
    )

    assert response.status_code == 200

    payload = json.loads(captured["messages"][1]["content"])
    assert payload["confirmed_card_ids"] == ["chest-tight"]
    assert payload["rejected_card_ids"] == ["headache"]
    assert payload["confirmed_cards"] == [
        {
            "id": "chest-tight",
            "text": "Chest feels tight when I walk or climb stairs",
        }
    ]
    assert payload["rejected_cards"] == [
        {
            "id": "headache",
            "text": "I have a headache that keeps coming back",
        }
    ]
    assert "matched_card_ids" not in payload


def test_action_plan_returns_500_when_llm_output_cannot_be_parsed(monkeypatch):
    monkeypatch.setattr(check_in_module, "call_gpt4o_text", lambda *args, **kwargs: "[]")

    response = client.post(
        "/check-in/action-plan",
        json={
            "transcript": "I have stomach pain.",
            "confirmed_card_ids": ["stomach-meals"],
            "rejected_card_ids": [],
        },
    )

    assert response.status_code == 500
    assert response.json() == {"detail": "Could not process action plan"}


def test_action_plan_returns_500_when_summary_bullet_count_is_out_of_contract(monkeypatch):
    monkeypatch.setattr(
        check_in_module,
        "call_gpt4o_text",
        lambda *args, **kwargs: (
            '{'
            '"summary_bullets": ["Only one bullet"], '
            '"questions": ["Q1?", "Q2?", "Q3?", "Q4?", "Q5?"]'
            "}"
        ),
    )

    response = client.post(
        "/check-in/action-plan",
        json={
            "transcript": "I have stomach pain.",
            "confirmed_card_ids": ["stomach-meals"],
            "rejected_card_ids": [],
        },
    )

    assert response.status_code == 500
    assert response.json() == {"detail": "Could not process action plan"}


def test_action_plan_returns_422_for_empty_transcript():
    response = client.post(
        "/check-in/action-plan",
        json={
            "transcript": "   ",
            "confirmed_card_ids": ["stomach-meals"],
            "rejected_card_ids": [],
        },
    )

    assert response.status_code == 422


def test_action_plan_returns_422_for_overlapping_confirmed_and_rejected_ids():
    response = client.post(
        "/check-in/action-plan",
        json={
            "transcript": "I have stomach pain.",
            "confirmed_card_ids": ["stomach-meals", "headache"],
            "rejected_card_ids": ["headache"],
        },
    )

    assert response.status_code == 422


def test_action_plan_returns_400_for_unknown_card_ids():
    response = client.post(
        "/check-in/action-plan",
        json={
            "transcript": "I have stomach pain.",
            "confirmed_card_ids": ["not-a-real-card"],
            "rejected_card_ids": [],
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Unknown card ids: not-a-real-card"}


def test_action_plan_returns_500_when_question_count_is_out_of_contract(monkeypatch):
    monkeypatch.setattr(
        check_in_module,
        "call_gpt4o_text",
        lambda *args, **kwargs: (
            '{'
            '"summary_bullets": ["Bullet 1", "Bullet 2", "Bullet 3"], '
            '"questions": ["Q1?", "Q2?", "Q3?", "Q4?"]'
            "}"
        ),
    )

    response = client.post(
        "/check-in/action-plan",
        json={
            "transcript": "I have stomach pain.",
            "confirmed_card_ids": ["stomach-meals"],
            "rejected_card_ids": [],
        },
    )

    assert response.status_code == 500
    assert response.json() == {"detail": "Could not process action plan"}
