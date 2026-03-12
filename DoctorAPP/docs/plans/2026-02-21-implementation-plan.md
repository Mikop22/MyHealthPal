# Diagnostic Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack healthcare advocacy dashboard that transforms patient narratives + Apple Watch biometrics into objective clinical evidence via LLM extraction, PubMedBERT embeddings, and MongoDB Atlas vector search.

**Architecture:** FastAPI backend with 3 services (LLM extraction, PubMedBERT embeddings, MongoDB vector search) behind 2 endpoints. Next.js 15 frontend with mock data injection for parallel development. 4-agent team: lead (coordinator), backend-engineer, frontend-engineer, research-agent.

**Tech Stack:** FastAPI, LangChain, GPT-4o, sentence-transformers (ModernPubMedBERT), MongoDB Atlas $vectorSearch, Next.js 15, TypeScript, Tailwind CSS, Recharts.

---

## Phase 0: Scaffolding (team-lead)

### Task 0.1: Create .gitignore and project structure

**Files:**
- Create: `.gitignore`
- Create: `back-end/.gitkeep` (remove later)
- Create: `front-end/.gitkeep` (remove later)

**Step 1: Create .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
.env
venv/
.venv/
*.egg-info/
dist/

# Node
node_modules/
.next/
out/
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Secrets
apikeys.txt

# Agent worktrees
.claude/worktrees/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore for Python/Node/secrets"
```

---

### Task 0.2: Create shared API contract types

**Files:**
- Create: `shared/api-contract.ts`
- Create: `shared/api_contract.py`

**Step 1: Create TypeScript contract**

```typescript
// shared/api-contract.ts
// Canonical API types — backend Python mirrors these exactly.

export interface MetricDataPoint {
  date: string;
  value: number;
  unit: string;
  flag?: string;
}

export interface LongitudinalDataPoint {
  week_start: string;
  value: number;
  unit: string;
  trend?: string;
}

export interface AcuteMetrics {
  heartRateVariabilitySDNN: MetricDataPoint[];
  restingHeartRate: MetricDataPoint[];
  appleSleepingWristTemperature: MetricDataPoint[];
  respiratoryRate: MetricDataPoint[];
  walkingAsymmetryPercentage: MetricDataPoint[];
  stepCount: MetricDataPoint[];
  sleepAnalysis_awakeSegments: MetricDataPoint[];
}

export interface LongitudinalMetrics {
  restingHeartRate: LongitudinalDataPoint[];
  walkingAsymmetryPercentage: LongitudinalDataPoint[];
}

export interface PatientPayload {
  patient_id: string;
  sync_timestamp: string;
  hardware_source: string;
  patient_narrative: string;
  data: {
    acute_7_day: {
      granularity: string;
      metrics: AcuteMetrics;
    };
    longitudinal_6_month: {
      granularity: string;
      metrics: LongitudinalMetrics;
    };
  };
}

export interface ClinicalBrief {
  summary: string;
  key_symptoms: string[];
  severity_assessment: string;
  recommended_actions: string[];
}

export interface BiometricDelta {
  metric: string;
  acute_avg: number;
  longitudinal_avg: number;
  delta: number;
  unit: string;
  clinically_significant: boolean;
}

export interface ConditionMatch {
  condition: string;
  similarity_score: number;
  pmcid: string;
  title: string;
  snippet: string;
}

export interface AnalysisResponse {
  patient_id: string;
  clinical_brief: ClinicalBrief;
  biometric_deltas: BiometricDelta[];
  condition_matches: ConditionMatch[];
}
```

**Step 2: Create Python contract**

```python
# shared/api_contract.py
"""Canonical API types — frontend TypeScript mirrors these exactly."""

from pydantic import BaseModel
from typing import Union


class MetricDataPoint(BaseModel):
    date: str
    value: float
    unit: str
    flag: Union[str, None] = None


class LongitudinalDataPoint(BaseModel):
    week_start: str
    value: float
    unit: str
    trend: Union[str, None] = None


class AcuteMetrics(BaseModel):
    heartRateVariabilitySDNN: list[MetricDataPoint]
    restingHeartRate: list[MetricDataPoint]
    appleSleepingWristTemperature: list[MetricDataPoint]
    respiratoryRate: list[MetricDataPoint]
    walkingAsymmetryPercentage: list[MetricDataPoint]
    stepCount: list[MetricDataPoint]
    sleepAnalysis_awakeSegments: list[MetricDataPoint]


class LongitudinalMetrics(BaseModel):
    restingHeartRate: list[LongitudinalDataPoint]
    walkingAsymmetryPercentage: list[LongitudinalDataPoint]


class AcuteData(BaseModel):
    granularity: str
    metrics: AcuteMetrics


class LongitudinalData(BaseModel):
    granularity: str
    metrics: LongitudinalMetrics


class PatientData(BaseModel):
    acute_7_day: AcuteData
    longitudinal_6_month: LongitudinalData


class PatientPayload(BaseModel):
    patient_id: str
    sync_timestamp: str
    hardware_source: str
    patient_narrative: str
    data: PatientData


class ClinicalBrief(BaseModel):
    summary: str
    key_symptoms: list[str]
    severity_assessment: str
    recommended_actions: list[str]


class BiometricDelta(BaseModel):
    metric: str
    acute_avg: float
    longitudinal_avg: float
    delta: float
    unit: str
    clinically_significant: bool


class ConditionMatch(BaseModel):
    condition: str
    similarity_score: float
    pmcid: str
    title: str
    snippet: str


class AnalysisResponse(BaseModel):
    patient_id: str
    clinical_brief: ClinicalBrief
    biometric_deltas: list[BiometricDelta]
    condition_matches: list[ConditionMatch]
```

**Step 3: Commit**

```bash
git add shared/
git commit -m "feat: add shared API contract types (TypeScript + Python)"
```

---

### Task 0.3: Create .env.example and .env files

**Files:**
- Create: `back-end/.env.example`
- Create: `back-end/.env` (from apikeys.txt, gitignored)

**Step 1: Create .env.example**

```env
OPENAI_API_KEY=sk-proj-...
HUGGINGFACE_TOKEN=hf_...
PUBMED_API_KEY=...
MONGODB_USER=...
MONGODB_PASS=...
MONGODB_CLUSTER=cluster0.xxxxx.mongodb.net
MONGODB_DB_NAME=diagnostic
MONGODB_APP_NAME=Cluster0
```

**Step 2: Create .env with real values from apikeys.txt**

Read `apikeys.txt` and populate `.env` with actual credentials. Note: the MongoDB connection string format is:
```
mongodb+srv://{user}:{pass}@{cluster}/{db}?retryWrites=true&w=majority&appName={appName}
```

The MongoDB cluster hostname needs to be determined — check Atlas dashboard or use the credentials to construct the URI.

**Step 3: Commit .env.example only**

```bash
git add back-end/.env.example
git commit -m "chore: add .env.example with credential placeholders"
```

---

### Task 0.4: Create agent definition files

**Files:**
- Create: `.claude/agents/backend-engineer.md`
- Create: `.claude/agents/frontend-engineer.md`
- Create: `.claude/agents/research-agent.md`

**Step 1: Create backend-engineer agent**

```markdown
---
name: backend-engineer
description: "FastAPI backend engineer for the Diagnostic platform. Builds the Python API with LangChain/GPT-4o extraction, PubMedBERT embeddings, and MongoDB Atlas vector search. Only modifies files in back-end/."
model: opus
memory: project
---

You are a senior Python/FastAPI backend engineer building the Diagnostic healthcare platform.

## Your Scope
- You ONLY modify files in the `back-end/` directory
- Read shared types from `shared/api_contract.py` but do NOT modify them
- Read `testpayload.json` for mock data reference but do NOT modify it

## Tech Stack
- FastAPI with async routes
- LangChain + GPT-4o for structured clinical extraction
- sentence-transformers with lokeshch19/ModernPubMedBERT for embeddings
- MongoDB Atlas with $vectorSearch
- Pydantic v2 for validation

## Critical Gotchas
- Set `os.environ["TOKENIZERS_PARALLELISM"] = "false"` BEFORE any imports in main.py
- Load PubMedBERT model once in FastAPI lifespan context manager, store in app.state
- $vectorSearch MUST be the first stage in any MongoDB aggregation pipeline
- Use `Union[T, None]` not `Optional[T]` for LangChain strict mode compatibility
- Use GPT-4o (model="gpt-4o") with `with_structured_output(strict=True)`

## Credentials
- Load from `back-end/.env` using python-dotenv
- NEVER hardcode API keys

## Run Command
`cd back-end && uvicorn app.main:app --reload --port 8000`
```

**Step 2: Create frontend-engineer agent**

```markdown
---
name: frontend-engineer
description: "Next.js frontend engineer for the Diagnostic platform. Builds the clinical physician dashboard with Tailwind CSS and Recharts biometric visualizations. Only modifies files in front-end/."
model: opus
memory: project
---

You are a senior Next.js/React frontend engineer building the Diagnostic clinical dashboard.

## Your Scope
- You ONLY modify files in the `front-end/` directory
- Read shared types from `shared/api-contract.ts` and copy them into your project's types
- Read `testpayload.json` for mock data injection

## Tech Stack
- Next.js 15 with App Router and TypeScript
- Tailwind CSS with clinical high-contrast palette
- Recharts for biometric chart visualization
- Feature-based colocation pattern

## Design Requirements
- F-pattern physician dashboard layout (primary metrics top-left, actions top-right)
- No default grid lines on charts — keep UI pristine
- Clinical color palette: slate-900 text, white backgrounds, emerald-600 (normal), amber-500 (caution), red-600 (critical)
- Components must show delta calculations: Acute 7-Day Average vs Longitudinal 26-Week Average
- Dashed ReferenceLine on charts showing the longitudinal baseline

## Key Components
1. `<DeltaBadge />` — metric pill with delta math and clinical significance flag
2. `<BiometricGhostChart />` — ComposedChart with ReferenceLine overlay
3. `<DiagnosticNudgeAccordion />` — expandable condition matches with embedded PDF iframe

## Run Command
`cd front-end && npm run dev`
```

**Step 3: Create research-agent (already exists as web-research, update description)**

The existing `web-research.md` agent serves this purpose. No changes needed.

**Step 4: Commit**

```bash
git add .claude/agents/backend-engineer.md .claude/agents/frontend-engineer.md
git commit -m "feat: add backend-engineer and frontend-engineer agent definitions"
```

---

## Phase 1A: Backend (backend-engineer)

### Task 1.1: Scaffold FastAPI project

**Files:**
- Create: `back-end/requirements.txt`
- Create: `back-end/app/__init__.py`
- Create: `back-end/app/main.py`
- Create: `back-end/app/config.py`

**Step 1: Create requirements.txt**

```txt
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
python-dotenv>=1.0.0
langchain>=0.3.0
langchain-openai>=0.3.0
sentence-transformers>=3.0.0
pymongo[srv]>=4.10.0
httpx>=0.28.0
pydantic>=2.10.0
```

**Step 2: Create app/config.py**

```python
"""Application configuration loaded from environment."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    HUGGINGFACE_TOKEN: str = os.getenv("HUGGINGFACE_TOKEN", "")
    PUBMED_API_KEY: str = os.getenv("PUBMED_API_KEY", "")
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "diagnostic")


settings = Settings()
```

**Step 3: Create app/main.py**

```python
"""Diagnostic API — main FastAPI application."""

import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"  # Must be before any ML imports

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load ML models
    from app.services.embeddings import load_embedding_model
    app.state.embedding_model = load_embedding_model()
    yield
    # Shutdown: cleanup


app = FastAPI(
    title="Diagnostic API",
    description="Healthcare advocacy platform — clinical data pipeline",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 4: Create virtual environment and install deps**

```bash
cd back-end && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

**Step 5: Verify server starts**

```bash
cd back-end && source venv/bin/activate && uvicorn app.main:app --reload --port 8000 &
curl http://localhost:8000/health
# Expected: {"status":"ok"}
kill %1
```

**Step 6: Commit**

```bash
git add back-end/requirements.txt back-end/app/
git commit -m "feat(backend): scaffold FastAPI project with lifespan + CORS"
```

---

### Task 1.2: Pydantic models for payload validation

**Files:**
- Create: `back-end/app/models/__init__.py`
- Create: `back-end/app/models/patient.py`

**Step 1: Copy shared contract into backend models**

Copy from `shared/api_contract.py` into `back-end/app/models/patient.py`. The models are already fully defined in T0.2 — import and re-export them. Add the patient_narrative field to the payload.

```python
# back-end/app/models/patient.py
"""Patient payload and response models."""

from pydantic import BaseModel
from typing import Union


class MetricDataPoint(BaseModel):
    date: str
    value: float
    unit: str
    flag: Union[str, None] = None


class LongitudinalDataPoint(BaseModel):
    week_start: str
    value: float
    unit: str
    trend: Union[str, None] = None


class AcuteMetrics(BaseModel):
    heartRateVariabilitySDNN: list[MetricDataPoint]
    restingHeartRate: list[MetricDataPoint]
    appleSleepingWristTemperature: list[MetricDataPoint]
    respiratoryRate: list[MetricDataPoint]
    walkingAsymmetryPercentage: list[MetricDataPoint]
    stepCount: list[MetricDataPoint]
    sleepAnalysis_awakeSegments: list[MetricDataPoint]


class LongitudinalMetrics(BaseModel):
    restingHeartRate: list[LongitudinalDataPoint]
    walkingAsymmetryPercentage: list[LongitudinalDataPoint]


class AcuteData(BaseModel):
    granularity: str
    metrics: AcuteMetrics


class LongitudinalData(BaseModel):
    granularity: str
    metrics: LongitudinalMetrics


class PatientData(BaseModel):
    acute_7_day: AcuteData
    longitudinal_6_month: LongitudinalData


class PatientPayload(BaseModel):
    patient_id: str
    sync_timestamp: str
    hardware_source: str
    patient_narrative: str
    data: PatientData


class ClinicalBrief(BaseModel):
    summary: str
    key_symptoms: list[str]
    severity_assessment: str
    recommended_actions: list[str]


class BiometricDelta(BaseModel):
    metric: str
    acute_avg: float
    longitudinal_avg: float
    delta: float
    unit: str
    clinically_significant: bool


class ConditionMatch(BaseModel):
    condition: str
    similarity_score: float
    pmcid: str
    title: str
    snippet: str


class AnalysisResponse(BaseModel):
    patient_id: str
    clinical_brief: ClinicalBrief
    biometric_deltas: list[BiometricDelta]
    condition_matches: list[ConditionMatch]
```

**Step 2: Verify models parse the test payload**

```bash
cd back-end && source venv/bin/activate && python3 -c "
from app.models.patient import PatientPayload
import json
with open('../testpayload.json') as f:
    data = json.load(f)
data['patient_narrative'] = 'Test narrative'
p = PatientPayload(**data)
print(f'Parsed OK: {p.patient_id}, {len(p.data.acute_7_day.metrics.restingHeartRate)} RHR points')
"
```

Expected: `Parsed OK: pt_883920_x, 7 RHR points`

**Step 3: Commit**

```bash
git add back-end/app/models/
git commit -m "feat(backend): add Pydantic models for patient payload + API response"
```

---

### Task 1.3: LLM extraction service

**Files:**
- Create: `back-end/app/services/__init__.py`
- Create: `back-end/app/services/llm_extractor.py`

**Step 1: Create the LLM extraction service**

```python
# back-end/app/services/llm_extractor.py
"""LLM-based clinical brief extraction using LangChain + GPT-4o."""

from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from typing import Union
from app.config import settings


class ClinicalBriefOutput(BaseModel):
    """Structured output schema for GPT-4o extraction."""
    summary: str
    key_symptoms: list[str]
    severity_assessment: str
    recommended_actions: list[str]


SYSTEM_PROMPT = """You are a clinical data analyst specializing in women's health.
Given a patient's narrative description of their symptoms along with their biometric data summary,
produce a structured clinical brief.

Focus on:
1. Objective symptom identification from the narrative
2. Correlation between reported symptoms and biometric anomalies
3. Severity assessment based on delta between acute and baseline metrics
4. Evidence-based recommended diagnostic actions

Be clinical, precise, and advocacy-oriented. This brief will be presented to a physician
to combat potential dismissal of the patient's pain experience."""


async def extract_clinical_brief(
    narrative: str,
    biometric_summary: str,
) -> ClinicalBriefOutput:
    """Extract a structured clinical brief from patient narrative + biometrics."""
    llm = ChatOpenAI(
        model="gpt-5.2-2025-12-11",
        api_key=settings.OPENAI_API_KEY,
        temperature=0.1,
    )
    structured_llm = llm.with_structured_output(ClinicalBriefOutput, strict=True)

    user_message = f"""## Patient Narrative
{narrative}

## Biometric Data Summary
{biometric_summary}

Produce the clinical brief."""

    result = await structured_llm.ainvoke([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ])
    return result
```

**Step 2: Test the extraction (requires OPENAI_API_KEY)**

```bash
cd back-end && source venv/bin/activate && python3 -c "
import asyncio
from app.services.llm_extractor import extract_clinical_brief

async def test():
    result = await extract_clinical_brief(
        narrative='Severe pelvic pain for 4 days, can barely walk.',
        biometric_summary='RHR jumped from 62 to 78 bpm. HRV dropped from 48 to 22 ms.'
    )
    print(f'Summary: {result.summary[:100]}...')
    print(f'Symptoms: {result.key_symptoms}')

asyncio.run(test())
"
```

Expected: Structured output with summary, symptoms, severity, and actions.

**Step 3: Commit**

```bash
git add back-end/app/services/
git commit -m "feat(backend): add LLM clinical brief extraction service (GPT-4o)"
```

---

### Task 1.4: PubMedBERT embedding service

**Files:**
- Create: `back-end/app/services/embeddings.py`

**Step 1: Create the embedding service**

```python
# back-end/app/services/embeddings.py
"""PubMedBERT embedding service using sentence-transformers."""

from sentence_transformers import SentenceTransformer
from app.config import settings
import os


def load_embedding_model() -> SentenceTransformer:
    """Load ModernPubMedBERT model. Call once at startup."""
    if settings.HUGGINGFACE_TOKEN:
        os.environ["HF_TOKEN"] = settings.HUGGINGFACE_TOKEN
    model = SentenceTransformer("lokeshch19/ModernPubMedBERT")
    return model


def encode_text(model: SentenceTransformer, text: str) -> list[float]:
    """Encode clinical text into a dense vector."""
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()
```

**Step 2: Test embedding generation**

```bash
cd back-end && source venv/bin/activate && python3 -c "
from app.services.embeddings import load_embedding_model, encode_text
model = load_embedding_model()
vec = encode_text(model, 'endometriosis pelvic pain dysmenorrhea')
print(f'Embedding dim: {len(vec)}, first 5: {vec[:5]}')
"
```

Expected: `Embedding dim: 768` (or similar), with float values.

**Step 3: Commit**

```bash
git add back-end/app/services/embeddings.py
git commit -m "feat(backend): add PubMedBERT embedding service"
```

---

### Task 1.5: MongoDB Atlas vector search service

**Files:**
- Create: `back-end/app/services/vector_search.py`

**Step 1: Create the vector search service**

```python
# back-end/app/services/vector_search.py
"""MongoDB Atlas vector search service."""

from pymongo import MongoClient
from app.config import settings


def get_mongo_client() -> MongoClient:
    """Create MongoDB client."""
    return MongoClient(settings.MONGODB_URI)


def get_collection(client: MongoClient, collection_name: str = "medical_conditions"):
    """Get the medical conditions collection."""
    db = client[settings.MONGODB_DB_NAME]
    return db[collection_name]


async def search_conditions(
    client: MongoClient,
    query_vector: list[float],
    top_k: int = 5,
) -> list[dict]:
    """Run $vectorSearch against the medical_conditions collection.

    Requires a Vector Search index named "vector_index" on the
    "embedding" field with cosine similarity.
    """
    collection = get_collection(client)

    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": top_k * 20,
                "limit": top_k,
            }
        },
        {
            "$project": {
                "condition": 1,
                "title": 1,
                "snippet": 1,
                "pmcid": 1,
                "score": {"$meta": "vectorSearchScore"},
                "_id": 0,
            }
        },
    ]

    results = list(collection.aggregate(pipeline))
    return results
```

**Step 2: Verify MongoDB connection**

```bash
cd back-end && source venv/bin/activate && python3 -c "
from app.services.vector_search import get_mongo_client
client = get_mongo_client()
dbs = client.list_database_names()
print(f'Connected! Databases: {dbs}')
client.close()
"
```

Expected: Connection succeeds, lists available databases.

**Step 3: Commit**

```bash
git add back-end/app/services/vector_search.py
git commit -m "feat(backend): add MongoDB Atlas vector search service"
```

---

### Task 1.6: POST /api/v1/analyze-patient endpoint

**Files:**
- Create: `back-end/app/routes/__init__.py`
- Create: `back-end/app/routes/analyze.py`
- Modify: `back-end/app/main.py` (add router)

**Step 1: Create the analyze route**

```python
# back-end/app/routes/analyze.py
"""POST /api/v1/analyze-patient — main analysis endpoint."""

from fastapi import APIRouter, Request
from app.models.patient import (
    PatientPayload,
    AnalysisResponse,
    ClinicalBrief,
    BiometricDelta,
    ConditionMatch,
)
from app.services.llm_extractor import extract_clinical_brief
from app.services.embeddings import encode_text
from app.services.vector_search import search_conditions, get_mongo_client

router = APIRouter(prefix="/api/v1", tags=["analysis"])


def compute_biometric_deltas(payload: PatientPayload) -> list[BiometricDelta]:
    """Calculate acute vs longitudinal deltas for overlapping metrics."""
    deltas = []
    acute = payload.data.acute_7_day.metrics
    longitudinal = payload.data.longitudinal_6_month.metrics

    # Metrics that exist in both acute and longitudinal
    metric_pairs = [
        ("restingHeartRate", acute.restingHeartRate, longitudinal.restingHeartRate, "bpm", 5.0),
        ("walkingAsymmetryPercentage", acute.walkingAsymmetryPercentage, longitudinal.walkingAsymmetryPercentage, "%", 3.0),
    ]

    for name, acute_data, long_data, unit, threshold in metric_pairs:
        acute_avg = sum(d.value for d in acute_data) / len(acute_data)
        long_avg = sum(d.value for d in long_data) / len(long_data)
        delta = round(acute_avg - long_avg, 2)
        deltas.append(BiometricDelta(
            metric=name,
            acute_avg=round(acute_avg, 2),
            longitudinal_avg=round(long_avg, 2),
            delta=delta,
            unit=unit,
            clinically_significant=abs(delta) > threshold,
        ))

    # Acute-only metrics (no longitudinal baseline — use first 3 days as "baseline")
    acute_only = [
        ("heartRateVariabilitySDNN", acute.heartRateVariabilitySDNN, "ms", 10.0),
        ("respiratoryRate", acute.respiratoryRate, "breaths/min", 2.0),
        ("stepCount", acute.stepCount, "count", 3000),
        ("sleepAnalysis_awakeSegments", acute.sleepAnalysis_awakeSegments, "count", 2.0),
        ("appleSleepingWristTemperature", acute.appleSleepingWristTemperature, "degC_deviation", 0.5),
    ]

    for name, data, unit, threshold in acute_only:
        baseline = sum(d.value for d in data[:3]) / 3
        acute_avg = sum(d.value for d in data[3:]) / max(len(data[3:]), 1)
        delta = round(acute_avg - baseline, 2)
        deltas.append(BiometricDelta(
            metric=name,
            acute_avg=round(acute_avg, 2),
            longitudinal_avg=round(baseline, 2),
            delta=delta,
            unit=unit,
            clinically_significant=abs(delta) > threshold,
        ))

    return deltas


def format_biometric_summary(deltas: list[BiometricDelta]) -> str:
    """Format deltas into a human-readable summary for the LLM."""
    lines = []
    for d in deltas:
        sig = " [CLINICALLY SIGNIFICANT]" if d.clinically_significant else ""
        lines.append(f"- {d.metric}: acute avg {d.acute_avg} {d.unit}, "
                     f"baseline {d.longitudinal_avg} {d.unit}, "
                     f"delta {d.delta:+.2f}{sig}")
    return "\n".join(lines)


@router.post("/analyze-patient", response_model=AnalysisResponse)
async def analyze_patient(payload: PatientPayload, request: Request):
    """Full analysis pipeline: deltas -> LLM brief -> embeddings -> vector search."""

    # 1. Compute biometric deltas
    deltas = compute_biometric_deltas(payload)
    biometric_summary = format_biometric_summary(deltas)

    # 2. Extract clinical brief via LLM
    brief_output = await extract_clinical_brief(
        narrative=payload.patient_narrative,
        biometric_summary=biometric_summary,
    )
    clinical_brief = ClinicalBrief(
        summary=brief_output.summary,
        key_symptoms=brief_output.key_symptoms,
        severity_assessment=brief_output.severity_assessment,
        recommended_actions=brief_output.recommended_actions,
    )

    # 3. Generate embedding from clinical brief
    embedding_model = request.app.state.embedding_model
    embed_text = f"{clinical_brief.summary} {' '.join(clinical_brief.key_symptoms)}"
    query_vector = encode_text(embedding_model, embed_text)

    # 4. Vector search for condition matches
    mongo_client = get_mongo_client()
    try:
        raw_matches = await search_conditions(mongo_client, query_vector)
    finally:
        mongo_client.close()

    condition_matches = [
        ConditionMatch(
            condition=m.get("condition", "Unknown"),
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
        biometric_deltas=deltas,
        condition_matches=condition_matches,
    )
```

**Step 2: Register router in main.py**

Add to `back-end/app/main.py` after the CORS middleware:

```python
from app.routes.analyze import router as analyze_router
app.include_router(analyze_router)
```

**Step 3: Test endpoint with curl**

```bash
cd back-end && source venv/bin/activate && uvicorn app.main:app --reload --port 8000 &
sleep 3

curl -X POST http://localhost:8000/api/v1/analyze-patient \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "patient_id": "pt_883920_x",
  "sync_timestamp": "2026-02-21T12:35:39Z",
  "hardware_source": "Apple Watch Series 9",
  "patient_narrative": "I've been experiencing severe pelvic pain for 4 days.",
  "data": ... (use testpayload.json data field)
}
EOF

kill %1
```

Expected: JSON response with clinical_brief, biometric_deltas, and condition_matches.

**Step 4: Commit**

```bash
git add back-end/app/routes/ back-end/app/main.py
git commit -m "feat(backend): add POST /api/v1/analyze-patient endpoint"
```

---

### Task 1.7: GET /api/v1/paper/{pmcid} proxy endpoint

**Files:**
- Create: `back-end/app/routes/paper.py`
- Modify: `back-end/app/main.py` (add router)

**Step 1: Create the paper proxy route**

```python
# back-end/app/routes/paper.py
"""GET /api/v1/paper/{pmcid} — NCBI PDF proxy to bypass CORS."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import httpx

router = APIRouter(prefix="/api/v1", tags=["papers"])

NCBI_PDF_URL = "https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/"


@router.get("/paper/{pmcid}")
async def proxy_paper(pmcid: str):
    """Stream a PubMed Central PDF, bypassing CORS restrictions."""
    url = NCBI_PDF_URL.format(pmcid=pmcid)

    async def stream_pdf():
        async with httpx.AsyncClient(follow_redirects=True) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"NCBI returned {response.status_code} for {pmcid}",
                    )
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    yield chunk

    return StreamingResponse(
        stream_pdf(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={pmcid}.pdf",
            "Access-Control-Allow-Origin": "http://localhost:3000",
        },
    )
```

**Step 2: Register router in main.py**

Add to `back-end/app/main.py`:

```python
from app.routes.paper import router as paper_router
app.include_router(paper_router)
```

**Step 3: Test with a known PMCID**

```bash
cd back-end && source venv/bin/activate && uvicorn app.main:app --reload --port 8000 &
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/paper/PMC6263431
# Expected: 200
kill %1
```

**Step 4: Commit**

```bash
git add back-end/app/routes/paper.py back-end/app/main.py
git commit -m "feat(backend): add GET /api/v1/paper/{pmcid} NCBI PDF proxy"
```

---

## Phase 1B: Frontend (frontend-engineer, parallel with 1A)

### Task 2.1: Scaffold Next.js 15 project

**Step 1: Create Next.js app**

```bash
cd front-end && npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults for all prompts.

**Step 2: Install Recharts**

```bash
cd front-end && npm install recharts
```

**Step 3: Verify dev server starts**

```bash
cd front-end && npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200
kill %1
```

**Step 4: Commit**

```bash
git add front-end/
git commit -m "feat(frontend): scaffold Next.js 15 with TypeScript, Tailwind, Recharts"
```

---

### Task 2.2: Mock payload state injection + types

**Files:**
- Create: `front-end/src/lib/types.ts`
- Create: `front-end/src/lib/mock-data.ts`

**Step 1: Create TypeScript types**

Copy the types from `shared/api-contract.ts` into `front-end/src/lib/types.ts`. Add mock condition matches since we won't have the backend yet:

```typescript
// front-end/src/lib/types.ts
// (copy all interfaces from shared/api-contract.ts)
// ... plus add:

export const MOCK_CONDITION_MATCHES: ConditionMatch[] = [
  {
    condition: "Endometriosis",
    similarity_score: 0.9412,
    pmcid: "PMC6263431",
    title: "Endometriosis: Pathogenesis, diagnosis, and treatment",
    snippet: "Chronic pelvic pain with acute exacerbation, elevated inflammatory markers, and mobility impairment consistent with deep infiltrating endometriosis.",
  },
  {
    condition: "Uterine Fibroids",
    similarity_score: 0.8734,
    pmcid: "PMC5914402",
    title: "Uterine Fibroids: Current perspectives",
    snippet: "Heavy menstrual bleeding, pelvic pressure, and pain patterns with autonomic nervous system disruption evidenced by HRV changes.",
  },
  {
    condition: "Adenomyosis",
    similarity_score: 0.8201,
    pmcid: "PMC7661568",
    title: "Adenomyosis: A systematic review of clinical features",
    snippet: "Diffuse uterine enlargement with severe dysmenorrhea and pelvic pain radiating to lower back.",
  },
];
```

**Step 2: Create mock data module**

```typescript
// front-end/src/lib/mock-data.ts
import type { PatientPayload, AnalysisResponse, BiometricDelta } from "./types";
import { MOCK_CONDITION_MATCHES } from "./types";

// Import the raw payload from testpayload.json
import rawPayload from "../../../testpayload.json";

export const MOCK_PAYLOAD: PatientPayload = {
  ...rawPayload,
  patient_narrative: "I've been experiencing severe pelvic pain for the past 4 days that started suddenly on February 18th. The pain is sharp, constant, and radiates to my lower back. I can barely walk - my steps have dropped dramatically. I'm waking up 5-6 times a night from the pain. My Apple Watch is showing my heart rate is way higher than normal and my HRV crashed. I've had similar episodes before but doctors keep telling me it's just period cramps. I have a family history of endometriosis and uterine fibroids. The pain is NOT normal period pain - it's debilitating and affects my ability to work and care for my children.",
} as PatientPayload;

// Pre-computed deltas matching the backend logic
export const MOCK_DELTAS: BiometricDelta[] = [
  { metric: "restingHeartRate", acute_avg: 69.57, longitudinal_avg: 64.94, delta: 4.63, unit: "bpm", clinically_significant: false },
  { metric: "walkingAsymmetryPercentage", acute_avg: 4.6, longitudinal_avg: 2.35, delta: 2.25, unit: "%", clinically_significant: false },
  { metric: "heartRateVariabilitySDNN", acute_avg: 26.5, longitudinal_avg: 47.07, delta: -20.57, unit: "ms", clinically_significant: true },
  { metric: "respiratoryRate", acute_avg: 17.13, longitudinal_avg: 14.53, delta: 2.59, unit: "breaths/min", clinically_significant: true },
  { metric: "stepCount", acute_avg: 2050, longitudinal_avg: 8433.33, delta: -6383.33, unit: "count", clinically_significant: true },
  { metric: "sleepAnalysis_awakeSegments", acute_avg: 4.5, longitudinal_avg: 1.33, delta: 3.17, unit: "count", clinically_significant: true },
  { metric: "appleSleepingWristTemperature", acute_avg: 0.83, longitudinal_avg: -0.06, delta: 0.89, unit: "degC_deviation", clinically_significant: true },
];

export const MOCK_CLINICAL_BRIEF = {
  summary: "Patient presents with acute-onset severe pelvic pain since Feb 18, correlating with dramatic biometric deterioration across multiple physiological systems. HRV crashed 56% below baseline, resting heart rate spiked 25% above norm, step count dropped 76%, and sleep disruption increased 238%. Pattern is consistent with an acute inflammatory/pain crisis superimposed on a chronic progressive condition.",
  key_symptoms: [
    "Acute severe pelvic pain (4-day duration)",
    "Pain radiation to lower back",
    "Severe mobility impairment (guarding gait detected)",
    "Sleep disruption (painsomnia pattern)",
    "Autonomic dysregulation (HRV crash + RHR spike)",
    "Elevated wrist temperature (inflammatory marker)",
  ],
  severity_assessment: "HIGH — Multi-system physiological decompensation with objective biometric evidence. The simultaneous crash in HRV, spike in RHR, mobility drop, and sleep disruption constitute a clinical emergency pattern that warrants immediate investigation.",
  recommended_actions: [
    "Urgent pelvic ultrasound (transvaginal preferred)",
    "CBC with differential and CRP/ESR inflammatory markers",
    "CA-125 blood test",
    "Referral to gynecologist specializing in endometriosis",
    "Pain management assessment (current regimen clearly inadequate)",
  ],
};

export const MOCK_RESPONSE: AnalysisResponse = {
  patient_id: MOCK_PAYLOAD.patient_id,
  clinical_brief: MOCK_CLINICAL_BRIEF,
  biometric_deltas: MOCK_DELTAS,
  condition_matches: MOCK_CONDITION_MATCHES,
};
```

**Step 3: Verify types compile**

```bash
cd front-end && npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

```bash
git add front-end/src/lib/
git commit -m "feat(frontend): add TypeScript types and mock data with pre-computed deltas"
```

---

### Task 2.3: Dashboard layout (F-pattern)

**Files:**
- Modify: `front-end/src/app/page.tsx`
- Create: `front-end/src/app/layout-styles.ts` (if needed)

**Step 1: Build the main dashboard page**

```tsx
// front-end/src/app/page.tsx
"use client";

import { MOCK_RESPONSE, MOCK_PAYLOAD } from "@/lib/mock-data";
import { DeltaBadge } from "./_components/DeltaBadge";
import { BiometricGhostChart } from "./_components/BiometricGhostChart";
import { DiagnosticNudgeAccordion } from "./_components/DiagnosticNudgeAccordion";

export default function DashboardPage() {
  const response = MOCK_RESPONSE;
  const payload = MOCK_PAYLOAD;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Diagnostic
            </h1>
            <p className="text-sm text-slate-500">
              Patient {response.patient_id} &middot; {payload.hardware_source} &middot; Synced {new Date(payload.sync_timestamp).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-sm font-semibold rounded-full">
              {response.clinical_brief.severity_assessment.split("—")[0].trim()}
            </span>
          </div>
        </div>
      </header>

      <main className="px-8 py-6 max-w-7xl mx-auto">
        {/* Row 1: Clinical Brief */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Clinical Brief</h2>
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <p className="text-slate-800 leading-relaxed mb-4">{response.clinical_brief.summary}</p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Key Symptoms</h3>
                <ul className="space-y-1">
                  {response.clinical_brief.key_symptoms.map((s, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">&#9679;</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Recommended Actions</h3>
                <ul className="space-y-1">
                  {response.clinical_brief.recommended_actions.map((a, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">&#10003;</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Row 2: Delta Badges */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Biometric Deltas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {response.biometric_deltas.map((d) => (
              <DeltaBadge key={d.metric} delta={d} />
            ))}
          </div>
        </section>

        {/* Row 3: Ghost Charts */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">7-Day Acute Biometrics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BiometricGhostChart
              title="Resting Heart Rate"
              data={payload.data.acute_7_day.metrics.restingHeartRate}
              baselineAvg={64.94}
              unit="bpm"
              color="#ef4444"
            />
            <BiometricGhostChart
              title="HRV (SDNN)"
              data={payload.data.acute_7_day.metrics.heartRateVariabilitySDNN}
              baselineAvg={47.07}
              unit="ms"
              color="#3b82f6"
            />
            <BiometricGhostChart
              title="Step Count"
              data={payload.data.acute_7_day.metrics.stepCount}
              baselineAvg={8433}
              unit="steps"
              color="#8b5cf6"
            />
            <BiometricGhostChart
              title="Wrist Temperature Deviation"
              data={payload.data.acute_7_day.metrics.appleSleepingWristTemperature}
              baselineAvg={-0.06}
              unit="°C"
              color="#f59e0b"
            />
          </div>
        </section>

        {/* Row 4: Diagnostic Nudges */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Condition Matches (Vector Search)</h2>
          <DiagnosticNudgeAccordion matches={response.condition_matches} />
        </section>
      </main>
    </div>
  );
}
```

**Step 2: Create placeholder components** (empty stubs so the page compiles)

Create `front-end/src/app/_components/DeltaBadge.tsx`, `BiometricGhostChart.tsx`, `DiagnosticNudgeAccordion.tsx` with minimal stubs that accept props and render a div.

**Step 3: Verify page renders**

```bash
cd front-end && npm run dev
# Visit http://localhost:3000 — should show the layout structure
```

**Step 4: Commit**

```bash
git add front-end/src/app/
git commit -m "feat(frontend): add F-pattern dashboard layout with component stubs"
```

---

### Task 2.4: DeltaBadge component

**Files:**
- Create/Modify: `front-end/src/app/_components/DeltaBadge.tsx`

**Step 1: Implement DeltaBadge**

```tsx
// front-end/src/app/_components/DeltaBadge.tsx
"use client";

import type { BiometricDelta } from "@/lib/types";

const METRIC_LABELS: Record<string, string> = {
  restingHeartRate: "Resting HR",
  heartRateVariabilitySDNN: "HRV (SDNN)",
  walkingAsymmetryPercentage: "Walk Asymmetry",
  respiratoryRate: "Resp Rate",
  stepCount: "Steps",
  sleepAnalysis_awakeSegments: "Night Wakeups",
  appleSleepingWristTemperature: "Wrist Temp",
};

export function DeltaBadge({ delta }: { delta: BiometricDelta }) {
  const label = METRIC_LABELS[delta.metric] || delta.metric;
  const isSignificant = delta.clinically_significant;
  const isNegativeDelta = delta.delta < 0;

  // For metrics where a decrease is bad (HRV, steps), flip the arrow
  const invertedMetrics = ["heartRateVariabilitySDNN", "stepCount"];
  const isInverted = invertedMetrics.includes(delta.metric);
  const isBad = isInverted ? delta.delta < 0 : delta.delta > 0;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isSignificant
          ? "bg-red-50 border-red-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900">
        {delta.acute_avg} <span className="text-sm font-normal text-slate-500">{delta.unit}</span>
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isSignificant
              ? isBad
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isNegativeDelta ? "↓" : "↑"} {Math.abs(delta.delta).toFixed(1)} {delta.unit}
        </span>
        <span className="text-xs text-slate-400">
          vs {delta.longitudinal_avg} baseline
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Verify it renders**

```bash
cd front-end && npm run dev
# Check http://localhost:3000 — delta badges should render with colors
```

**Step 3: Commit**

```bash
git add front-end/src/app/_components/DeltaBadge.tsx
git commit -m "feat(frontend): add DeltaBadge component with clinical significance"
```

---

### Task 2.5: BiometricGhostChart component

**Files:**
- Create/Modify: `front-end/src/app/_components/BiometricGhostChart.tsx`

**Step 1: Implement the ghost chart**

```tsx
// front-end/src/app/_components/BiometricGhostChart.tsx
"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { MetricDataPoint } from "@/lib/types";

interface GhostChartProps {
  title: string;
  data: MetricDataPoint[];
  baselineAvg: number;
  unit: string;
  color: string;
}

export function BiometricGhostChart({
  title,
  data,
  baselineAvg,
  unit,
  color,
}: GhostChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.value,
    flag: d.flag,
  }));

  return (
    <div className="rounded-lg border border-slate-200 p-4 bg-white">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "none",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value} ${unit}`, title]}
            labelStyle={{ color: "#94a3b8" }}
          />
          {/* Baseline reference line — the "ghost" */}
          <ReferenceLine
            y={baselineAvg}
            stroke="#94a3b8"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `Baseline: ${baselineAvg} ${unit}`,
              position: "insideTopRight",
              style: { fontSize: 10, fill: "#94a3b8" },
            }}
          />
          {/* Area fill under the line */}
          <Area
            type="monotone"
            dataKey="value"
            fill={color}
            fillOpacity={0.08}
            stroke="none"
          />
          {/* Main data line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.flag) {
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: "#fff" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Verify charts render**

```bash
cd front-end && npm run dev
# Check http://localhost:3000 — should see 4 charts with dashed baseline lines
```

**Step 3: Commit**

```bash
git add front-end/src/app/_components/BiometricGhostChart.tsx
git commit -m "feat(frontend): add BiometricGhostChart with dashed baseline ReferenceLine"
```

---

### Task 2.6: DiagnosticNudgeAccordion component

**Files:**
- Create/Modify: `front-end/src/app/_components/DiagnosticNudgeAccordion.tsx`

**Step 1: Implement the accordion**

```tsx
// front-end/src/app/_components/DiagnosticNudgeAccordion.tsx
"use client";

import { useState } from "react";
import type { ConditionMatch } from "@/lib/types";

interface AccordionProps {
  matches: ConditionMatch[];
}

export function DiagnosticNudgeAccordion({ matches }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {matches.map((match, i) => {
        const isOpen = openIndex === i;
        const scorePercent = (match.similarity_score * 100).toFixed(1);

        return (
          <div key={match.pmcid} className="rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {match.condition}
                  </p>
                  <p className="text-xs text-slate-500">{match.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">
                  {scorePercent}% match
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-200">
                <div className="px-5 py-3 bg-slate-50">
                  <p className="text-sm text-slate-700">{match.snippet}</p>
                </div>
                <div className="h-[600px]">
                  <iframe
                    src={`http://localhost:8000/api/v1/paper/${match.pmcid}`}
                    className="w-full h-full border-0"
                    title={`Paper: ${match.title}`}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Verify accordion renders**

```bash
cd front-end && npm run dev
# Click an accordion item — should expand and show snippet + iframe placeholder
```

**Step 3: Commit**

```bash
git add front-end/src/app/_components/DiagnosticNudgeAccordion.tsx
git commit -m "feat(frontend): add DiagnosticNudgeAccordion with embedded PDF iframe"
```

---

### Task 2.7: Wire API calls to backend

**Files:**
- Create: `front-end/src/lib/api.ts`
- Modify: `front-end/src/app/page.tsx` (add toggle between mock and live)

**Step 1: Create API client**

```typescript
// front-end/src/lib/api.ts
import type { PatientPayload, AnalysisResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function analyzePatient(payload: PatientPayload): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/v1/analyze-patient`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function getPaperUrl(pmcid: string): string {
  return `${API_BASE}/api/v1/paper/${pmcid}`;
}
```

**Step 2: Update page.tsx to support live mode**

Add a state toggle at the top of the dashboard:
- Default: mock data (no backend needed)
- Toggle: fetch from backend API

**Step 3: Update DiagnosticNudgeAccordion iframe src to use `getPaperUrl()`**

**Step 4: Commit**

```bash
git add front-end/src/lib/api.ts front-end/src/app/page.tsx front-end/src/app/_components/DiagnosticNudgeAccordion.tsx
git commit -m "feat(frontend): wire API calls with mock/live toggle"
```

---

## Phase 2: Integration (team-lead)

### Task 3.1: End-to-end integration test

**Step 1: Start backend**

```bash
cd back-end && source venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

**Step 2: Start frontend**

```bash
cd front-end && npm run dev
```

**Step 3: Verify full flow**

1. Visit http://localhost:3000
2. Toggle to "Live" mode
3. Verify clinical brief populates from GPT-4o
4. Verify delta badges calculate correctly
5. Verify charts render with baseline reference lines
6. Click accordion item — verify PDF loads in iframe

**Step 4: Fix any integration issues**

---

### Task 3.2: Final polish and verification

**Step 1: Run type checks**

```bash
cd front-end && npx tsc --noEmit
cd back-end && source venv/bin/activate && python3 -m py_compile app/main.py
```

**Step 2: Commit final state**

```bash
git add -A
git commit -m "chore: final integration polish"
```
