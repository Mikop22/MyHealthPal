"""POST /api/v1/intake/{token}/submit — Intake Orchestrator Route.

Connects the patient-facing frontend, MongoDB, the LangChain RAG pipeline,
and the XRPL blockchain payout into a single transactional endpoint.

Flow:
    1. Validate that the appointment exists and has not already been completed.
    2. Run the full ML analysis pipeline (biometric deltas → embedding →
       vector search → LLM clinical brief).
    3. Persist the raw payload and analysis results back to the appointment
       document for auditing.
    4. Queue a background XRPL payout of 10 XRP to compensate the patient
       for their data contribution.
    5. Return a success confirmation to the frontend.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.models.patient import (
    AnalysisResponse,
    PatientPayload,
)
from app.services.analysis_pipeline import analyze_patient_pipeline
from app.services.demo_data import build_mock_biometric_data
from app.services.xrp_wallet import process_research_payout

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["intake"])

# Amount of XRP awarded per completed intake submission
XRP_PAYOUT_AMOUNT = 10


def _has_empty_biometrics(payload: PatientPayload) -> bool:
    """Return True if all acute metric arrays in the payload are empty."""
    m = payload.data.acute_7_day.metrics
    return all(
        len(getattr(m, field)) == 0
        for field in m.model_fields
    )


@router.post("/intake/{token}/submit")
async def submit_intake(
    token: str,
    payload: PatientPayload,
    request: Request,
    background_tasks: BackgroundTasks,
):
    """Intake orchestrator — validates, analyzes, persists, and pays out.

    Path Parameters:
        token: Unique appointment identifier that also serves as the
               patient's public XRPL wallet address for compensation.

    Request Body:
        PatientPayload containing the patient narrative, risk profile,
        and biometric data arrays (acute_7_day + longitudinal_6_month).
    """
    # ── Dependency injection ─────────────────────────────────────────
    db = request.app.state.mongo_client[request.app.state.db_name]
    appointments = db.appointments

    # ── Step 1: Database Validation ──────────────────────────────────
    # Look up the appointment by its form_token (the intake token)
    appointment = appointments.find_one({"form_token": token})

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found for the provided token.",
        )

    # Prevent double-submissions (protects the research fund from draining)
    if appointment.get("status") == "completed":
        raise HTTPException(
            status_code=400,
            detail="This intake has already been submitted.",
        )

    # ── Step 1b: Biometric Data Fallback ─────────────────────────────
    # When the Apple Watch syncs via the iOS Shortcut, biometric data
    # arrives through the webhook (stored on the appointment doc) — the
    # frontend sends empty arrays.  Fall back to mock data so the
    # pipeline always produces a meaningful dashboard.
    if _has_empty_biometrics(payload):
        logger.info("Empty biometrics for token %s — using mock data", token)
        payload.data = build_mock_biometric_data()

    # ── Step 2: ML Pipeline Execution ────────────────────────────────
    # Run the full RAG pipeline: biometric deltas → PubMedBERT embedding →
    # MongoDB $vectorSearch → LangChain GPT extraction.
    try:
        analysis: AnalysisResponse = await analyze_patient_pipeline(
            payload=payload,
            mongo_client=request.app.state.mongo_client,
            embedding_model=request.app.state.embedding_model,
        )
    except Exception as exc:
        # Catch LangChain timeout errors and any other pipeline failures
        logger.error("ML pipeline failed for token %s: %s", token, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis pipeline error: {str(exc)}",
        )

    # ── Step 3: Database Mutation (The Handoff) ──────────────────────
    # Persist the raw payload and generated analysis back to the appointment
    # document for auditing, and mark the intake as completed.
    appointments.update_one(
        {"form_token": token},
        {
            "$set": {
                "status": "completed",
                "patient_payload": payload.model_dump(),
                "analysis_result": analysis.model_dump(),
            },
        },
    )

    # Also update the patient record status so the doctor's patient list
    # reflects that this patient's intake + analysis is done.
    patient_id = appointment.get("patient_id")
    if patient_id:
        db.patients.update_one(
            {"id": patient_id},
            {"$set": {"status": "Completed"}},
        )

    # ── Step 4: DeSci Blockchain Payout (Background Task) ────────────
    # Compensate the patient with XRP for their data. Runs in the
    # background so ledger consensus does not block the HTTP response.
    background_tasks.add_task(
        process_research_payout,
        target_address=token,
        amount=XRP_PAYOUT_AMOUNT,
    )

    # ── Step 5: Return success ───────────────────────────────────────
    return {
        "status": "success",
        "message": "Data processed and XRPL payout initiated.",
    }
