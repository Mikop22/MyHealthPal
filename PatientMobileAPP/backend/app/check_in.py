import asyncio
import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from openai import APITimeoutError, OpenAIError
from pydantic import ValidationError

from app.check_in_cards import match_symptoms_to_cards
from app.check_in_data import CHECK_IN_CARD_BANK
from app.check_in_schemas import (
    ActionPlanRequest,
    ActionPlanResponse,
    ExtractRequest,
    ExtractResponse,
    StructuredSymptom,
    SymptomCard,
)
from app.llm import call_gpt4o_text


router = APIRouter(prefix="/check-in", tags=["check-in"])


def _known_card_ids() -> set:
    return {card.id for card in CHECK_IN_CARD_BANK}


def _unknown_card_ids(card_ids: List[str]) -> List[str]:
    known_ids = _known_card_ids()
    return sorted({card_id for card_id in card_ids if card_id not in known_ids})


def _serialize_selected_cards(card_ids: List[str]) -> List[dict]:
    selected_ids = set(card_ids)
    return [
        {"id": card.id, "text": card.text}
        for card in CHECK_IN_CARD_BANK
        if card.id in selected_ids
    ]


def _serialize_cards_for_action_plan(
    card_ids: List[str],
    label_map: Optional[dict] = None,
) -> List[dict]:
    """Build list of {id, text} from card bank or label_map (triage flow)."""
    known_ids = _known_card_ids()
    label_map = label_map or {}
    result = []
    for cid in card_ids:
        if cid in known_ids:
            card = next((c for c in CHECK_IN_CARD_BANK if c.id == cid), None)
            if card:
                result.append({"id": card.id, "text": card.text})
        else:
            result.append({"id": cid, "text": label_map.get(cid, f"Symptom ({cid})")})
    return result


def _build_extract_messages(transcript: str) -> List[dict]:
    return [
        {
            "role": "system",
            "content": (
                "Extract a short JSON array of symptoms from the transcript. "
                'Each item must have "symptom" and optional "context". '
                "Return only the JSON array, no markdown or code fences. Example: [{\"symptom\": \"chest tightness\", \"context\": \"when walking\"}]"
            ),
        },
        {
            "role": "user",
            "content": transcript,
        },
    ]


def _build_action_plan_messages(request: ActionPlanRequest) -> List[dict]:
    confirmed_cards = _serialize_cards_for_action_plan(
        request.confirmed_card_ids,
        request.confirmed_symptom_labels,
    )
    rejected_cards = _serialize_cards_for_action_plan(
        request.rejected_card_ids,
        request.rejected_symptom_labels,
    )
    payload = {
        "transcript": request.transcript,
        "confirmed_card_ids": request.confirmed_card_ids,
        "rejected_card_ids": request.rejected_card_ids,
        "confirmed_cards": confirmed_cards,
        "rejected_cards": rejected_cards,
    }
    return [
        {
            "role": "system",
            "content": (
                "Return a JSON object only (no markdown). Keys: summary_bullets (array of 3–5 plain-language bullets), "
                "questions (array of exactly 5 advocacy-focused questions for a doctor). "
                "Use confirmed cards as positive signals and rejected cards as not selected. "
                "Example: {\"summary_bullets\": [\"...\", \"...\", \"...\"], \"questions\": [\"...\", \"...\", \"...\", \"...\", \"...\"]}"
            ),
        },
        {
            "role": "user",
            "content": json.dumps(payload),
        },
    ]


def _strip_json_fences(text: str) -> str:
    """Remove markdown code fences so json.loads works when the LLM wraps output."""
    s = (text or "").strip()
    if s.startswith("```"):
        lines = s.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        s = "\n".join(lines)
    return s.strip()


def _parse_structured_symptoms(text: str) -> ExtractResponse:
    s = _strip_json_fences(text)
    raw = json.loads(s)
    if not isinstance(raw, list):
        raise ValueError("Expected a list of symptoms.")

    symptoms = [StructuredSymptom(**item) for item in raw]
    return ExtractResponse(symptoms=symptoms)


def _parse_action_plan(text: str) -> ActionPlanResponse:
    s = _strip_json_fences(text)
    raw = json.loads(s)
    if not isinstance(raw, dict):
        raise ValueError("Expected a JSON object.")

    bullets = raw.get("summary_bullets") or raw.get("summary") or raw.get("summaryBullets") or []
    questions_list = raw.get("questions") or raw.get("question_list") or raw.get("questions_list") or []
    if not isinstance(bullets, list):
        bullets = [str(bullets)] if bullets else []
    if not isinstance(questions_list, list):
        questions_list = [str(questions_list)] if questions_list else []

    bullets = [str(b) for b in bullets if b][:5]
    if len(bullets) < 3:
        bullets.extend([""] * (3 - len(bullets)))
    questions_list = [str(q) for q in questions_list if q][:5]
    while len(questions_list) < 5:
        questions_list.append("")

    return ActionPlanResponse(summary_bullets=bullets, questions=questions_list)


@router.get("/cards", response_model=List[SymptomCard])
def list_cards():
    return CHECK_IN_CARD_BANK


@router.post("/extract", response_model=ExtractResponse)
async def extract_check_in(request: ExtractRequest) -> ExtractResponse:
    messages = _build_extract_messages(request.transcript)

    try:
        llm_output = await asyncio.to_thread(call_gpt4o_text, messages=messages)
    except APITimeoutError as exc:
        raise HTTPException(status_code=504, detail="Upstream service timed out.") from exc
    except (OpenAIError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Upstream service unavailable.") from exc

    try:
        parsed = _parse_structured_symptoms(llm_output)
    except (TypeError, ValueError, json.JSONDecodeError, ValidationError):
        raise HTTPException(status_code=500, detail="Could not process check-in extraction")

    matched_cards = match_symptoms_to_cards(parsed.symptoms, CHECK_IN_CARD_BANK)
    return ExtractResponse(
        symptoms=parsed.symptoms,
        matched_card_ids=[card.id for card in matched_cards],
    )


@router.post("/action-plan", response_model=ActionPlanResponse)
async def build_action_plan(request: ActionPlanRequest) -> ActionPlanResponse:
    # Allow triage flow: unknown card ids are OK when we have symptom labels or can still build cards
    messages = _build_action_plan_messages(request)

    try:
        llm_output = await asyncio.to_thread(call_gpt4o_text, messages=messages)
    except APITimeoutError as exc:
        raise HTTPException(status_code=504, detail="Upstream service timed out.") from exc
    except (OpenAIError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Upstream service unavailable.") from exc

    try:
        return _parse_action_plan(llm_output)
    except (TypeError, ValueError, json.JSONDecodeError, ValidationError):
        raise HTTPException(status_code=500, detail="Could not process action plan")
