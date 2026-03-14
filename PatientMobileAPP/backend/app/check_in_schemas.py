from typing import Dict, List, Optional

from pydantic import BaseModel, Field, constr, model_validator


TranscriptStr = constr(strip_whitespace=True, min_length=1)
CardIdStr = constr(strip_whitespace=True, min_length=1)


class SymptomCard(BaseModel):
    id: str
    text: str
    subtitle: Optional[str] = None
    tags: List[str]


class StructuredSymptom(BaseModel):
    symptom: str
    context: Optional[str] = None


class ExtractRequest(BaseModel):
    transcript: TranscriptStr


class ExtractResponse(BaseModel):
    symptoms: List[StructuredSymptom]
    matched_card_ids: List[str] = Field(default_factory=list)


class ActionPlanRequest(BaseModel):
    transcript: TranscriptStr
    confirmed_card_ids: List[CardIdStr]
    rejected_card_ids: List[CardIdStr]
    # Optional labels for triage flow (id -> label) when card IDs are not from CHECK_IN_CARD_BANK
    confirmed_symptom_labels: Optional[Dict[str, str]] = None
    rejected_symptom_labels: Optional[Dict[str, str]] = None

    @model_validator(mode="after")
    def validate_card_selections(self):
        overlap = set(self.confirmed_card_ids) & set(self.rejected_card_ids)
        if overlap:
            raise ValueError("confirmed_card_ids and rejected_card_ids must not overlap.")
        return self


class ActionPlanResponse(BaseModel):
    summary_bullets: List[str]
    questions: List[str]
