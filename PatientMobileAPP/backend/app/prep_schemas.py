"""Pydantic request/response models for the appointment-prep integration.

These schemas mirror the contracts defined by the DoctorAPP mobile-prep
endpoints so the PatientMobileAPP backend can validate payloads locally
before forwarding them upstream.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sub-models (match DoctorAPP prep_episode.py contracts)
# ---------------------------------------------------------------------------

class ExtractedSymptom(BaseModel):
    id: str
    label: str
    severity: Optional[int] = None


class CheckinPayload(BaseModel):
    raw_text: str
    extracted_symptoms: List[ExtractedSymptom] = Field(default_factory=list)
    confirmed_symptoms: List[str] = Field(default_factory=list)
    dismissed_symptoms: List[str] = Field(default_factory=list)


class DocumentItem(BaseModel):
    document_id: str
    title: str = ""
    summary_bullets: List[str] = Field(default_factory=list)
    patient_note: str = ""
    shared: bool = True


class DocumentsPayload(BaseModel):
    documents: List[DocumentItem] = Field(default_factory=list)


class HealthDataPayload(BaseModel):
    source: str = "unknown"
    sync_timestamp: Optional[str] = None
    metrics: dict = Field(default_factory=dict)
    shared: bool = True


# ---------------------------------------------------------------------------
# Responses forwarded from DoctorAPP
# ---------------------------------------------------------------------------

class InviteResolutionResponse(BaseModel):
    prep_episode_id: str
    patient_id: str
    appointment_id: str
    status: str
    patient_first_name: str
    appointment: dict
    can_resume: bool
    has_submitted: bool


class StartPrepResponse(BaseModel):
    prep_episode_id: str
    status: str
    checkin_payload: Optional[CheckinPayload] = None


class SaveResponse(BaseModel):
    prep_episode_id: str
    status: str
    message: str


class SubmitResponse(BaseModel):
    status: str
    summary_ready: bool
    prep_episode_id: str


class SummaryResponse(BaseModel):
    status: str
    summary: List[str]
    questions_to_ask: List[str]


class PrepStatusResponse(BaseModel):
    prep_episode_id: str
    status: str
    doctor_facing_label: str
    can_resume: bool
    has_submitted: bool
