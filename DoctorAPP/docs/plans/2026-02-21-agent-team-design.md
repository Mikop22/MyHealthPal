# Diagnostic: Agent Team & Implementation Design

**Date:** 2026-02-21
**Status:** Approved
**Approach:** 4-Agent Team (Lead + Backend + Frontend + Research)

---

## 1. Team Architecture

```
                    ┌─────────────┐
                    │  team-lead  │  (Opus - coordinator)
                    │ Coordinator │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼───┐  ┌────▼─────┐  ┌──▼───────────┐
     │  backend-  │  │ frontend-│  │   research-   │
     │  engineer  │  │ engineer │  │    agent      │
     │ (Opus)     │  │ (Opus)   │  │  (Sonnet)     │
     │ back-end/  │  │ front-end│  │  read-only    │
     └────────────┘  └──────────┘  └───────────────┘
```

### Agent Definitions

| Agent | Model | Tools | File Scope | Memory |
|-------|-------|-------|------------|--------|
| `team-lead` | opus | All | Everything | project |
| `backend-engineer` | opus | Read, Write, Edit, Bash, Glob, Grep | `back-end/` | project |
| `frontend-engineer` | opus | Read, Write, Edit, Bash, Glob, Grep | `front-end/` | project |
| `research-agent` | sonnet | Read, Glob, Grep, WebSearch, WebFetch | Read-only | project |

---

## 2. Technology Decisions

### Backend
- **Framework:** FastAPI with async routes
- **LLM:** GPT-4o via LangChain `with_structured_output(strict=True)`
- **Embeddings:** `lokeshch19/ModernPubMedBERT` via sentence-transformers (~768-dim, cosine similarity)
- **Database:** MongoDB Atlas with `$vectorSearch` (dedicated vector search index)
- **Key gotchas:**
  - Set `TOKENIZERS_PARALLELISM=false` before all imports
  - Load PubMedBERT once in FastAPI lifespan context manager
  - `$vectorSearch` must be first aggregation pipeline stage
  - Use `Union[T, None]` not `Optional[T]` for LangChain strict mode

### Frontend
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS (clinical high-contrast palette)
- **Charts:** Recharts (ComposedChart + ReferenceLine for ghost charts)
- **Layout:** F-pattern physician dashboard
- **Patterns:** Feature-based colocation, `"use client"` for interactive components

---

## 3. Task Breakdown

### Phase 0: Scaffolding (team-lead)
| Task | Description |
|------|-------------|
| T0.1 | Initialize git repo, .gitignore, project structure |
| T0.2 | Create shared API response contract (TypeScript + Python types) |
| T0.3 | Create `.env.example` with credential placeholders |
| T0.4 | Create agent definition files in `.claude/agents/` |

### Phase 1A: Backend (backend-engineer)
| Task | Description | Blocked By |
|------|-------------|------------|
| T1.1 | Scaffold FastAPI project (`app/main.py`, `requirements.txt`, `pyproject.toml`) | T0.1 |
| T1.2 | Pydantic models for payload validation (acute_7_day, longitudinal_6_month schemas) | T1.1 |
| T1.3 | LLM extraction service: LangChain + GPT-4o structured output -> ClinicalBrief | T1.1 |
| T1.4 | PubMedBERT embedding service: singleton model, encode() method | T1.1 |
| T1.5 | MongoDB Atlas vector search service: connect, $vectorSearch query, return condition matches | T1.1 |
| T1.6 | POST `/api/v1/analyze-patient` endpoint (wires T1.2-T1.5 together) | T1.2, T1.3, T1.4, T1.5 |
| T1.7 | GET `/api/v1/paper/{pmcid}` proxy endpoint (StreamingResponse from NCBI) | T1.1 |

### Phase 1B: Frontend (frontend-engineer, runs in parallel with 1A)
| Task | Description | Blocked By |
|------|-------------|------------|
| T2.1 | Scaffold Next.js 15 project (App Router, TypeScript, Tailwind, Recharts) | T0.1 |
| T2.2 | Mock payload state injection + TypeScript types matching API contract | T2.1, T0.2 |
| T2.3 | Dashboard layout: F-pattern grid, header, sidebar, main content area | T2.1 |
| T2.4 | `<DeltaBadge />`: acute avg vs longitudinal avg, colored pill, clinical significance flag | T2.2 |
| T2.5 | `<BiometricGhostChart />`: ComposedChart + dashed ReferenceLine for longitudinal baseline | T2.2 |
| T2.6 | `<DiagnosticNudgeAccordion />`: expandable condition matches + embedded PDF iframe | T2.2 |
| T2.7 | Wire API calls to backend endpoints (POST analyze, GET paper proxy) | T1.6, T1.7 |

### Phase 1C: Research (research-agent, on-demand)
| Task | Description |
|------|-------------|
| R1 | Respond to documentation/pattern queries from backend or frontend agents |

### Phase 2: Integration (team-lead)
| Task | Description | Blocked By |
|------|-------------|------------|
| T3.1 | End-to-end integration test (frontend -> backend -> MongoDB -> response) | T1.6, T2.7 |
| T3.2 | Final polish, README, verification | T3.1 |

---

## 4. Shared API Contract

### POST `/api/v1/analyze-patient` Request
Accepts the exact mock payload schema from `testpayload.json` plus a `patient_narrative` string field.

### POST `/api/v1/analyze-patient` Response
```typescript
interface AnalysisResponse {
  patient_id: string;
  clinical_brief: {
    summary: string;
    key_symptoms: string[];
    severity_assessment: string;
    recommended_actions: string[];
  };
  biometric_deltas: {
    metric: string;
    acute_avg: number;
    longitudinal_avg: number;
    delta: number;
    unit: string;
    clinically_significant: boolean;
  }[];
  condition_matches: {
    condition: string;
    similarity_score: number;
    pmcid: string;
    title: string;
    snippet: string;
  }[];
}
```

### GET `/api/v1/paper/{pmcid}` Response
Raw PDF bytes streamed with `Content-Type: application/pdf`.

---

## 5. Mock Patient Narrative

To be injected alongside the biometric data:

```
"I've been experiencing severe pelvic pain for the past 4 days that started suddenly on February 18th. The pain is sharp, constant, and radiates to my lower back. I can barely walk - my steps have dropped dramatically. I'm waking up 5-6 times a night from the pain. My Apple Watch is showing my heart rate is way higher than normal and my HRV crashed. I've had similar episodes before but doctors keep telling me it's just period cramps. I have a family history of endometriosis and uterine fibroids. The pain is NOT normal period pain - it's debilitating and affects my ability to work and care for my children."
```

---

## 6. Credentials

Available in `apikeys.txt` (will be rotated post-hackathon):
- OpenAI API key (for GPT-4o)
- HuggingFace token (for ModernPubMedBERT download)
- PubMed/NCBI API key (for paper proxy)
- MongoDB Atlas credentials (user/pass/cluster)

---

## 7. Communication Protocol

1. Team-lead creates all tasks and assigns Phase 0 to self
2. After Phase 0, team-lead assigns T1.x to backend-engineer, T2.x to frontend-engineer
3. Agents self-claim unblocked tasks from their assigned set
4. research-agent is messaged on-demand when an agent needs documentation
5. Agents message team-lead when blocked or done
6. Team-lead handles Phase 2 integration after both sides complete
7. Team-lead sends shutdown_request to all agents when complete
