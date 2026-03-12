import asyncio
import json
import logging
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, constr

from app.medgemma import call_medgemma

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/triage", tags=["triage"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class TriageExtractRequest(BaseModel):
    text: constr(strip_whitespace=True, min_length=1)


class TriageSymptomCard(BaseModel):
    id: str
    label: str
    explanation: str
    severity: int


class TriageExtractResponse(BaseModel):
    symptoms: List[TriageSymptomCard]


# ── Prompt ───────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are a symptom-extraction assistant for a health-literacy app. "
    "You read a patient's plain-language description and identify the distinct "
    "symptoms mentioned. You do NOT diagnose or give medical advice. "
    "You explain each symptom in simple, everyday words so the patient "
    "can confirm or dismiss it."
)


def _build_triage_messages(text: str) -> list:
    user_prompt = (
        "A patient described how they feel:\n\n"
        f'"{text}"\n\n'
        "Extract between 3 and 5 distinct symptoms from this description.\n"
        "For each symptom, provide:\n"
        '- "label": a short, plain-language name (e.g. "Recurring headache")\n'
        '- "explanation": one sentence explaining what this symptom means '
        "in everyday words, so the patient can confirm whether it matches\n"
        '- "severity": a number from 1 (mild) to 5 (severe), based on how '
        "the patient described it\n\n"
        "Return ONLY a JSON array with 3–5 objects. No markdown, no extra text.\n"
        "Example:\n"
        '[{"label": "Recurring headache", "explanation": "A headache that keeps coming back over several days.", "severity": 3}]'
    )
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


# ── Parsing ──────────────────────────────────────────────────────────────────

def _strip_fences(text: str) -> str:
    s = (text or "").strip()
    if s.startswith("```"):
        lines = s.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        s = "\n".join(lines)
    return s.strip()


def _parse_triage_response(raw: str) -> List[TriageSymptomCard]:
    cleaned = _strip_fences(raw)
    data = json.loads(cleaned)
    if not isinstance(data, list):
        raise ValueError("Expected a JSON array of symptoms.")

    cards = []
    for i, item in enumerate(data[:5]):
        severity = item.get("severity", 3)
        if not isinstance(severity, int) or severity < 1:
            severity = 1
        elif severity > 5:
            severity = 5

        cards.append(TriageSymptomCard(
            id=f"triage_{uuid4().hex[:8]}",
            label=str(item.get("label", "")).strip() or f"Symptom {i + 1}",
            explanation=str(item.get("explanation", "")).strip(),
            severity=severity,
        ))

    if len(cards) < 3:
        raise ValueError(f"Expected at least 3 symptoms, got {len(cards)}.")

    return cards


# ── Route ────────────────────────────────────────────────────────────────────

@router.post("/extract", response_model=TriageExtractResponse)
async def triage_extract(request: TriageExtractRequest) -> TriageExtractResponse:
    messages = _build_triage_messages(request.text)

    try:
        llm_output = await asyncio.to_thread(
            call_medgemma,
            messages=messages,
            image_b64="",
            image_media_type="",
        )
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Upstream service timed out.")
    except (RuntimeError, ValueError) as exc:
        logger.warning("MedGemma triage call failed: %s", exc)
        raise HTTPException(status_code=502, detail="Upstream service unavailable.")

    try:
        cards = _parse_triage_response(llm_output)
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        snippet = (llm_output or "")[:500].replace("\n", " ")
        logger.warning("Triage parse failed: %s — snippet: %s", exc, snippet)
        raise HTTPException(status_code=500, detail="Could not extract symptoms from your description.")

    return TriageExtractResponse(symptoms=cards)
