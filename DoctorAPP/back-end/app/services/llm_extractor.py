"""LLM-based clinical brief extraction using GPT-4o with structured output.

Supports RAG: when retrieval_context is provided, the LLM grounds its analysis
in the retrieved medical literature and cites specific conditions/papers.
"""

from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from app.config import settings


class ClinicalBriefOutput(BaseModel):
    summary: str
    clinical_intake: str
    primary_concern: str
    key_symptoms: list[str]
    severity_assessment: str
    recommended_actions: list[str]
    cited_sources: list[str]
    guiding_questions: list[str]


SYSTEM_PROMPT = """You are a clinical data analyst specializing in women's health.
Given a patient's narrative description of their symptoms, their biometric data summary, and their biological/demographic risk profile, produce a structured clinical brief.

Focus on:
1. Translating the raw narrative into a professional `clinical_intake` (a 3-4 sentence medical history of present illness).
2. Distilling the chief complaint into a concise, maximum 5-word `primary_concern` (e.g., "Severe Menorrhagia and Pelvic Pain").
3. Objective symptom identification from the narrative.
4. Correlation between reported symptoms and biometric anomalies.
5. Severity assessment based on delta between acute and baseline metrics.
6. Evidence-based recommended diagnostic actions, aggressively weighing their explicit demographic, ancestral, and comorbidity risk factors.
7. Generating exactly 5 targeted, high-yield guiding questions the physician should ask the patient to immediately rule out or confirm the most critical conditions.

When retrieval context is provided with matching medical conditions and literature,
you MUST reference these sources in your analysis. Specifically:
- Mention which retrieved conditions align with the patient's presentation
- Cite the specific paper titles when discussing diagnostic pathways
- List all referenced sources in the cited_sources field as "Condition: Paper Title" format

Be clinical, precise, and advocacy-oriented. This brief will be presented to a physician
to combat potential dismissal of the patient's pain experience."""


async def extract_clinical_brief(
    narrative: str,
    biometric_summary: str,
    risk_summary: str = "",
    retrieval_context: str = "",
) -> ClinicalBriefOutput:
    """Call GPT-5.2 with structured output to produce a clinical brief.

    Args:
        narrative: Patient's self-reported symptom narrative.
        biometric_summary: Formatted biometric delta summary.
        risk_summary: Formatted demographic and genetic risk profile.
        retrieval_context: Optional RAG context with matched conditions and papers.
    """
    llm = ChatOpenAI(
        model="gpt-5.2-2025-12-11",
        api_key=settings.OPENAI_API_KEY,
        temperature=0.1,
    )
    structured_llm = llm.with_structured_output(
        ClinicalBriefOutput, strict=True
    )

    user_message = f"## Patient Narrative\n{narrative}\n\n"
    user_message += f"## Biometric Data Summary\n{biometric_summary}\n\n"

    if risk_summary:
        user_message += f"## Clinical Risk Profile (Demographics, Genetics, Comorbidities)\n{risk_summary}\n\n"

    if retrieval_context:
        user_message += f"## Retrieved Medical Literature (RAG Context)\n{retrieval_context}\n\n"

    user_message += "Produce the clinical brief."

    result = await structured_llm.ainvoke(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ]
    )
    return result
