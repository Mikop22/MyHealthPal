"""Appointment routes — schedule appointments and send email notifications."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from app.models.patient_management import AppointmentCreate, AppointmentRecord
from app.models.patient import AnalysisResponse
from app.services.email_service import send_appointment_email
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["appointments"])


@router.post("/appointments", response_model=AppointmentRecord)
async def create_appointment(body: AppointmentCreate, request: Request):
    """Schedule an appointment, generate a unique form link, and email the patient."""
    db = request.app.state.mongo_client[request.app.state.db_name]

    # Look up the patient
    patient = db.patients.find_one({"id": body.patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    appointment_id = str(uuid.uuid4())
    form_token = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    record = AppointmentRecord(
        id=appointment_id,
        patient_id=body.patient_id,
        date=body.date,
        time=body.time,
        status="scheduled",
        form_token=form_token,
        created_at=now,
    )

    # Save to MongoDB
    db.appointments.insert_one(record.model_dump())

    # Update patient status
    db.patients.update_one(
        {"id": body.patient_id},
        {"$set": {"status": "In Progress"}},
    )

    # Build form URL and send email
    form_url = f"{settings.FRONTEND_URL}/intake/{form_token}"

    await send_appointment_email(
        patient_email=patient["email"],
        patient_name=patient["name"],
        appointment_date=body.date,
        appointment_time=body.time,
        form_url=form_url,
    )

    return record


@router.get("/appointments/{id}/dashboard", response_model=AnalysisResponse)
async def get_appointment_dashboard(id: str, request: Request):
    """Return pre-computed analysis for a specific appointment.

    Reads the analysis_result stored during intake submission.
    Does NOT trigger LLM or vector search — lightweight read path only.

    Path Parameters:
        id: The appointment UUID (not the patient ID).
    """
    db = request.app.state.mongo_client[request.app.state.db_name]

    appointment = db.appointments.find_one({"id": id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    analysis = appointment.get("analysis_result")
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not yet available for this appointment.",
        )

    return AnalysisResponse(**analysis)


@router.get("/appointments/{patient_id}", response_model=list[AppointmentRecord])
async def get_patient_appointments(patient_id: str, request: Request):
    """List all appointments for a given patient."""
    db = request.app.state.mongo_client[request.app.state.db_name]
    cursor = db.appointments.find({"patient_id": patient_id}, {"_id": 0})
    appointments = []
    for doc in cursor:
        appointments.append(AppointmentRecord(**doc))
    return appointments
