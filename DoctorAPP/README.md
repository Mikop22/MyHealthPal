# Diagnostic

**A full-stack healthcare advocacy platform that translates subjective patient narratives into objective clinical evidence.**

Diagnostic combats systemic disparities for people of colour in healthcare. It merges natural language processing (NLP) with multi-modal physiological data from Apple Watch (Heart Rate Variability, Resting Heart Rate, Mobility metrics) to produce an undeniable clinical dashboard for physicians.



## Table of Contents

1. [How It Works — End-to-End](#how-it-works--end-to-end)
2. [Architecture Overview](#architecture-overview)
3. [Backend Deep Dive](#backend-deep-dive)
4. [Frontend Deep Dive](#frontend-deep-dive)
5. [Patient Intake Flow](#patient-intake-flow)
6. [XRPL Integration](#xrpl-integration)
7. [Shared API Contract](#shared-api-contract)
8. [Data Models](#data-models)
9. [The Mock Payload](#the-mock-payload)
10. [Design System — Liquid Glass](#design-system--liquid-glass)
11. [Getting Started](#getting-started)
12. [Deployment](#deployment)
13. [Project Structure](#project-structure)
14. [Testing](#testing)

---

## How It Works — End-to-End

The platform operates as a **Retrieval-Augmented Generation (RAG) diagnostic pipeline**. Here is the complete data flow from patient input to physician dashboard:

### Step 1: Patient Data Ingestion

A patient's Apple Watch continuously collects biometric data (HRV, resting heart rate, wrist temperature, respiratory rate, walking asymmetry, step count, sleep disruptions). This data is paired with a free-text narrative where the patient describes their symptoms in their own words. Together, these form a `PatientPayload`:

```
PatientPayload
├── patient_id
├── patient_narrative      ← free-text symptom description
├── risk_profile           ← genetic/demographic/comorbidity factors
└── data
    ├── acute_7_day        ← daily biometric readings for the past 7 days
    └── longitudinal_6_month ← weekly averages over the past 26 weeks
```

### Step 2: Biometric Delta Computation

The backend computes **deltas** — the mathematical difference between the patient's acute (recent) state and their own historical baseline. This transforms raw numbers into clinically meaningful deviations:

- **Shared metrics** (resting heart rate, walking asymmetry): The 7-day daily average is compared against the 26-week longitudinal average.
- **Acute-only metrics** (HRV, respiratory rate, step count, sleep disruptions, wrist temperature): The 7-day window is split into baseline (first 3 days) vs. acute (last 4 days).

Each delta is checked against clinically significant thresholds (e.g., resting heart rate jump > 5 bpm, step count drop > 3000 steps).

### Step 3: PubMedBERT Embedding

The patient's narrative and the computed biometric summary are concatenated and encoded into a **768-dimensional embedding vector** using `lokeshch19/ModernPubMedBERT` (a domain-specific BERT model pre-trained on biomedical literature). This places the patient's clinical presentation into medical semantic space.

### Step 4: MongoDB Atlas Hybrid Search

The embedding vector is used to query a MongoDB Atlas collection of medical conditions via **hybrid search**:

- **`$vectorSearch`**: Semantic similarity against pre-computed condition embeddings (cosine similarity).
- **`$search` (BM25)**: Traditional keyword matching against condition names, paper titles, and clinical snippets.
- **`$rankFusion`**: Reciprocal Rank Fusion merges both result sets, producing better matches than either method alone.

The top 5 matching conditions are returned, each with a condition name, a PubMed paper reference (PMCID), a clinical snippet, and a similarity score.

### Step 5: RAG-Augmented LLM Extraction

The top 3 condition matches are formatted as **retrieval context** and passed alongside the patient narrative, biometric summary, and demographic risk profile to GPT (via LangChain). The LLM is prompted to:

1. Identify objective symptoms from the narrative.
2. Correlate symptoms with biometric anomalies.
3. Assess severity based on deltas.
4. Recommend diagnostic actions weighted by demographic/genetic risk factors.
5. Generate 5 targeted guiding questions for the physician.
6. **Cite the retrieved medical literature** in its analysis.

The output is a **structured `ClinicalBrief`** — not free-form text — enforced via Pydantic structured output with `strict=True`.

### Step 6: Physician Dashboard Rendering

The Next.js frontend receives the `AnalysisResponse` and renders the F-pattern physician dashboard:

- **Guiding Questions panel**: The 5 high-yield questions the physician should ask immediately.
- **Symptoms panel**: Objective symptoms identified by the LLM from the narrative.
- **Key Deltas cards**: The top 3 clinically significant biometric deviations, each showing the acute value, the delta arrow, and the baseline reference.
- **Biometric Ghost Charts**: Recharts `ComposedChart` visualizations with a dashed **ReferenceLine** showing the longitudinal baseline — making acute deviation visually undeniable.
- **Risk Profile**: Dynamic horizontal bars colored by severity (High = red, Elevated = purple, Moderate = lavender) derived from the patient's genetic/demographic risk factors.
- **Possible Diagnosis**: Condition matches from the vector search, with similarity scores and expandable accordions embedding the referenced PubMed papers as PDFs (proxied through the backend to bypass CORS).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                 │
│  App Router · TypeScript · Tailwind CSS · Recharts       │
│                                                          │
│  /patients         → Patient list, add, schedule         │
│  /dashboard/[id]   → F-pattern physician dashboard       │
│  /intake/[token]   → Patient intake form + Apple Health  │
│  /notes/[id]       → Clinical notes view                 │
│  /schedule          → Scheduling view                    │
│                                                          │
│  Components:                                             │
│    <DeltaBadge />                                        │
│    <BiometricGhostChart />                               │
│    <DiagnosticNudgeAccordion />                          │
│    <AppleHealthSync />                                   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP (fetch)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                       │
│  Python · Async · LangChain · Pydantic                   │
│                                                          │
│  POST /api/v1/analyze-patient     → RAG diagnostic pipe  │
│  GET  /api/v1/paper/{pmcid}       → PDF proxy (PMC)      │
│  GET  /api/v1/patients            → List patients        │
│  POST /api/v1/patients            → Create patient (+XRP)│
│  POST /api/v1/appointments        → Schedule + email     │
│  GET  /api/v1/appointments/:id    → List appointments    │
│  POST /api/v1/intake/{token}/submit → Intake orchestrator│
│  POST /api/v1/webhook/apple-health/{token} → iOS sync    │
│  GET  /api/v1/intake/{token}/status → Biometric polling  │
│  GET  /api/v1/patients/{id}/dashboard → Dashboard fetch  │
│  GET  /health                     → Health check         │
│                                                          │
│  Services:                                               │
│    llm_extractor.py      → GPT structured output         │
│    embeddings.py         → PubMedBERT encoding           │
│    vector_search.py      → MongoDB $vectorSearch          │
│    analysis_pipeline.py  → Reusable RAG orchestration    │
│    cusum.py              → CUSUM change-point detection   │
│    xrp_wallet.py         → XRP Testnet wallet gen        │
│    email_service.py      → Async SMTP notifications      │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────┐
│  OpenAI API      │   │  MongoDB Atlas            │
│  (GPT via        │   │  · medical_conditions     │
│   LangChain)     │   │    (embeddings + text)    │
│                  │   │  · patients               │
│                  │   │  · appointments            │
│                  │   │                            │
│                  │   │  Indexes:                  │
│                  │   │    vector_index ($vector)  │
│                  │   │    text_index ($search)    │
└──────────────────┘   └──────────────────────────┘
```

Additionally, a standalone **Flask XRPL Oracle** server (`app.py` at the project root) handles blockchain transactions — DID registration, MPToken issuance, and escrow finalization — on the XRP Ledger Testnet.

---

## Backend Deep Dive

### Application Lifecycle (`main.py`)

The FastAPI application uses an **async lifespan context manager** to manage expensive resources:

- **On startup**: Loads the PubMedBERT embedding model into `app.state.embedding_model` and creates a MongoDB client connection in `app.state.mongo_client`. The `TOKENIZERS_PARALLELISM` environment variable is set to `"false"` before any ML imports to avoid deadlocks in tokenizer threads.
- **On shutdown**: Closes the MongoDB client connection.
- **CORS**: Configured to allow requests from `http://localhost:3000` (the Next.js dev server).

### Route: `POST /api/v1/analyze-patient` (`routes/analyze.py`)

This is the core RAG pipeline. The route handler executes 7 sequential steps:

1. **Compute biometric deltas** — Iterates over shared metrics (acute avg vs. longitudinal avg) and acute-only metrics (first 3 days as baseline vs. last 4 days as acute). Each delta is checked against clinical significance thresholds defined in `THRESHOLDS`:
   - Resting heart rate: > 5 bpm
   - HRV SDNN: > 10 ms
   - Respiratory rate: > 2 breaths/min
   - Step count: > 3000 count
   - Sleep awake segments: > 2 count
   - Wrist temperature: > 0.5 °C deviation
   - Walking asymmetry: > 3%

2. **Format biometric summary** — Converts deltas into human-readable markdown for the LLM prompt.

3. **Generate PubMedBERT embedding** — Concatenates narrative + biometric summary and encodes via `encode_text()`.

4. **Run hybrid search** — Calls `search_conditions()` with the embedding vector and raw narrative text. Falls back to pure vector search if `$rankFusion` is unavailable.

5. **Format retrieval context** — Takes the top 3 matches and formats them as structured markdown (condition name, paper title, PMCID, key findings) for the RAG prompt.

6. **Call LLM** — Sends the complete prompt (narrative + biometrics + risk profile + retrieval context) to the GPT model via LangChain with structured output. Returns a `ClinicalBriefOutput` with: summary, key symptoms, severity assessment, recommended actions, cited sources, and guiding questions.

7. **Return `AnalysisResponse`** — Packages everything (clinical brief, biometric deltas, condition matches, risk profile) into the typed response.

### Route: `GET /api/v1/paper/{pmcid}` (`routes/paper.py`)

A **reverse proxy** that solves the CORS problem with PubMed/Europe PMC. When the frontend wants to embed a research paper PDF in an iframe, the browser would normally be blocked by `X-Frame-Options: DENY`. This route:

1. Takes a PMCID (e.g., `PMC7370081`).
2. Fetches the PDF bytes from `europepmc.org/backend/ptpmcrender.fcgi`.
3. Returns a `StreamingResponse` with `media_type="application/pdf"` and permissive CORS headers.

### Route: `POST /api/v1/patients` (`routes/patients.py`)

Creates a new patient record and generates an **XRP Testnet wallet** (address + seed) for the patient. This demonstrates blockchain integration for patient data provenance. The wallet generation runs in a thread pool to avoid blocking the async event loop.

### Route: `POST /api/v1/appointments` (`routes/appointments.py`)

Creates an appointment record, generates a unique form token, and sends an **HTML email notification** to the patient via async SMTP (Gmail). Updates the patient's status to "In Progress."

### Route: `POST /api/v1/intake/{token}/submit` (`routes/intake.py`)

The **intake orchestrator** — a single-endpoint transaction that processes a completed patient intake form. The flow:

1. Validates the appointment token and checks for double-submission prevention (rejects if `status == "completed"`).
2. Runs the full ML analysis pipeline (biometric deltas → PubMedBERT embedding → hybrid vector search → LLM extraction).
3. Persists the analysis results to the patient's record.
4. Queues an **XRP payout** (10 XRP) as a background task to compensate the patient for data contribution.
5. Returns the analysis results to the frontend.

### Route: `POST /api/v1/webhook/apple-health/{token}` (`routes/webhook.py`)

Receives raw biometric data from the patient's **iOS Shortcut** (Apple Health export). When a patient scans the QR code in the intake form, the shortcut sends Apple Health data to this endpoint. The route persists the payload to the appointment's `biometrics` field and sets a `biometrics_received` flag for frontend polling.

### Route: `GET /api/v1/intake/{token}/status` (`routes/webhook.py`)

A **polling endpoint** called every ~2 seconds by the frontend `<AppleHealthSync />` component during Apple Health sync. Returns `{"biometrics_received": true/false}` so the intake form can auto-advance once biometric data arrives.

### Service: `analysis_pipeline.py`

A reusable orchestration module (`analyze_patient_pipeline()`) that encapsulates the 7-step RAG diagnostic pipeline. This was extracted from the analyze route to be shared between the direct analysis endpoint and the intake orchestrator. Accepts a `PatientPayload`, MongoDB client, and embedding model; returns an `AnalysisResponse`.

### Service: `cusum.py`

Implements **CUSUM (Cumulative Sum) change-point detection** for biometric time series. The `detect_changepoint()` function uses the first 3 observations as a baseline mean and tracks upward/downward cumulative sums against configurable slack (`k`) and threshold (`h`) parameters. Returns the date, direction, and magnitude of the first detected sustained shift — useful for identifying sudden health events (e.g., an acute HRV crash or sustained heart rate elevation).

### Service: `llm_extractor.py`

Wraps the OpenAI API call via LangChain's `ChatOpenAI`. Key design decisions:

- **Temperature 0.1**: Near-deterministic output for clinical reliability.
- **Structured output with `strict=True`**: The LLM must return exactly the `ClinicalBriefOutput` schema — no hallucinated fields, no missing fields.
- **System prompt**: Explicitly instructs the model to be "clinical, precise, and advocacy-oriented" and to "combat potential dismissal of the patient's pain experience."
- **RAG grounding**: When retrieval context is provided, the LLM must cite specific conditions and paper titles.

### Service: `embeddings.py`

Loads `lokeshch19/ModernPubMedBERT` via `sentence-transformers`. This model produces 768-dimensional vectors optimized for biomedical text similarity. Embeddings are **normalized** (unit vectors) so that cosine similarity equals dot product.

### Service: `vector_search.py`

Connects to MongoDB Atlas and runs aggregation pipelines:

- **Hybrid mode** (`$rankFusion`): Combines a `$vectorSearch` pipeline (semantic) with a `$search` pipeline (BM25 keyword matching) using Reciprocal Rank Fusion. This is the preferred path.
- **Fallback mode**: Pure `$vectorSearch` if the text index or `$rankFusion` isn't available on the cluster.
- **Candidate amplification**: Uses `numCandidates = top_k * 20` to ensure enough candidates for accurate ranking.

---

## Frontend Deep Dive

### Application Structure

The frontend uses Next.js 15 with the **App Router** pattern. Server components handle data fetching; client components handle interactivity and charting.

### Patient Intake Form (`src/`)

A standalone Next.js app in the root `src/` directory that provides the **patient-facing intake questionnaire**. This is the form patients complete before their appointment, built with the Liquid Glass design system and Framer Motion animations. The multi-step flow walks the patient through:

1. **Welcome screen** — Animated "diagnostic" title with a Continue button.
2. **Pre-visit questions** — Menstrual cycle phase, caffeine consumption, and a 1–10 pain scale (rendered as interactive Liquid Glass buttons).
3. **Symptom narrative** — A free-text input where the patient describes their symptoms in their own words.
4. **Wearables permission** — Asks consent to share Apple Watch / wearable data.
5. **Scan instruction** — Prompts the patient to scan a document.
6. **Confirmation** — Thanks the patient and explains how the data will be used.

Key components:
- **`<LiquidButton />`** — A glass-morphism button with 3D parallax tilt, specular highlight tracking, and spring-based hover/tap animations.
- **`<QuestionCard />`** — Renders a single question step with animated enter/exit transitions.
- **`<CustomCursor />`** — A translucent lens cursor that follows mouse movement with spring physics.
- **`<Magnetic />`** (`components/Magnetic.tsx`) — A magnetic hover effect wrapper that pulls child elements toward the cursor.

### Page: `/patients` (`patients/page.tsx`)

A **client component** that serves as the application's home page. Features:

- **Patient list** with search filtering by name or concern.
- **Status badges** with color coding: Pending (amber), In Progress (blue), Review (purple), Stable (emerald).
- **XRP wallet display** showing truncated blockchain addresses per patient.
- **Add Patient modal** — creates a patient via the API (which also generates their XRP wallet).
- **Schedule Appointment modal** — creates an appointment and triggers email notification.
- **Overview sidebar** with patient count statistics and a recent activity feed.

### Page: `/dashboard/[patientId]` (`dashboard/[patientId]/page.tsx`)

An **async server component** that calls `analyzePatient(patientId)` on the backend and renders the complete F-pattern physician dashboard. The layout is organized into four horizontal rows:

1. **Top Row**: Guiding Questions (left 32%), Symptoms (center 30%), Key Deltas grid (right, 2×2 cards showing the 3 most significant deltas + walking asymmetry with progress bar).
2. **Metrics Row**: `<ClientCharts />` component rendering biometric ghost charts.
3. **Bottom Row**: Three equal cards — Screening Count (with gradient bar), Risk Profile (dynamic severity-colored bars from `risk_profile.factors`), and Possible Diagnosis (condition matches with similarity percentage bars).
4. **Action Row**: Back navigation and Notes link.

### Component: `<DeltaBadge />`

Renders a single biometric delta as a card with:
- Metric name in uppercase muted text.
- Acute average value in large bold text.
- A **colored pill** showing the delta direction (↑/↓) and magnitude. Red if clinically significant and bad (elevated HR, etc.), emerald if significant and good. Certain metrics are "inverted" — for HRV and step count, a decrease is bad.
- Baseline comparison text.

### Component: `<BiometricGhostChart />`

A Recharts `ComposedChart` that overlays acute daily readings on top of a longitudinal baseline reference:

- **`<Area />`**: Soft fill under the line (8% opacity) for visual weight.
- **`<Line />`**: Smooth monotone curve connecting daily values.
- **`<ReferenceLine />`**: A horizontal dashed line at the 26-week average, labeled "Baseline: {value} {unit}". This is the "ghost" — it makes the deviation from normal visually undeniable.
- **Flagged dots**: Data points with flags (e.g., `severe_drop`, `elevated`, `guarding_detected`) render as larger red circles (5px radius) versus normal colored circles (3px).

### Component: `<DiagnosticNudgeAccordion />`

An expandable accordion for the top 5 condition matches:

- **Collapsed**: Shows condition name, paper title, numbered badge, and similarity percentage.
- **Expanded**: Shows the clinical snippet text, plus a 600px-tall `<iframe>` that loads the referenced PubMed paper PDF via the backend proxy route. If the PDF fails to load, it gracefully falls back to a "PDF not available" message with a direct PubMed link.

### Component: `<AppleHealthSync />`

Handles the real-time Apple Health data sync flow during patient intake:

- Renders a **QR code** (via `qrcode.react`) that links to the iOS Shortcut for exporting Apple Health data.
- **Polls** the backend (`GET /api/v1/intake/{token}/status`) every ~2 seconds to detect when biometric data arrives.
- Auto-advances the intake form once `biometrics_received` is `true`.
- Includes a **demo mode** toggle that skips the real sync and injects pre-filled mock biometric data.

### Page: `/intake/[token]` (`intake/[token]/page.tsx`)

The **patient-facing intake form**, accessed via a unique token link sent in the appointment email. This is a multi-step wizard built with the Liquid Glass design system and Framer Motion animations:

1. **Welcome** — Intro screen with animated title and Continue button.
2. **Pre-visit questions** — Menstrual cycle phase, caffeine consumption, and a 1–10 pain scale (rendered as interactive Liquid Glass buttons).
3. **Symptom narrative** — Free-text input for describing symptoms.
4. **Wearables permission** — Consent to share Apple Watch data, with a demo toggle.
5. **Apple Health sync** — `<AppleHealthSync />` component handles QR-based iOS Shortcut data transfer.
6. **Submission** — Sends the assembled payload (form answers + narrative + biometrics) to `POST /api/v1/intake/{token}/submit`, which runs the full analysis pipeline and triggers XRP compensation.
7. **Confirmation** — Thanks the patient and explains how the data will be used.

### API Client (`lib/api.ts`)

The frontend communicates with the backend through typed async functions:

- `analyzePatient(patientId)` — Sends the mock payload (with the given patient ID) to `POST /api/v1/analyze-patient` and returns the typed `AnalysisResponse`.
- `getPaperUrl(pmcid)` — Returns the URL to the backend PDF proxy for iframe embedding.
- `fetchPatients()` — Fetches the patient list from `GET /api/v1/patients`.
- `createPatient(name, email)` — Creates a patient via `POST /api/v1/patients`.
- `createAppointment(patientId, date, time)` — Creates an appointment via `POST /api/v1/appointments`.

The API base URL defaults to `http://localhost:8000` and can be overridden via the `NEXT_PUBLIC_API_URL` environment variable.

---

## Patient Intake Flow

The platform implements a complete patient-to-physician data pipeline. This flow connects the patient intake form, Apple Health hardware sync, ML analysis, and blockchain compensation into a single transaction:

```
┌────────────────┐   Email link    ┌──────────────────────────┐
│  Physician     │ ───────────────→│  Patient opens           │
│  schedules     │                 │  /intake/[token]         │
│  appointment   │                 └──────────┬───────────────┘
└────────────────┘                            │
                                              ▼
                                   ┌──────────────────────────┐
                                   │  Multi-step form:        │
                                   │  1. Pre-visit questions   │
                                   │  2. Symptom narrative     │
                                   │  3. Wearable consent      │
                                   └──────────┬───────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                   ┌─────────────────────┐       ┌────────────────────┐
                   │  QR → iOS Shortcut  │       │  Demo mode:        │
                   │  exports Apple      │       │  pre-filled mock   │
                   │  Health data        │       │  biometric data    │
                   └──────────┬──────────┘       └────────┬───────────┘
                              │ POST /webhook/             │
                              │ apple-health/{token}       │
                              ▼                            │
                   ┌─────────────────────┐                 │
                   │  Frontend polls     │                 │
                   │  GET /intake/       │                 │
                   │  {token}/status     │                 │
                   └──────────┬──────────┘                 │
                              │ biometrics_received=true    │
                              ├─────────────────────────────┘
                              ▼
                   ┌─────────────────────┐
                   │  POST /intake/      │
                   │  {token}/submit     │
                   │  (full payload)     │
                   └──────────┬──────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
        ┌────────────┐ ┌───────────┐ ┌────────────┐
        │ ML pipeline│ │ Persist   │ │ XRP payout │
        │ (RAG +     │ │ results   │ │ (10 XRP)   │
        │  LLM)      │ │ to DB     │ │            │
        └────────────┘ └───────────┘ └────────────┘
```

1. **Physician creates an appointment** → patient receives an email with a unique `/intake/[token]` link.
2. **Patient completes the intake form** — answers pre-visit questions, writes a symptom narrative, and grants wearable data consent.
3. **Apple Health sync** — The patient scans a QR code that triggers an iOS Shortcut to export Apple Health data. The shortcut POSTs biometric data to `POST /api/v1/webhook/apple-health/{token}`. The frontend polls `GET /api/v1/intake/{token}/status` until the data arrives. A demo mode toggle provides pre-filled mock data for testing.
4. **Submission** — The intake form submits the assembled payload to `POST /api/v1/intake/{token}/submit`, which runs the full RAG analysis pipeline, persists results, and queues an XRP compensation payout (10 XRP) to the patient's wallet.
5. **Physician views the dashboard** at `/dashboard/[patientId]` with the complete analysis.

---

## XRPL Integration

The platform integrates with the **XRP Ledger Testnet** to demonstrate blockchain-based patient data provenance and compensation:

### Patient Wallet Generation

When a new patient is created via `POST /api/v1/patients`, an XRP Testnet wallet (address + seed) is automatically generated and stored with the patient record. This wallet serves as the destination for data contribution compensation.

### Data Contribution Compensation

After a patient completes the intake form and their data is analyzed, the intake orchestrator queues a background task that sends **10 XRP** to the patient's wallet as compensation for contributing their health data.

### XRPL Oracle Server (`app.py`)

A standalone **Flask server** at the project root that handles advanced XRP Ledger transactions on Testnet:

- **`POST /webhook/acute`** — Receives biometric data and submits a `DIDSet` transaction (mock patient DID registration) and an `MPTokenIssuanceCreate` transaction (RWA token issuance).
- **`POST /webhook/longitudinal`** — Receives biometric data and submits an `EscrowFinish` transaction to release held funds.
- **`GET /health`** — Health check returning network status.

### Escrow Setup (`setup_escrow.py`)

A utility script that creates a self-destination escrow lock on the XRP Ledger Testnet — simulating a clinic holding research compensation funds. It generates a faucet-funded wallet, locks 50 RLUSD equivalent (50,000,000 drops) with a 1-hour `CancelAfter` window, and outputs the clinic address, transaction hash, and sequence number.

---

## Shared API Contract

The `shared/` directory contains **identical type definitions** in both TypeScript and Python, ensuring the frontend and backend stay in sync:

| TypeScript (`api-contract.ts`) | Python (`api_contract.py`) |
|---|---|
| `MetricDataPoint` | `MetricDataPoint` |
| `LongitudinalDataPoint` | `LongitudinalDataPoint` |
| `AcuteMetrics` | `AcuteMetrics` |
| `LongitudinalMetrics` | `LongitudinalMetrics` |
| `PatientPayload` | `PatientPayload` |
| `ClinicalBrief` | `ClinicalBrief` |
| `BiometricDelta` | `BiometricDelta` |
| `ConditionMatch` | `ConditionMatch` |
| `AnalysisResponse` | `AnalysisResponse` |

---

## Data Models

### `PatientPayload` (Input)

```
PatientPayload
├── patient_id: string
├── patient_narrative: string        ← free-text symptom description
├── risk_profile: RiskProfile
│   └── factors: RiskFactor[]
│       ├── factor: string           ← e.g. "West African Ancestry"
│       ├── category: string         ← e.g. "genetic"
│       ├── severity: string         ← "high" | "elevated" | "moderate"
│       ├── weight: number           ← 0–100 scale
│       └── description: string
├── sync_timestamp: string
├── hardware_source: string
└── data
    ├── acute_7_day
    │   ├── granularity: "daily_summary"
    │   └── metrics
    │       ├── heartRateVariabilitySDNN: MetricDataPoint[]
    │       ├── restingHeartRate: MetricDataPoint[]
    │       ├── appleSleepingWristTemperature: MetricDataPoint[]
    │       ├── respiratoryRate: MetricDataPoint[]
    │       ├── walkingAsymmetryPercentage: MetricDataPoint[]
    │       ├── stepCount: MetricDataPoint[]
    │       └── sleepAnalysis_awakeSegments: MetricDataPoint[]
    └── longitudinal_6_month
        ├── granularity: "weekly_average"
        └── metrics
            ├── restingHeartRate: LongitudinalDataPoint[]
            └── walkingAsymmetryPercentage: LongitudinalDataPoint[]
```

### `AnalysisResponse` (Output)

```
AnalysisResponse
├── patient_id: string
├── clinical_brief: ClinicalBrief
│   ├── summary: string
│   ├── key_symptoms: string[]
│   ├── severity_assessment: string
│   ├── recommended_actions: string[]
│   ├── cited_sources: string[]
│   └── guiding_questions: string[]
├── biometric_deltas: BiometricDelta[]
│   ├── metric: string
│   ├── acute_avg: number
│   ├── longitudinal_avg: number
│   ├── delta: number
│   ├── unit: string
│   └── clinically_significant: boolean
├── condition_matches: ConditionMatch[]
│   ├── condition: string
│   ├── similarity_score: number
│   ├── pmcid: string
│   ├── title: string
│   └── snippet: string
└── risk_profile: RiskProfile | null
```

---

## The Mock Payload

For UI/UX development and testing, the system uses a fully-populated mock payload (`testpayload.json`) representing a patient ("pt_883920_x") with the following clinical scenario:

- **Narrative**: 4-day acute abdominal pain, limping, fatigue, was dismissed as "just period pain."
- **Hardware**: Apple Watch Series 9.
- **Acute 7-Day Pattern**: The first 3 days are normal baseline; day 4 shows a dramatic physiological event:
  - HRV crashes from ~47 ms to 22.4 ms (severe autonomic stress)
  - Resting HR spikes from 62 to 78 bpm (elevated)
  - Wrist temperature jumps to +0.85°C deviation (possible fever/inflammation)
  - Respiratory rate rises from 14.5 to 18.2 breaths/min
  - Walking asymmetry surges from 1.3% to 8.5% (guarding gait)
  - Step count plummets from 8,600 to 1,200 (mobility collapse)
  - Sleep wake segments jump from 2 to 6 (pain-induced insomnia, flagged as `painsomnia` in the data)
  - Days 5–7 show gradual recovery but still far from baseline
- **Longitudinal 6-Month Pattern**: Shows a subtle 26-week creeping elevation in resting heart rate (61.2 → 68.8 bpm) and walking asymmetry (1.1% → 4.3%), suggesting a chronic underlying condition slowly worsening.
- **Risk Profile**: West African Ancestry (high), Dense Breast Tissue (elevated), Endometriosis Family Hx (elevated), Metabolic Inflammatory Markers (moderate).

---

## Design System — Liquid Glass

The UI follows a **Liquid Glass** design system defined in `liquid_glass_guide.md`:

- **Core**: Translucent card surfaces with `bg-white/8` to `bg-white/12`, `backdrop-blur-[24px]`, and `border border-white/20`.
- **Shadows**: Multi-layer shadows with purple tints: `shadow-[0_8px_32px_rgba(93,46,168,0.12),inset_0_1px_0_rgba(255,255,255,0.35)]`.
- **Typography**: Dark text palette (`#1F1B2D`, `#2F1C4E`) with gradient text for emphasis.
- **Animations**: Framer Motion with spring physics — hover lift (`y: -4`), tap compress (`scale: 0.97`), and `spring` transitions.
- **Color Tokens**: CSS custom properties defined in `globals.css` — `--purple-primary`, `--lavender-bg`, `--red-alert`, `--page-bg`, etc.

---

## Getting Started

### Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`
- **MongoDB Atlas** cluster with vector search index configured
- **OpenAI API key**
- **HuggingFace token** (for PubMedBERT model access)

### Backend Setup

```bash
cd back-end

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY, MONGODB_URI, etc.

# Seed the database (first time only)
python seed_db.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd front-end

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend runs on `http://localhost:3000` and communicates with the backend at `http://localhost:8000`.

---

## Deployment

### Railway (Production)

The backend is configured for deployment on **Railway.app** via `back-end/railway.toml`:

- **Builder**: Nixpacks (auto-detects Python)
- **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`
- **Health check**: `GET /health` with a 300-second timeout
- **Restart policy**: On failure, up to 3 retries

### Heroku

A `back-end/Procfile` is provided for Heroku-compatible platforms:

```
web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Local Development with ngrok

For developing against the Vercel-hosted frontend, `back-end/start.sh` starts uvicorn on `127.0.0.1:8000` with `--reload`. Use ngrok to expose the local backend to the internet. See `docs/LOCAL_BACKEND_GUIDE.md` for detailed setup instructions.

---

## Project Structure

```
Diagnostic/
├── back-end/                    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan
│   │   ├── config.py            # Settings from .env
│   │   ├── models/
│   │   │   ├── patient.py       # Pydantic models (payload, response)
│   │   │   └── patient_management.py
│   │   ├── routes/
│   │   │   ├── analyze.py       # RAG diagnostic pipeline
│   │   │   ├── paper.py         # PDF proxy for PubMed
│   │   │   ├── patients.py      # Patient CRUD + XRP wallet
│   │   │   ├── appointments.py  # Scheduling + email
│   │   │   ├── intake.py        # Intake orchestrator + XRP payout
│   │   │   └── webhook.py       # Apple Health webhook + status polling
│   │   └── services/
│   │       ├── llm_extractor.py # GPT structured output via LangChain
│   │       ├── embeddings.py    # PubMedBERT sentence-transformers
│   │       ├── vector_search.py # MongoDB Atlas hybrid search
│   │       ├── analysis_pipeline.py # Reusable RAG orchestration
│   │       ├── cusum.py         # CUSUM change-point detection
│   │       ├── xrp_wallet.py    # XRP Testnet wallet generation
│   │       └── email_service.py # Async SMTP with HTML templates
│   ├── tests/                   # Backend test suite
│   ├── seed_db.py               # Seed medical conditions DB
│   ├── seed_mock_patients.py    # Seed mock patient records
│   ├── start.sh                 # Local dev startup script
│   ├── Procfile                 # Heroku deployment
│   ├── railway.toml             # Railway deployment config
│   ├── requirements.txt
│   └── .env.example
├── front-end/                   # Next.js 15 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Redirect to /patients
│   │   │   ├── layout.tsx       # Root layout, fonts
│   │   │   ├── template.tsx     # App-level layout wrapper
│   │   │   ├── globals.css      # Tailwind + CSS custom properties
│   │   │   ├── dashboard/[patientId]/
│   │   │   │   ├── page.tsx     # F-pattern physician dashboard
│   │   │   │   ├── DashboardContent.tsx
│   │   │   │   ├── DashboardClient.tsx
│   │   │   │   └── ClientCharts.tsx
│   │   │   ├── patients/
│   │   │   │   ├── page.tsx     # Patient list & management
│   │   │   │   └── _components/
│   │   │   │       ├── AddPatientModal.tsx
│   │   │   │       └── ScheduleModal.tsx
│   │   │   ├── intake/[token]/
│   │   │   │   └── page.tsx     # Patient intake form wizard
│   │   │   ├── notes/[patientId]/
│   │   │   │   └── page.tsx     # Clinical notes view
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx     # Scheduling view
│   │   │   └── _components/
│   │   │       ├── DeltaBadge.tsx
│   │   │       ├── BiometricGhostChart.tsx
│   │   │       └── DiagnosticNudgeAccordion.tsx
│   │   ├── components/
│   │   │   └── AppleHealthSync.tsx  # Apple Health QR sync component
│   │   └── lib/
│   │       ├── types.ts         # TypeScript interfaces
│   │       ├── api.ts           # API client functions
│   │       └── testpayload.json # Mock patient data
│   └── package.json
├── src/                         # Patient intake form (standalone Next.js app)
│   ├── app/
│   │   ├── page.tsx             # Multi-step patient questionnaire
│   │   ├── layout.tsx           # Root layout, Poppins font
│   │   └── globals.css          # Tailwind + global styles
│   └── components/
│       └── Magnetic.tsx         # Magnetic hover effect component
├── shared/                      # Cross-stack API contract
│   ├── api-contract.ts          # TypeScript interfaces
│   └── api_contract.py          # Python Pydantic models
├── app.py                       # Flask XRPL oracle server (Testnet)
├── setup_escrow.py              # XRP escrow setup utility
├── docs/
│   ├── plans/                   # Architecture & implementation docs
│   └── LOCAL_BACKEND_GUIDE.md   # ngrok local dev guide
├── CLAUDE.md                    # Project blueprint
├── liquid_glass_guide.md        # Design system specification
├── testpayload.json             # Root-level mock payload
└── response.json                # Example API response
```

---

## Testing

The backend includes a test suite in `back-end/tests/` covering the core pipeline and integration points. Run tests with:

```bash
cd back-end
python -m pytest tests/
```
