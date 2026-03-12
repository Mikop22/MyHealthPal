"""Reusable analysis pipeline — orchestrates biometric deltas, embedding,
vector search, and LLM extraction into a single awaitable call.

This module re-exports the pure-function helpers from routes.analyze so the
intake orchestrator (and any future caller) can run the full pipeline without
duplicating logic.
"""

from __future__ import annotations

from pymongo import MongoClient
from sentence_transformers import SentenceTransformer

from app.models.patient import (
    PatientPayload,
    AnalysisResponse,
    ClinicalBrief,
    ConditionMatch,
)
from app.routes.analyze import (
    _compute_biometric_deltas,
    _format_biometric_summary,
    _format_retrieval_context,
)
from app.services.embeddings import encode_text
from app.services.vector_search import search_conditions
from app.services.llm_extractor import extract_clinical_brief


async def analyze_patient_pipeline(
    payload: PatientPayload,
    mongo_client: MongoClient,
    embedding_model: SentenceTransformer,
    skip_llm: bool = False,
) -> AnalysisResponse:
    """Execute the full RAG diagnostic analysis pipeline.

    Steps:
        1. Compute biometric deltas (acute vs baseline)
        2. Format biometric summary for LLM context
        3. Generate PubMedBERT embedding from narrative + biometrics
        4. Run hybrid vector search for matching conditions
        5. Build retrieval context from top matches
        6. Call GPT with RAG context → structured clinical brief
        7. Assemble and return AnalysisResponse

    Args:
        payload: Validated patient data (narrative, risk profile, biometrics).
        mongo_client: Active PyMongo client for vector search queries.
        embedding_model: Pre-loaded SentenceTransformer model.
        skip_llm: If True, skips the GPT API call and returns a placeholder brief.

    Returns:
        AnalysisResponse with clinical brief, deltas, and condition matches.
    """
    # Step 1: Compute biometric deltas
    biometric_deltas = _compute_biometric_deltas(payload)

    # Step 2: Format biometric summary for the LLM
    biometric_summary = _format_biometric_summary(biometric_deltas)

    # Step 3: Generate embedding from narrative + biometric summary
    embedding_text = payload.patient_narrative + " " + biometric_summary
    query_vector = encode_text(embedding_model, embedding_text)

    # Step 4: Run hybrid search (vector + BM25)
    raw_matches = await search_conditions(
        mongo_client,
        query_vector,
        query_text=payload.patient_narrative,
        top_k=5,
    )

    if skip_llm:
        clinical_brief = ClinicalBrief(
            summary="LLM extraction skipped for mock data generation.",
            clinical_intake="Placeholder intake.",
            primary_concern="Placeholder concern",
            key_symptoms=[],
            severity_assessment="Pending",
            recommended_actions=[],
            cited_sources=[],
            guiding_questions=[],
        )
    else:
        # Step 5: Format retrieval context from top 3 matches for RAG
        retrieval_context = _format_retrieval_context(raw_matches[:3])

        # Step 5a: Format the risk profile summary
        risk_summary_lines = []
        if payload.risk_profile and payload.risk_profile.factors:
            for f in payload.risk_profile.factors:
                risk_summary_lines.append(
                    f"- **{f.factor}** ({f.category}): {f.severity} severity. "
                    f"{f.description}"
                )
        risk_summary = "\n".join(risk_summary_lines)

        # Step 6: Call LLM with RAG context and demographic risk
        clinical_output = await extract_clinical_brief(
            narrative=payload.patient_narrative,
            biometric_summary=biometric_summary,
            risk_summary=risk_summary,
            retrieval_context=retrieval_context,
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

    return AnalysisResponse(
        patient_id=payload.patient_id,
        clinical_brief=clinical_brief,
        biometric_deltas=biometric_deltas,
        condition_matches=condition_matches,
        risk_profile=getattr(payload, "risk_profile", None),
    )
