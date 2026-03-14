"""Patient management routes — create + list patients with XRP wallets."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from app.models.patient_management import PatientCreate, PatientRecord, AppointmentRecord
from app.models.patient import AnalysisResponse, PatientPayload, RiskProfile, RiskFactor
from app.services.xrp_wallet import create_patient_wallet
from app.services.email_service import send_appointment_email
from app.services.analysis_pipeline import analyze_patient_pipeline
from app.routes.intake import _build_mock_biometric_data
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["patients"])


@router.get("/patients", response_model=list[PatientRecord])
async def list_patients(request: Request):
    """Return all patients from MongoDB."""
    db = request.app.state.mongo_client[request.app.state.db_name]
    cursor = db.patients.find({}, {"_id": 0})
    patients = []
    for doc in cursor:
        patients.append(PatientRecord(**doc))
    return patients


@router.post("/patients", response_model=PatientRecord)
async def create_patient(body: PatientCreate, request: Request):
    """Create a new patient with an XRP Testnet wallet."""
    # Generate XRP wallet
    try:
        wallet_info = await create_patient_wallet()
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"XRP wallet creation failed: {str(e)}",
        )

    patient_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    record = PatientRecord(
        id=patient_id,
        name=body.name,
        email=body.email,
        xrp_wallet_address=wallet_info["address"],
        xrp_wallet_seed=wallet_info["seed"],
        created_at=now,
        status="In Progress",
        concern="",
    )

    # Save to MongoDB
    db = request.app.state.mongo_client[request.app.state.db_name]
    db.patients.insert_one(record.model_dump())

    # Create an appointment with intake form link and send email
    form_token = str(uuid.uuid4())
    appointment = AppointmentRecord(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        date="TBD",
        time="TBD",
        status="scheduled",
        form_token=form_token,
        created_at=now,
    )
    db.appointments.insert_one(appointment.model_dump())

    form_url = f"{settings.FRONTEND_URL}/intake/{form_token}"
    await send_appointment_email(
        patient_email=body.email,
        patient_name=body.name,
        appointment_date="your upcoming visit",
        appointment_time="(to be confirmed)",
        form_url=form_url,
    )

    return record


@router.get("/patients/{patient_id}/dashboard")
async def get_dashboard_data(patient_id: str, request: Request):
    """Return pre-computed analysis results for the patient dashboard.

    Reads the ``analysis_result`` stored during intake submission — no ML
    processing is performed.  Returns the most recently completed appointment's
    analysis for the given patient.
    """
    db = request.app.state.mongo_client[request.app.state.db_name]

    appointment = db.appointments.find_one(
        {"patient_id": patient_id, "status": "completed"},
        sort=[("created_at", -1)],
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="No completed analysis found for this patient.",
        )

    analysis = appointment.get("analysis_result")
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Appointment found but analysis results are missing.",
        )

    result = dict(analysis)
    patient_payload = appointment.get("patient_payload")
    if patient_payload:
        result["patient_payload"] = patient_payload

    # Inject patient name so the frontend doesn't need a hardcoded lookup map
    patient = db.patients.find_one({"id": patient_id}, {"_id": 0, "name": 1})
    if patient:
        result["patient_name"] = patient["name"]

    return result


# ── Demo narrative & risk profile for the test patient endpoint ──────────────

_TEST_NARRATIVE = (
    "I've been experiencing severe lower abdominal pain for the past four "
    "days. It started suddenly on Tuesday — a sharp, stabbing pain on my "
    "right side that has since become a constant dull ache radiating to my "
    "lower back. The pain wakes me up multiple times at night. I've noticed "
    "I'm walking differently, almost limping, because any jarring movement "
    "makes it worse. My energy is completely gone; I can barely get out of "
    "bed some days. I feel warm but haven't taken my temperature. I've had "
    "similar but milder episodes over the past six months that were dismissed "
    "as 'just period pain,' but this is significantly worse. I'm worried "
    "something is being missed."
)

_TEST_RISK_PROFILE = RiskProfile(
    factors=[
        RiskFactor(
            category="Genetic & Biological",
            factor="Ancestry-Specific Risk",
            description="Black women face ~70% higher mortality in certain age brackets.",
            severity="High",
            weight=85,
        ),
        RiskFactor(
            category="Reproductive",
            factor="Endometriosis History",
            description="Long-term systemic inflammation; compounding general oncological risk.",
            severity="Moderate",
            weight=55,
        ),
    ]
)


@router.post("/patients/test", response_model=PatientRecord)
async def create_test_patient(request: Request):
    """Create a test patient with pre-populated biometric data and run the
    full AI analysis pipeline immediately.

    Designed for hackathon demos — creates a patient, populates mock Apple
    Health biometrics and a realistic patient narrative, runs the complete
    RAG diagnostic pipeline (embeddings → vector search → GPT), and stores
    the results so the dashboard is instantly available.

    No request body required.
    """
    patient_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    record = PatientRecord(
        id=patient_id,
        name="Test Patient",
        email="test@demo.myhealthpal.com",
        xrp_wallet_address="rTestWalletDemo000000000000000",
        xrp_wallet_seed="sEdTestSeedDemo",
        created_at=now,
        status="In Progress",
        concern="",
    )

    db = request.app.state.mongo_client[request.app.state.db_name]
    db.patients.insert_one(record.model_dump())

    # Create an appointment record (mirrors the normal patient flow)
    form_token = str(uuid.uuid4())
    appointment_id = str(uuid.uuid4())
    appointment = AppointmentRecord(
        id=appointment_id,
        patient_id=patient_id,
        date="TBD",
        time="TBD",
        status="scheduled",
        form_token=form_token,
        created_at=now,
    )
    db.appointments.insert_one(appointment.model_dump())

    # Build the test payload with mock biometrics + narrative
    payload = PatientPayload(
        patient_id=patient_id,
        sync_timestamp=now,
        hardware_source="Apple Watch Series 9 (Demo)",
        patient_narrative=_TEST_NARRATIVE,
        data=_build_mock_biometric_data(),
        risk_profile=_TEST_RISK_PROFILE,
    )

    # Run the full AI analysis pipeline
    try:
        analysis: AnalysisResponse = await analyze_patient_pipeline(
            payload=payload,
            mongo_client=request.app.state.mongo_client,
            embedding_model=request.app.state.embedding_model,
        )
    except Exception as exc:
        logger.error("Test patient pipeline failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis pipeline error: {str(exc)}",
        )

    # Persist results so the dashboard endpoint can serve them
    db.appointments.update_one(
        {"id": appointment_id},
        {
            "$set": {
                "status": "completed",
                "patient_payload": payload.model_dump(),
                "analysis_result": analysis.model_dump(),
            },
        },
    )

    # Update patient status & concern
    db.patients.update_one(
        {"id": patient_id},
        {
            "$set": {
                "status": "Completed",
                "concern": analysis.clinical_brief.primary_concern,
            },
        },
    )

    record.status = "Completed"
    record.concern = analysis.clinical_brief.primary_concern
    return record
