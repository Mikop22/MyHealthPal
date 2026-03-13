"""Pydantic models for the PrepEpisode domain — the shared concept that links
a mobile patient intake to a DoctorAPP appointment.

A PrepEpisode tracks the full lifecycle of a patient's pre-visit preparation:
invite → open → start → in-progress → submitted → analysis_running →
ready_for_review → reviewed.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Prep status lifecycle
# ---------------------------------------------------------------------------

class PrepStatus(str, Enum):
    draft = "draft"
    invite_sent = "invite_sent"
    invite_opened = "invite_opened"
    started = "started"
    in_progress = "in_progress"
    submitted = "submitted"
    analysis_running = "analysis_running"
    ready_for_review = "ready_for_review"
    reviewed = "reviewed"
    fallback_web_used = "fallback_web_used"


# Doctor-facing simplified labels for each internal status
DOCTOR_FACING_LABELS = {
    PrepStatus.draft: "Not started",
    PrepStatus.invite_sent: "Not started",
    PrepStatus.invite_opened: "Not started",
    PrepStatus.started: "In progress",
    PrepStatus.in_progress: "In progress",
    PrepStatus.submitted: "Submitted",
    PrepStatus.analysis_running: "Submitted",
    PrepStatus.ready_for_review: "Ready for review",
    PrepStatus.reviewed: "Reviewed",
    PrepStatus.fallback_web_used: "In progress",
}


# ---------------------------------------------------------------------------
# Data provenance
# ---------------------------------------------------------------------------

class Provenance(str, Enum):
    patient_entered = "patient_entered"
    patient_confirmed = "patient_confirmed"
    device_imported = "device_imported"
    ai_generated = "ai_generated"


# ---------------------------------------------------------------------------
# Sub-models for prep data
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
# PrepEpisode — the main model
# ---------------------------------------------------------------------------

class PrepEpisode(BaseModel):
    id: str
    patient_id: str
    appointment_id: str
    invite_token: str

    status: PrepStatus = PrepStatus.draft
    source: str = "mobile"  # "mobile" | "web_fallback"

    invite_sent_at: Optional[str] = None
    invite_expires_at: Optional[str] = None
    invite_opened_at: Optional[str] = None
    started_at: Optional[str] = None
    submitted_at: Optional[str] = None
    reviewed_at: Optional[str] = None

    checkin_payload: Optional[CheckinPayload] = None
    documents: List[DocumentItem] = Field(default_factory=list)
    health_data_payload: Optional[HealthDataPayload] = None

    patient_safe_summary: Optional[List[str]] = None
    questions_to_ask: Optional[List[str]] = None
    analysis_response: Optional[dict] = None

    created_at: str = ""
    updated_at: str = ""


# ---------------------------------------------------------------------------
# API request / response schemas
# ---------------------------------------------------------------------------

class InviteResolutionResponse(BaseModel):
    """Returned when a mobile client resolves an invite token."""
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
