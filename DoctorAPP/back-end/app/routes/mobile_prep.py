"""Mobile-prep API routes — endpoints called by the PatientMobileAPP.

All endpoints are scoped under ``/api/v1/mobile-prep`` and use an
invite token to identify the prep episode.  The token is generated
when a clinician schedules an appointment in DoctorAPP.

Endpoints
---------
GET  /invite/{token}          — resolve invite, return appointment context
POST /{token}/start           — mark prep as started, return draft if any
POST /{token}/save-checkin    — save symptom narrative + cards
POST /{token}/save-documents  — save scanned/uploaded documents
POST /{token}/save-health-data — save wearable / vitals payload
POST /{token}/submit          — finalise & trigger analysis pipeline
GET  /{token}/summary         — retrieve patient-safe summary
GET  /{token}/status          — lightweight status polling
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.models.prep_episode import (
    CheckinPayload,
    DOCTOR_FACING_LABELS,
    DocumentItem,
    DocumentsPayload,
    HealthDataPayload,
    InviteResolutionResponse,
    PrepEpisode,
    PrepStatus,
    PrepStatusResponse,
    SaveResponse,
    StartPrepResponse,
    SubmitResponse,
    SummaryResponse,
)
from app.services.patient_safe_summary import generate_patient_safe_summary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/mobile-prep", tags=["mobile-prep"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_db(request: Request):
    return request.app.state.mongo_client[request.app.state.db_name]


def _find_prep_by_token(db, token: str) -> Optional[dict]:
    return db.prep_episodes.find_one({"invite_token": token}, {"_id": 0})


def _find_appointment(db, appointment_id: str) -> Optional[dict]:
    return db.appointments.find_one({"id": appointment_id}, {"_id": 0})


def _find_patient(db, patient_id: str) -> Optional[dict]:
    return db.patients.find_one({"id": patient_id}, {"_id": 0})


# ---------------------------------------------------------------------------
# GET /invite/{token}
# ---------------------------------------------------------------------------

@router.get("/invite/{token}", response_model=InviteResolutionResponse)
async def resolve_invite(token: str, request: Request):
    """Validate an invite token and return patient-safe appointment context.

    Marks ``invite_opened_at`` on first open.
    """
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Invite token not found.")

    # Mark first open
    if not prep.get("invite_opened_at"):
        db.prep_episodes.update_one(
            {"invite_token": token},
            {"$set": {
                "invite_opened_at": _now_iso(),
                "status": PrepStatus.invite_opened.value,
                "updated_at": _now_iso(),
            }},
        )
        prep["status"] = PrepStatus.invite_opened.value

    # Fetch appointment context
    appointment = _find_appointment(db, prep["appointment_id"]) or {}
    patient = _find_patient(db, prep["patient_id"]) or {}

    has_submitted = prep.get("status") in (
        PrepStatus.submitted.value,
        PrepStatus.analysis_running.value,
        PrepStatus.ready_for_review.value,
        PrepStatus.reviewed.value,
    )

    can_resume = prep.get("status") in (
        PrepStatus.started.value,
        PrepStatus.in_progress.value,
    )

    return InviteResolutionResponse(
        prep_episode_id=prep["id"],
        patient_id=prep["patient_id"],
        appointment_id=prep["appointment_id"],
        status=prep.get("status", PrepStatus.draft.value),
        patient_first_name=patient.get("name", "").split()[0] if patient.get("name") else "",
        appointment={
            "date": appointment.get("date", ""),
            "time": appointment.get("time", ""),
            "clinic_name": "MyHealthPal Clinic",
            "clinician_name": "Your clinician",
        },
        can_resume=can_resume,
        has_submitted=has_submitted,
    )


# ---------------------------------------------------------------------------
# POST /{token}/start
# ---------------------------------------------------------------------------

@router.post("/{token}/start", response_model=StartPrepResponse)
async def start_prep(token: str, request: Request):
    """Mark prep as started and return any existing draft."""
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Prep episode not found.")

    if prep.get("status") not in (
        PrepStatus.draft.value,
        PrepStatus.invite_sent.value,
        PrepStatus.invite_opened.value,
        PrepStatus.started.value,
        PrepStatus.in_progress.value,
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start prep in status '{prep.get('status')}'.",
        )

    db.prep_episodes.update_one(
        {"invite_token": token},
        {"$set": {
            "status": PrepStatus.started.value,
            "started_at": prep.get("started_at") or _now_iso(),
            "updated_at": _now_iso(),
        }},
    )

    existing_checkin = None
    if prep.get("checkin_payload"):
        existing_checkin = CheckinPayload(**prep["checkin_payload"])

    return StartPrepResponse(
        prep_episode_id=prep["id"],
        status=PrepStatus.started.value,
        checkin_payload=existing_checkin,
    )


# ---------------------------------------------------------------------------
# POST /{token}/save-checkin
# ---------------------------------------------------------------------------

@router.post("/{token}/save-checkin", response_model=SaveResponse)
async def save_checkin(token: str, body: CheckinPayload, request: Request):
    """Persist symptom narrative and confirmed symptom cards."""
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Prep episode not found.")

    db.prep_episodes.update_one(
        {"invite_token": token},
        {"$set": {
            "checkin_payload": body.model_dump(),
            "status": PrepStatus.in_progress.value,
            "updated_at": _now_iso(),
        }},
    )

    return SaveResponse(
        prep_episode_id=prep["id"],
        status=PrepStatus.in_progress.value,
        message="Check-in saved.",
    )


# ---------------------------------------------------------------------------
# POST /{token}/save-documents
# ---------------------------------------------------------------------------

@router.post("/{token}/save-documents", response_model=SaveResponse)
async def save_documents(token: str, body: DocumentsPayload, request: Request):
    """Save scanned/uploaded document metadata and summaries."""
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Prep episode not found.")

    db.prep_episodes.update_one(
        {"invite_token": token},
        {"$set": {
            "documents": [d.model_dump() for d in body.documents],
            "status": PrepStatus.in_progress.value,
            "updated_at": _now_iso(),
        }},
    )

    return SaveResponse(
        prep_episode_id=prep["id"],
        status=PrepStatus.in_progress.value,
        message="Documents saved.",
    )


# ---------------------------------------------------------------------------
# POST /{token}/save-health-data
# ---------------------------------------------------------------------------

@router.post("/{token}/save-health-data", response_model=SaveResponse)
async def save_health_data(token: str, body: HealthDataPayload, request: Request):
    """Persist wearable/vitals payload."""
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Prep episode not found.")

    db.prep_episodes.update_one(
        {"invite_token": token},
        {"$set": {
            "health_data_payload": body.model_dump(),
            "status": PrepStatus.in_progress.value,
            "updated_at": _now_iso(),
        }},
    )

    return SaveResponse(
        prep_episode_id=prep["id"],
        status=PrepStatus.in_progress.value,
        message="Health data saved.",
    )


# ---------------------------------------------------------------------------
# POST /{token}/submit
# ---------------------------------------------------------------------------

@router.post("/{token}/submit", response_model=SubmitResponse)
async def submit_prep(token: str, request: Request):
    """Finalise the prep package.

    Steps:
        1. Generate patient-safe summary + questions
        2. Mark status ``submitted``
        3. (Future) trigger the analysis pipeline asynchronously
    """
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Prep episode not found.")

    if prep.get("status") in (
        PrepStatus.submitted.value,
        PrepStatus.analysis_running.value,
        PrepStatus.ready_for_review.value,
        PrepStatus.reviewed.value,
    ):
        raise HTTPException(status_code=400, detail="Prep has already been submitted.")

    # Build patient-safe summary
    checkin = CheckinPayload(**prep["checkin_payload"]) if prep.get("checkin_payload") else None
    documents = [DocumentItem(**d) for d in prep.get("documents", [])]
    health_data = HealthDataPayload(**prep["health_data_payload"]) if prep.get("health_data_payload") else None

    safe_output = generate_patient_safe_summary(
        checkin=checkin,
        documents=documents,
        health_data=health_data,
    )

    now = _now_iso()
    db.prep_episodes.update_one(
        {"invite_token": token},
        {"$set": {
            "status": PrepStatus.submitted.value,
            "submitted_at": now,
            "patient_safe_summary": safe_output["summary"],
            "questions_to_ask": safe_output["questions_to_ask"],
            "updated_at": now,
        }},
    )

    return SubmitResponse(
        status=PrepStatus.submitted.value,
        summary_ready=True,
        prep_episode_id=prep["id"],
    )


# ---------------------------------------------------------------------------
# GET /{token}/summary
# ---------------------------------------------------------------------------

@router.get("/{token}/summary", response_model=SummaryResponse)
async def get_summary(token: str, request: Request):
    """Return the patient-safe summary and questions to ask."""
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Prep episode not found.")

    summary = prep.get("patient_safe_summary")
    questions = prep.get("questions_to_ask")

    if not summary:
        raise HTTPException(
            status_code=404,
            detail="Summary not yet available. Please submit your prep first.",
        )

    return SummaryResponse(
        status="ready",
        summary=summary,
        questions_to_ask=questions or [],
    )


# ---------------------------------------------------------------------------
# GET /{token}/status
# ---------------------------------------------------------------------------

@router.get("/{token}/status", response_model=PrepStatusResponse)
async def get_prep_status(token: str, request: Request):
    """Lightweight polling endpoint for the mobile app."""
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Prep episode not found.")

    status_val = prep.get("status", PrepStatus.draft.value)
    try:
        status_enum = PrepStatus(status_val)
    except ValueError:
        status_enum = PrepStatus.draft

    has_submitted = status_val in (
        PrepStatus.submitted.value,
        PrepStatus.analysis_running.value,
        PrepStatus.ready_for_review.value,
        PrepStatus.reviewed.value,
    )

    can_resume = status_val in (
        PrepStatus.started.value,
        PrepStatus.in_progress.value,
    )

    return PrepStatusResponse(
        prep_episode_id=prep["id"],
        status=status_val,
        doctor_facing_label=DOCTOR_FACING_LABELS.get(status_enum, "Not started"),
        can_resume=can_resume,
        has_submitted=has_submitted,
    )
