"""Patient-safe summary generator.

Produces a neutral, non-alarming summary of what the patient reported, plus
suggested questions to ask the clinician.  This output is shown ONLY to the
patient — it must **never** include:
  - diagnosis ranking or condition-match probabilities
  - alarming clinical phrasing
  - severity assessments

The first iteration uses a simple template approach, which is deterministic,
fast, and does not require an LLM call.  A future iteration may replace or
supplement this with an LLM-generated summary using a strict patient-safe
prompt.
"""

from __future__ import annotations

from typing import List, Optional

from app.models.prep_episode import CheckinPayload, DocumentItem, HealthDataPayload


def generate_patient_safe_summary(
    checkin: Optional[CheckinPayload] = None,
    documents: Optional[List[DocumentItem]] = None,
    health_data: Optional[HealthDataPayload] = None,
) -> dict:
    """Return ``{"summary": [...], "questions_to_ask": [...]}``.

    All outputs are neutral sentences safe for patient consumption.
    """
    summary_lines: List[str] = []
    questions: List[str] = []

    # ------------------------------------------------------------------
    # Summarise check-in data
    # ------------------------------------------------------------------
    if checkin and checkin.raw_text:
        summary_lines.append(
            "You shared a description of your current health concerns with your care team."
        )

        confirmed = checkin.confirmed_symptoms
        if confirmed:
            count = len(confirmed)
            word = "symptom" if count == 1 else "symptoms"
            summary_lines.append(
                f"You confirmed {count} {word} for your clinician to review."
            )

    # ------------------------------------------------------------------
    # Summarise documents
    # ------------------------------------------------------------------
    if documents:
        shared = [d for d in documents if d.shared]
        if shared:
            count = len(shared)
            word = "document" if count == 1 else "documents"
            summary_lines.append(
                f"You shared {count} {word} for your care team to review."
            )

    # ------------------------------------------------------------------
    # Summarise health data
    # ------------------------------------------------------------------
    if health_data and health_data.shared:
        source_label = health_data.source.replace("_", " ").title()
        summary_lines.append(
            f"Health data from {source_label} was included for this visit."
        )

    # ------------------------------------------------------------------
    # Fallback if nothing was provided
    # ------------------------------------------------------------------
    if not summary_lines:
        summary_lines.append(
            "Your visit preparation has been received by your care team."
        )

    # ------------------------------------------------------------------
    # Default questions to ask
    # ------------------------------------------------------------------
    questions = [
        "What possibilities should we consider based on what I've shared?",
        "Are there any tests or next steps that could help?",
        "What signs should prompt me to seek urgent care?",
    ]

    return {"summary": summary_lines, "questions_to_ask": questions}
