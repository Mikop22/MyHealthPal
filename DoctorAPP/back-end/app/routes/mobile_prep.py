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
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

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
from app.services.prep_transform import prep_episode_to_patient_payload
from app.services.analysis_pipeline import analyze_patient_pipeline

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


def _is_token_expired(prep: dict) -> bool:
    """Return True when the invite token has passed its expiry timestamp."""
    expires = prep.get("invite_expires_at")
    if not expires:
        return False
    try:
        expires_dt = datetime.fromisoformat(expires)
        return datetime.now(timezone.utc) >= expires_dt
    except (ValueError, TypeError):
        logger.warning(
            "Invalid invite_expires_at value '%s' for prep episode with token '%s'; treating as expired.",
            expires,
            prep.get("invite_token"),
        )
        return True


def _find_appointment(db, appointment_id: str) -> Optional[dict]:
    return db.appointments.find_one({"id": appointment_id}, {"_id": 0})


def _find_patient(db, patient_id: str) -> Optional[dict]:
    return db.patients.find_one({"id": patient_id}, {"_id": 0})


LOCKED_PREP_STATUSES = (
    PrepStatus.submitted.value,
    PrepStatus.analysis_running.value,
    PrepStatus.ready_for_review.value,
    PrepStatus.reviewed.value,
)


def _has_saved_draft_data(prep: dict) -> bool:
    return bool(
        prep.get("checkin_payload")
        or prep.get("documents")
        or prep.get("health_data_payload")
    )


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

    if _is_token_expired(prep):
        raise HTTPException(status_code=410, detail="Invite token has expired.")

    # Mark first open
    if not prep.get("invite_opened_at"):
        now_iso = _now_iso()
        update_fields = {
            "invite_opened_at": now_iso,
            "updated_at": now_iso,
        }
        if prep.get("status") in (
            PrepStatus.draft.value,
            PrepStatus.invite_sent.value,
            None,
        ):
            update_fields["status"] = PrepStatus.invite_opened.value
            prep["status"] = PrepStatus.invite_opened.value
        db.prep_episodes.update_one(
            {"invite_token": token},
            {"$set": update_fields},
        )
        prep["invite_opened_at"] = now_iso

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

    if prep.get("status") in (
        PrepStatus.started.value,
        PrepStatus.in_progress.value,
    ):
        new_status = prep["status"]
    elif _has_saved_draft_data(prep):
        new_status = PrepStatus.in_progress.value
    else:
        new_status = PrepStatus.started.value

    db.prep_episodes.update_one(
        {"invite_token": token},
        {"$set": {
            "status": new_status,
            "started_at": prep.get("started_at") or _now_iso(),
            "updated_at": _now_iso(),
        }},
    )

    existing_checkin = None
    if prep.get("checkin_payload"):
        existing_checkin = CheckinPayload(**prep["checkin_payload"])

    return StartPrepResponse(
        prep_episode_id=prep["id"],
        status=new_status,
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
    if prep.get("status") in LOCKED_PREP_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot save check-in in status '{prep.get('status')}'.",
        )

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
    if prep.get("status") in LOCKED_PREP_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot save documents in status '{prep.get('status')}'.",
        )

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
    if prep.get("status") in LOCKED_PREP_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot save health data in status '{prep.get('status')}'.",
        )

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
        2. Mark status ``analysis_running``
        3. Transform prep into analysis payload
        4. Run the analysis pipeline
        5. Persist analysis_response and mark ``ready_for_review``
    """
    db = _get_db(request)
    prep = _find_prep_by_token(db, token)
    if not prep:
        raise HTTPException(status_code=404, detail="Prep episode not found.")

    if prep.get("status") in LOCKED_PREP_STATUSES:
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

    # Mark status as analysis_running while we run the pipeline
    db.prep_episodes.update_one(
        {"invite_token": token},
        {"$set": {
            "status": PrepStatus.analysis_running.value,
            "submitted_at": now,
            "patient_safe_summary": safe_output["summary"],
            "questions_to_ask": safe_output["questions_to_ask"],
            "updated_at": now,
        }},
    )

    # Transform prep episode into analysis payload and run pipeline
    episode = PrepEpisode(**{**prep, "status": PrepStatus.analysis_running.value})
    patient_payload = prep_episode_to_patient_payload(episode)

    try:
        analysis = await analyze_patient_pipeline(
            payload=patient_payload,
            mongo_client=request.app.state.mongo_client,
            embedding_model=request.app.state.embedding_model,
        )

        # Persist analysis response and mark ready for review
        final_status = PrepStatus.ready_for_review.value
        db.prep_episodes.update_one(
            {"invite_token": token},
            {"$set": {
                "status": final_status,
                "analysis_response": analysis.model_dump(),
                "updated_at": _now_iso(),
            }},
        )

        # Also update the corresponding appointment with the analysis result
        db.appointments.update_one(
            {"id": prep["appointment_id"]},
            {"$set": {
                "status": "completed",
                "analysis_result": analysis.model_dump(),
            }},
        )
    except Exception as exc:
        logger.error("Analysis pipeline failed for token %s: %s", token, exc)
        # Mark status as submitted (analysis failed) so the summary is still
        # available and the prep can be retried or reviewed manually.
        final_status = PrepStatus.submitted.value
        db.prep_episodes.update_one(
            {"invite_token": token},
            {"$set": {
                "status": final_status,
                "updated_at": _now_iso(),
            }},
        )

    return SubmitResponse(
        status=final_status,
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
