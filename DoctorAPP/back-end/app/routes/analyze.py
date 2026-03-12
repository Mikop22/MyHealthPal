"""POST /api/v1/analyze-patient — full diagnostic analysis pipeline with RAG."""

from __future__ import annotations

from fastapi import APIRouter, Request, HTTPException
from app.models.patient import (
    PatientPayload,
    AnalysisResponse,
    ClinicalBrief,
    BiometricDelta,
    ConditionMatch,
    MetricDataPoint,
    LongitudinalDataPoint,
)
from app.services.llm_extractor import extract_clinical_brief
from app.services.embeddings import encode_text
from app.services.vector_search import search_conditions
from app.services.cusum import detect_changepoint

router = APIRouter(prefix="/api/v1", tags=["analysis"])

# ---------------------------------------------------------------------------
# Clinical significance thresholds
# ---------------------------------------------------------------------------
THRESHOLDS = {
    "restingHeartRate": {"value": 5, "unit": "bpm"},
    "heartRateVariabilitySDNN": {"value": 10, "unit": "ms"},
    "respiratoryRate": {"value": 2, "unit": "breaths/min"},
    "stepCount": {"value": 3000, "unit": "count"},
    "sleepAnalysis_awakeSegments": {"value": 2, "unit": "count"},
    "appleSleepingWristTemperature": {"value": 0.5, "unit": "degC_deviation"},
    "walkingAsymmetryPercentage": {"value": 3, "unit": "%"},
    "bloodOxygenSaturation": {"value": 2, "unit": "%"},
    "walkingStepLength": {"value": 0.05, "unit": "meters"},
    "walkingDoubleSupportPercentage": {"value": 3, "unit": "%"},
}

# Metrics present in both acute and longitudinal data
SHARED_METRICS = {
    "restingHeartRate",
    "walkingAsymmetryPercentage",
    "bloodOxygenSaturation",
    "walkingStepLength",
    "walkingDoubleSupportPercentage",
}

# Acute-only metrics: use first 3 days as baseline, last 4 as acute
ACUTE_ONLY_METRICS = {
    "heartRateVariabilitySDNN",
    "respiratoryRate",
    "stepCount",
    "sleepAnalysis_awakeSegments",
    "appleSleepingWristTemperature",
}


def _avg(values: list[float]) -> float:
    """Return the mean of a list of floats."""
    if not values:
        return 0.0
    return sum(values) / len(values)


def _compute_biometric_deltas(payload: PatientPayload) -> list[BiometricDelta]:
    """Compute biometric deltas between acute and baseline measurements.

    For metrics in BOTH acute and longitudinal (restingHeartRate,
    walkingAsymmetryPercentage): compare acute 7-day average against
    longitudinal 6-month average.

    For acute-only metrics: split the 7-day window into baseline (first 3
    days) and acute (last 4 days), then compare.
    """
    deltas: list[BiometricDelta] = []
    acute_metrics = payload.data.acute_7_day.metrics
    longitudinal_metrics = payload.data.longitudinal_6_month.metrics

    # --- Shared metrics: acute avg vs longitudinal avg ---
    for metric_name in SHARED_METRICS:
        acute_points: list[MetricDataPoint] = getattr(acute_metrics, metric_name)
        longitudinal_points: list[LongitudinalDataPoint] = getattr(
            longitudinal_metrics, metric_name
        )

        if not acute_points or not longitudinal_points:
            continue

        acute_avg = _avg([p.value for p in acute_points])
        longitudinal_avg = _avg([p.value for p in longitudinal_points])
        delta = abs(acute_avg - longitudinal_avg)
        unit = acute_points[0].unit if acute_points else ""

        threshold_info = THRESHOLDS.get(metric_name, {"value": 0})
        clinically_significant = delta > threshold_info["value"]

        # CUSUM on acute 7-day series (dates align with charts)
        cp_values = [p.value for p in acute_points]
        cp_dates = [p.date for p in acute_points]
        cp = detect_changepoint(cp_values, cp_dates)

        deltas.append(
            BiometricDelta(
                metric=metric_name,
                acute_avg=round(acute_avg, 2),
                longitudinal_avg=round(longitudinal_avg, 2),
                delta=round(delta, 2),
                unit=unit,
                clinically_significant=clinically_significant,
                changepoint_detected=cp is not None,
                changepoint_date=cp["date"] if cp else None,
                changepoint_direction=cp["direction"] if cp else None,
            )
        )

    # --- Acute-only metrics: first 3 days (baseline) vs last 4 days (acute) ---
    for metric_name in ACUTE_ONLY_METRICS:
        acute_points: list[MetricDataPoint] = getattr(acute_metrics, metric_name)

        if not acute_points:
            continue

        baseline_values = [p.value for p in acute_points[:3]]
        acute_values = [p.value for p in acute_points[3:]]

        baseline_avg = _avg(baseline_values)
        acute_avg = _avg(acute_values)
        delta = abs(acute_avg - baseline_avg)
        unit = acute_points[0].unit if acute_points else ""

        threshold_info = THRESHOLDS.get(metric_name, {"value": 0})
        clinically_significant = delta > threshold_info["value"]

        # CUSUM on acute 7-day series
        cp_values = [p.value for p in acute_points]
        cp_dates = [p.date for p in acute_points]
        cp = detect_changepoint(cp_values, cp_dates)

        deltas.append(
            BiometricDelta(
                metric=metric_name,
                acute_avg=round(acute_avg, 2),
                longitudinal_avg=round(baseline_avg, 2),
                delta=round(delta, 2),
                unit=unit,
                clinically_significant=clinically_significant,
                changepoint_detected=cp is not None,
                changepoint_date=cp["date"] if cp else None,
                changepoint_direction=cp["direction"] if cp else None,
            )
        )

    return deltas


def _format_biometric_summary(deltas: list[BiometricDelta]) -> str:
    """Format biometric deltas into a human-readable summary for the LLM."""
    lines = ["### Biometric Delta Summary\n"]
    for d in deltas:
        significance = "CLINICALLY SIGNIFICANT" if d.clinically_significant else "within normal range"
        lines.append(
            f"- **{d.metric}**: acute avg {d.acute_avg} {d.unit} vs "
            f"baseline avg {d.longitudinal_avg} {d.unit} "
            f"(delta: {d.delta} {d.unit}) — {significance}"
        )
    return "\n".join(lines)


def _format_retrieval_context(matches: list[dict]) -> str:
    """Format vector search matches as retrieval context for the RAG prompt."""
    if not matches:
        return ""

    lines = []
    for i, m in enumerate(matches, 1):
        lines.append(
            f"### [{i}] {m.get('condition', 'Unknown Condition')}\n"
            f"**Paper:** {m.get('title', 'Untitled')}\n"
            f"**PMCID:** {m.get('pmcid', 'N/A')}\n"
            f"**Key findings:** {m.get('snippet', '')}\n"
        )
    return "\n".join(lines)


@router.post("/analyze-patient", response_model=AnalysisResponse)
async def analyze_patient(payload: PatientPayload, request: Request):
    """Run the full RAG diagnostic analysis pipeline.

    1. Compute biometric deltas
    2. Format biometric summary
    3. Generate PubMedBERT embedding from narrative + biometrics
    4. Run hybrid search (vector + BM25) for matching conditions
    5. Format retrieval context from matched conditions
    6. Call GPT-4o with RAG context → clinical brief with citations
    7. Return structured AnalysisResponse
    """
    # Step 1: Compute biometric deltas
    biometric_deltas = _compute_biometric_deltas(payload)

    # Step 2: Format biometric summary
    biometric_summary = _format_biometric_summary(biometric_deltas)

    # Step 3: Generate embedding from narrative + biometric summary (moved before LLM)
    embedding_text = payload.patient_narrative + " " + biometric_summary
    embedding_model = request.app.state.embedding_model
    query_vector = encode_text(embedding_model, embedding_text)

    # Step 4: Run hybrid search (vector + BM25)
    try:
        mongo_client = request.app.state.mongo_client
        raw_matches = await search_conditions(
            mongo_client,
            query_vector,
            query_text=payload.patient_narrative,
            top_k=5,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Vector search failed: {str(e)}",
        )

    # Step 5: Format retrieval context from top 3 matches for RAG
    retrieval_context = _format_retrieval_context(raw_matches[:3])

    # Step 5a: Format the risk profile summary
    risk_summary_lines = []
    if hasattr(payload, "risk_profile") and payload.risk_profile.factors:
        for f in payload.risk_profile.factors:
            risk_summary_lines.append(f"- **{f.factor}** ({f.category}): {f.severity} severity. {f.description}")
    risk_summary = "\n".join(risk_summary_lines)

    # Step 6: Call LLM with RAG context and demographic risk
    try:
        clinical_output = await extract_clinical_brief(
            narrative=payload.patient_narrative,
            biometric_summary=biometric_summary,
            risk_summary=risk_summary,
            retrieval_context=retrieval_context,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"LLM extraction failed: {str(e)}",
        )

    clinical_brief = ClinicalBrief(
        summary=clinical_output.summary,
        clinical_intake=clinical_output.clinical_intake,
        primary_concern=clinical_output.primary_concern,
        key_symptoms=clinical_output.key_symptoms,
        severity_assessment=clinical_output.severity_assessment,
        recommended_actions=clinical_output.recommended_actions,
        cited_sources=clinical_output.cited_sources,
        guiding_questions=clinical_output.guiding_questions,
    )

    # Step 7: Format condition matches
    condition_matches = [
        ConditionMatch(
            condition=m.get("condition", ""),
            similarity_score=round(m.get("score", 0.0), 4),
            pmcid=m.get("pmcid", ""),
            title=m.get("title", ""),
            snippet=m.get("snippet", ""),
        )
        for m in raw_matches
    ]

    # Step 8: Update patient record with the new primary concern
    try:
        mongo_client = request.app.state.mongo_client
        db = mongo_client[request.app.state.settings.MONGODB_DB_NAME]
        db.patients.update_one(
            {"id": payload.patient_id},
            {"$set": {"concern": clinical_brief.primary_concern}}
        )
    except Exception as e:
        print(f"Warning: Failed to update patient concern: {e}")

    return AnalysisResponse(
        patient_id=payload.patient_id,
        clinical_brief=clinical_brief,
        biometric_deltas=biometric_deltas,
        condition_matches=condition_matches,
        risk_profile=getattr(payload, "risk_profile", None),
    )
