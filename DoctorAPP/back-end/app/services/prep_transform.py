"""Transform a mobile PrepEpisode into the ``PatientPayload`` expected by the
existing analysis pipeline.

The mobile app collects data in a different shape (check-in narrative,
confirmed symptom cards, optional docs/health data).  This module converts
that into the ``PatientPayload`` model that
``app.services.analysis_pipeline.analyze_patient_pipeline`` already accepts.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.models.patient import (
    AcuteData,
    AcuteMetrics,
    LongitudinalData,
    LongitudinalMetrics,
    MetricDataPoint,
    LongitudinalDataPoint,
    PatientData,
    PatientPayload,
    RiskProfile,
)
from app.models.prep_episode import PrepEpisode


def prep_episode_to_patient_payload(episode: PrepEpisode) -> PatientPayload:
    """Convert a PrepEpisode into a ``PatientPayload`` for the analysis pipeline.

    The narrative comes from the check-in payload. Biometric fields are
    currently populated with minimal stub values, and the analysis pipeline
    handles empty or stub biometrics gracefully via its own mock-data
    fallback.
    """
    # -- Narrative ----------------------------------------------------------
    narrative = ""
    if episode.checkin_payload:
        narrative = episode.checkin_payload.raw_text or ""

        # Append confirmed symptom labels to enrich the narrative
        if episode.checkin_payload.confirmed_symptoms and episode.checkin_payload.extracted_symptoms:
            label_map = {
                s.id: s.label for s in episode.checkin_payload.extracted_symptoms
            }
            confirmed_labels = [
                label_map[sid]
                for sid in episode.checkin_payload.confirmed_symptoms
                if sid in label_map
            ]
            if confirmed_labels:
                narrative += " Confirmed symptoms: " + ", ".join(confirmed_labels) + "."

    if not narrative:
        narrative = "Patient submitted preparation without a written narrative."

    # -- Biometric data -----------------------------------------------------
    # We currently ignore any health data payload on the episode and always
    # send minimal stub biometrics. The analysis pipeline has a fallback that
    # generates mock biometrics as needed, so this is safe.
    stub_metric = MetricDataPoint(
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        value=0.0,
        unit="n/a",
    )
    stub_long = LongitudinalDataPoint(
        week_start=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        value=0.0,
        unit="n/a",
    )

    patient_data = PatientData(
        acute_7_day=AcuteData(
            granularity="daily_summary",
            metrics=AcuteMetrics(
                heartRateVariabilitySDNN=[stub_metric],
                restingHeartRate=[stub_metric],
                appleSleepingWristTemperature=[stub_metric],
                respiratoryRate=[stub_metric],
                walkingAsymmetryPercentage=[stub_metric],
                stepCount=[stub_metric],
                sleepAnalysis_awakeSegments=[stub_metric],
            ),
        ),
        longitudinal_6_month=LongitudinalData(
            granularity="weekly_average",
            metrics=LongitudinalMetrics(
                restingHeartRate=[stub_long],
                walkingAsymmetryPercentage=[stub_long],
            ),
        ),
    )

    return PatientPayload(
        patient_id=episode.patient_id,
        sync_timestamp=datetime.now(timezone.utc).isoformat(),
        hardware_source="mobile_prep",
        patient_narrative=narrative,
        data=patient_data,
        risk_profile=RiskProfile(factors=[]),
    )
