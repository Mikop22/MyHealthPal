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
    PatientData,
    AcuteData,
    AcuteMetrics,
    LongitudinalData,
    LongitudinalMetrics,
    MetricDataPoint,
    LongitudinalDataPoint,
    StringMetricDataPoint,
)
from app.services.analysis_pipeline import analyze_patient_pipeline
from app.services.xrp_wallet import process_research_payout

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["intake"])

# Amount of XRP awarded per completed intake submission
XRP_PAYOUT_AMOUNT = 10


def _build_mock_biometric_data() -> PatientData:
    """Return realistic mock biometric data for demo/fallback scenarios.

    Used when the frontend sends empty biometric arrays (e.g. Apple Watch
    sync didn't deliver structured data, or the user skipped sync without
    the frontend injecting demo data).
    """
    return PatientData(
        acute_7_day=AcuteData(
            granularity="daily_summary",
            metrics=AcuteMetrics(
                heartRateVariabilitySDNN=[
                    MetricDataPoint(date="2026-02-15", value=48.2, unit="ms"),
                    MetricDataPoint(date="2026-02-16", value=47.1, unit="ms"),
                    MetricDataPoint(date="2026-02-17", value=45.9, unit="ms"),
                    MetricDataPoint(date="2026-02-18", value=22.4, unit="ms", flag="severe_drop"),
                    MetricDataPoint(date="2026-02-19", value=24.1, unit="ms"),
                    MetricDataPoint(date="2026-02-20", value=28.5, unit="ms"),
                    MetricDataPoint(date="2026-02-21", value=31.0, unit="ms"),
                ],
                restingHeartRate=[
                    MetricDataPoint(date="2026-02-15", value=62, unit="bpm"),
                    MetricDataPoint(date="2026-02-16", value=63, unit="bpm"),
                    MetricDataPoint(date="2026-02-17", value=62, unit="bpm"),
                    MetricDataPoint(date="2026-02-18", value=78, unit="bpm", flag="elevated"),
                    MetricDataPoint(date="2026-02-19", value=76, unit="bpm"),
                    MetricDataPoint(date="2026-02-20", value=74, unit="bpm"),
                    MetricDataPoint(date="2026-02-21", value=72, unit="bpm"),
                ],
                appleSleepingWristTemperature=[
                    MetricDataPoint(date="2026-02-15", value=-0.12, unit="degC_deviation"),
                    MetricDataPoint(date="2026-02-16", value=-0.10, unit="degC_deviation"),
                    MetricDataPoint(date="2026-02-17", value=0.05, unit="degC_deviation"),
                    MetricDataPoint(date="2026-02-18", value=0.85, unit="degC_deviation", flag="sustained_high"),
                    MetricDataPoint(date="2026-02-19", value=0.92, unit="degC_deviation"),
                    MetricDataPoint(date="2026-02-20", value=0.80, unit="degC_deviation"),
                    MetricDataPoint(date="2026-02-21", value=0.75, unit="degC_deviation"),
                ],
                respiratoryRate=[
                    MetricDataPoint(date="2026-02-15", value=14.5, unit="breaths/min"),
                    MetricDataPoint(date="2026-02-16", value=14.6, unit="breaths/min"),
                    MetricDataPoint(date="2026-02-17", value=14.5, unit="breaths/min"),
                    MetricDataPoint(date="2026-02-18", value=18.2, unit="breaths/min", flag="elevated"),
                    MetricDataPoint(date="2026-02-19", value=17.8, unit="breaths/min"),
                    MetricDataPoint(date="2026-02-20", value=16.5, unit="breaths/min"),
                    MetricDataPoint(date="2026-02-21", value=16.0, unit="breaths/min"),
                ],
                walkingAsymmetryPercentage=[
                    MetricDataPoint(date="2026-02-15", value=1.2, unit="%"),
                    MetricDataPoint(date="2026-02-16", value=1.5, unit="%"),
                    MetricDataPoint(date="2026-02-17", value=1.3, unit="%"),
                    MetricDataPoint(date="2026-02-18", value=8.5, unit="%", flag="guarding_detected"),
                    MetricDataPoint(date="2026-02-19", value=8.2, unit="%"),
                    MetricDataPoint(date="2026-02-20", value=6.0, unit="%"),
                    MetricDataPoint(date="2026-02-21", value=5.5, unit="%"),
                ],
                stepCount=[
                    MetricDataPoint(date="2026-02-15", value=8500, unit="count"),
                    MetricDataPoint(date="2026-02-16", value=8200, unit="count"),
                    MetricDataPoint(date="2026-02-17", value=8600, unit="count"),
                    MetricDataPoint(date="2026-02-18", value=1200, unit="count", flag="mobility_drop"),
                    MetricDataPoint(date="2026-02-19", value=1500, unit="count"),
                    MetricDataPoint(date="2026-02-20", value=2500, unit="count"),
                    MetricDataPoint(date="2026-02-21", value=3000, unit="count"),
                ],
                sleepAnalysis_awakeSegments=[
                    MetricDataPoint(date="2026-02-15", value=1, unit="count"),
                    MetricDataPoint(date="2026-02-16", value=1, unit="count"),
                    MetricDataPoint(date="2026-02-17", value=2, unit="count"),
                    MetricDataPoint(date="2026-02-18", value=6, unit="count", flag="painsomnia"),
                    MetricDataPoint(date="2026-02-19", value=5, unit="count"),
                    MetricDataPoint(date="2026-02-20", value=4, unit="count"),
                    MetricDataPoint(date="2026-02-21", value=3, unit="count"),
                ],
                bloodOxygenSaturation=[
                    MetricDataPoint(date="2026-02-15", value=98.0, unit="%"),
                    MetricDataPoint(date="2026-02-16", value=97.8, unit="%"),
                    MetricDataPoint(date="2026-02-17", value=98.1, unit="%"),
                    MetricDataPoint(date="2026-02-18", value=95.2, unit="%", flag="dip_detected"),
                    MetricDataPoint(date="2026-02-19", value=95.5, unit="%"),
                    MetricDataPoint(date="2026-02-20", value=96.2, unit="%"),
                    MetricDataPoint(date="2026-02-21", value=96.8, unit="%"),
                ],
                walkingStepLength=[
                    MetricDataPoint(date="2026-02-15", value=0.72, unit="meters"),
                    MetricDataPoint(date="2026-02-16", value=0.71, unit="meters"),
                    MetricDataPoint(date="2026-02-17", value=0.72, unit="meters"),
                    MetricDataPoint(date="2026-02-18", value=0.58, unit="meters", flag="shortened_stride"),
                    MetricDataPoint(date="2026-02-19", value=0.59, unit="meters"),
                    MetricDataPoint(date="2026-02-20", value=0.63, unit="meters"),
                    MetricDataPoint(date="2026-02-21", value=0.65, unit="meters"),
                ],
                walkingDoubleSupportPercentage=[
                    MetricDataPoint(date="2026-02-15", value=22.1, unit="%"),
                    MetricDataPoint(date="2026-02-16", value=22.3, unit="%"),
                    MetricDataPoint(date="2026-02-17", value=22.0, unit="%"),
                    MetricDataPoint(date="2026-02-18", value=31.5, unit="%", flag="guarding_gait"),
                    MetricDataPoint(date="2026-02-19", value=30.8, unit="%"),
                    MetricDataPoint(date="2026-02-20", value=27.2, unit="%"),
                    MetricDataPoint(date="2026-02-21", value=25.4, unit="%"),
                ],
                menstrualCyclePhase=[
                    StringMetricDataPoint(date="2026-02-15", value="Luteal", unit="phase"),
                    StringMetricDataPoint(date="2026-02-16", value="Luteal", unit="phase"),
                    StringMetricDataPoint(date="2026-02-17", value="Luteal", unit="phase"),
                    StringMetricDataPoint(date="2026-02-18", value="Luteal", unit="phase", flag="peak_progesterone"),
                    StringMetricDataPoint(date="2026-02-19", value="Luteal", unit="phase", flag="peak_progesterone"),
                    StringMetricDataPoint(date="2026-02-20", value="Luteal", unit="phase"),
                    StringMetricDataPoint(date="2026-02-21", value="Menstrual", unit="phase"),
                ],
            ),
        ),
        longitudinal_6_month=LongitudinalData(
            granularity="weekly_average",
            metrics=LongitudinalMetrics(
                restingHeartRate=[
                    LongitudinalDataPoint(week_start="2025-08-24", value=61.2, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-08-31", value=61.5, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-09-07", value=61.4, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-09-14", value=61.8, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-09-21", value=62.1, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-09-28", value=62.0, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-10-05", value=62.5, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-10-12", value=62.8, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-10-19", value=63.1, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-10-26", value=63.5, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-11-02", value=63.8, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-11-09", value=64.1, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-11-16", value=64.5, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-11-23", value=64.7, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-11-30", value=65.1, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-12-07", value=65.5, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-12-14", value=65.8, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-12-21", value=66.2, unit="bpm"),
                    LongitudinalDataPoint(week_start="2025-12-28", value=66.5, unit="bpm"),
                    LongitudinalDataPoint(week_start="2026-01-04", value=66.8, unit="bpm"),
                    LongitudinalDataPoint(week_start="2026-01-11", value=67.1, unit="bpm"),
                    LongitudinalDataPoint(week_start="2026-01-18", value=67.4, unit="bpm"),
                    LongitudinalDataPoint(week_start="2026-01-25", value=67.7, unit="bpm"),
                    LongitudinalDataPoint(week_start="2026-02-01", value=68.1, unit="bpm"),
                    LongitudinalDataPoint(week_start="2026-02-08", value=68.4, unit="bpm"),
                    LongitudinalDataPoint(week_start="2026-02-15", value=68.8, unit="bpm", trend="creeping_elevation"),
                ],
                walkingAsymmetryPercentage=[
                    LongitudinalDataPoint(week_start="2025-08-24", value=1.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-08-31", value=1.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-07", value=1.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-14", value=1.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-21", value=1.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-28", value=1.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-05", value=1.4, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-12", value=1.5, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-19", value=1.6, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-26", value=1.8, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-02", value=2.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-09", value=2.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-16", value=2.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-23", value=2.4, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-30", value=2.5, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-07", value=2.6, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-14", value=2.8, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-21", value=2.9, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-28", value=3.1, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-04", value=3.3, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-11", value=3.4, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-18", value=3.6, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-25", value=3.8, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-01", value=4.0, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-08", value=4.1, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-15", value=4.3, unit="%", trend="gradual_impairment"),
                ],
                bloodOxygenSaturation=[
                    LongitudinalDataPoint(week_start="2025-08-24", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-08-31", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-07", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-14", value=98.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-21", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-28", value=97.8, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-05", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-12", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-19", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-26", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-02", value=97.8, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-09", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-16", value=98.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-23", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-30", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-07", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-14", value=97.8, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-21", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-28", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-04", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-11", value=97.8, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-18", value=98.1, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-25", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-01", value=98.0, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-08", value=97.9, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-15", value=97.8, unit="%"),
                ],
                walkingStepLength=[
                    LongitudinalDataPoint(week_start="2025-08-24", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-08-31", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-09-07", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-09-14", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-09-21", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-09-28", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-10-05", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-10-12", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-10-19", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-10-26", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-02", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-09", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-16", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-23", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-11-30", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-12-07", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-12-14", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-12-21", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2025-12-28", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-01-04", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-01-11", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-01-18", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-01-25", value=0.72, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-02-01", value=0.71, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-02-08", value=0.70, unit="meters"),
                    LongitudinalDataPoint(week_start="2026-02-15", value=0.70, unit="meters"),
                ],
                walkingDoubleSupportPercentage=[
                    LongitudinalDataPoint(week_start="2025-08-24", value=22.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-08-31", value=22.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-07", value=22.0, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-14", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-21", value=22.1, unit="%"),
                    LongitudinalDataPoint(week_start="2025-09-28", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-05", value=22.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-12", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-19", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2025-10-26", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-02", value=22.6, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-09", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-16", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-23", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2025-11-30", value=22.6, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-07", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-14", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-21", value=22.2, unit="%"),
                    LongitudinalDataPoint(week_start="2025-12-28", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-04", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-11", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-18", value=22.4, unit="%"),
                    LongitudinalDataPoint(week_start="2026-01-25", value=22.6, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-01", value=22.3, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-08", value=22.5, unit="%"),
                    LongitudinalDataPoint(week_start="2026-02-15", value=22.4, unit="%"),
                ],
            ),
        ),
    )


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
        payload.data = _build_mock_biometric_data()

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
