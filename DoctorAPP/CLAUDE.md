# DIAGNOSTIC: Full-Stack Architecture & AI Pipeline Blueprint

## 1. Project Overview & Mission
**Diagnostic** is a full-stack healthcare advocacy platform designed to combat pain management bias and medical gaslighting, specifically targeting systemic disparities in Black women's healthcare (Endometriosis, Uterine Fibroids, Breast Cancer). 

The platform translates subjective patient narratives into objective clinical data. It merges natural language processing (NLP) with multi-modal physiological data (Heart Rate Variability, Resting Heart Rate, Mobility) to produce an undeniable clinical dashboard for physicians.

**Development Context:** * High-velocity hackathon MVP. 
* Designed to demonstrate production-grade RAG (Retrieval-Augmented Generation), hardware integration, and advanced UI/UX.
* **Current Phase:** Building the backend processing pipeline and the frontend UI boilerplate using a mocked JSON payload. The live Apple Shortcuts webhook (Jordan's scope) is temporarily bypassed for UI/UX testing.

---

## 2. Tech Stack Setup
### Backend (Python/FastAPI)
* **Framework:** FastAPI (async routes required for LLM processing).
* **LLM Extractor (Model 1):** OpenAI (`research which model is best to use for this case`) via LangChain.
* **Vector Embedder (Model 2):** `sentence-transformers` running `lokeshch19/ModernPubMedBERT` locally.
* **Database:** MongoDB Atlas with `$vectorSearch`.
* **Run Command:** `uvicorn app.main:app --reload --port 8000`

### Frontend (Next.js/React)
* **Framework:** Next.js (App Router, TypeScript).
* **Styling:** Tailwind CSS (minimalist, high-contrast clinical aesthetic).
* **Charting:** `recharts` (for complex, dual-axis biometric rendering).
* **Run Command:** `npm run dev`

---

## 3. Backend Implementation Tasks



**Endpoint 1: `/api/v1/analyze-patient` (POST)**
* **The Goal:** Accept the mock JSON payload (defined below), trigger the LLM to generate a structured Clinical Brief from the patient's narrative, generate a vector using PubMedBERT, and query MongoDB for top matching conditions.
* **Validation:** Use strict Pydantic `BaseModel` classes to validate the incoming `acute_7_day` and `longitudinal_6_month` arrays. 

**Endpoint 2: `/api/v1/paper/{pmcid}` (GET)**
* **The Goal:** Bypass NCBI/PubMed CORS restrictions (`X-Frame-Options: DENY`) by creating a proxy stream.
* **Execution:** Take the requested PMCID, fetch the raw PDF bytes from `https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/`, and return a `StreamingResponse` with `media_type="application/pdf"`. 

---

## 4. Frontend Implementation Tasks



**UI Layout: The F-Pattern Physician Dashboard**
Build the layout prioritizing zero-click scannability. Do not use default grid lines on charts; keep the UI pristine.

**Component 1: `<DeltaBadge />`**
* **Logic:** Calculate `Delta = Acute 7-Day Average - Longitudinal 26-Week Average`.
* **Display:** Show the current metric, the baseline context, and a highlighted pill tag. If the delta is clinically significant (e.g., RHR jump > 5 bpm), flag it with a soft red background.

**Component 2: `<BiometricGhostChart />` (Recharts)**
* **Logic:** Use a `<ComposedChart />` to map the `acute_7_day` metrics. 
* **The Upgrade:** Calculate the 26-week mean from the longitudinal data and render it as a dashed `<ReferenceLine />` horizontally across the entire 7-day chart. This visually proves how far the patient's acute state deviates from their historical norm.

**Component 3: `<DiagnosticNudgeAccordion />`**
* **Logic:** Display the `$vectorSearch` condition matches. 
* **The Upgrade:** Inside the expanded accordion, render an `<iframe>` pointing to the backend proxy route (`http://localhost:8000/api/v1/paper/{pmcid}`). 



---

## 5. The Mock Payload (State Injection)
Inject this exact, fully-populated payload directly into the top-level Next.js component state to build the charts and delta math. The backend must also be typed to accept this exact schema perfectly.

```json
{
  "patient_id": "pt_883920_x",
  "sync_timestamp": "2026-02-21T12:35:39Z",
  "hardware_source": "Apple Watch Series 9",
  "data": {
    "acute_7_day": {
      "granularity": "daily_summary",
      "metrics": {
        "heartRateVariabilitySDNN": [
          {"date": "2026-02-15", "value": 48.2, "unit": "ms"},
          {"date": "2026-02-16", "value": 47.1, "unit": "ms"},
          {"date": "2026-02-17", "value": 45.9, "unit": "ms"},
          {"date": "2026-02-18", "value": 22.4, "unit": "ms", "flag": "severe_drop"},
          {"date": "2026-02-19", "value": 24.1, "unit": "ms"},
          {"date": "2026-02-20", "value": 28.5, "unit": "ms"},
          {"date": "2026-02-21", "value": 31.0, "unit": "ms"}
        ],
        "restingHeartRate": [
          {"date": "2026-02-15", "value": 62, "unit": "bpm"},
          {"date": "2026-02-16", "value": 63, "unit": "bpm"},
          {"date": "2026-02-17", "value": 62, "unit": "bpm"},
          {"date": "2026-02-18", "value": 78, "unit": "bpm", "flag": "elevated"},
          {"date": "2026-02-19", "value": 76, "unit": "bpm"},
          {"date": "2026-02-20", "value": 74, "unit": "bpm"},
          {"date": "2026-02-21", "value": 72, "unit": "bpm"}
        ],
        "appleSleepingWristTemperature": [
          {"date": "2026-02-15", "value": -0.12, "unit": "degC_deviation"},
          {"date": "2026-02-16", "value": -0.10, "unit": "degC_deviation"},
          {"date": "2026-02-17", "value": 0.05, "unit": "degC_deviation"},
          {"date": "2026-02-18", "value": 0.85, "unit": "degC_deviation", "flag": "sustained_high"},
          {"date": "2026-02-19", "value": 0.92, "unit": "degC_deviation"},
          {"date": "2026-02-20", "value": 0.80, "unit": "degC_deviation"},
          {"date": "2026-02-21", "value": 0.75, "unit": "degC_deviation"}
        ],
        "respiratoryRate": [
          {"date": "2026-02-15", "value": 14.5, "unit": "breaths/min"},
          {"date": "2026-02-16", "value": 14.6, "unit": "breaths/min"},
          {"date": "2026-02-17", "value": 14.5, "unit": "breaths/min"},
          {"date": "2026-02-18", "value": 18.2, "unit": "breaths/min", "flag": "elevated"},
          {"date": "2026-02-19", "value": 17.8, "unit": "breaths/min"},
          {"date": "2026-02-20", "value": 16.5, "unit": "breaths/min"},
          {"date": "2026-02-21", "value": 16.0, "unit": "breaths/min"}
        ],
        "walkingAsymmetryPercentage": [
          {"date": "2026-02-15", "value": 1.2, "unit": "%"},
          {"date": "2026-02-16", "value": 1.5, "unit": "%"},
          {"date": "2026-02-17", "value": 1.3, "unit": "%"},
          {"date": "2026-02-18", "value": 8.5, "unit": "%", "flag": "guarding_detected"},
          {"date": "2026-02-19", "value": 8.2, "unit": "%"},
          {"date": "2026-02-20", "value": 6.0, "unit": "%"},
          {"date": "2026-02-21", "value": 5.5, "unit": "%"}
        ],
        "stepCount": [
          {"date": "2026-02-15", "value": 8500, "unit": "count"},
          {"date": "2026-02-16", "value": 8200, "unit": "count"},
          {"date": "2026-02-17", "value": 8600, "unit": "count"},
          {"date": "2026-02-18", "value": 1200, "unit": "count", "flag": "mobility_drop"},
          {"date": "2026-02-19", "value": 1500, "unit": "count"},
          {"date": "2026-02-20", "value": 2500, "unit": "count"},
          {"date": "2026-02-21", "value": 3000, "unit": "count"}
        ],
        "sleepAnalysis_awakeSegments": [
          {"date": "2026-02-15", "value": 1, "unit": "count"},
          {"date": "2026-02-16", "value": 1, "unit": "count"},
          {"date": "2026-02-17", "value": 2, "unit": "count"},
          {"date": "2026-02-18", "value": 6, "unit": "count", "flag": "painsomnia"},
          {"date": "2026-02-19", "value": 5, "unit": "count"},
          {"date": "2026-02-20", "value": 4, "unit": "count"},
          {"date": "2026-02-21", "value": 3, "unit": "count"}
        ]
      }
    },
    "longitudinal_6_month": {
      "granularity": "weekly_average",
      "metrics": {
        "restingHeartRate": [
          {"week_start": "2025-08-24", "value": 61.2, "unit": "bpm"},
          {"week_start": "2025-08-31", "value": 61.5, "unit": "bpm"},
          {"week_start": "2025-09-07", "value": 61.4, "unit": "bpm"},
          {"week_start": "2025-09-14", "value": 61.8, "unit": "bpm"},
          {"week_start": "2025-09-21", "value": 62.1, "unit": "bpm"},
          {"week_start": "2025-09-28", "value": 62.0, "unit": "bpm"},
          {"week_start": "2025-10-05", "value": 62.5, "unit": "bpm"},
          {"week_start": "2025-10-12", "value": 62.8, "unit": "bpm"},
          {"week_start": "2025-10-19", "value": 63.1, "unit": "bpm"},
          {"week_start": "2025-10-26", "value": 63.5, "unit": "bpm"},
          {"week_start": "2025-11-02", "value": 63.8, "unit": "bpm"},
          {"week_start": "2025-11-09", "value": 64.1, "unit": "bpm"},
          {"week_start": "2025-11-16", "value": 64.5, "unit": "bpm"},
          {"week_start": "2025-11-23", "value": 64.7, "unit": "bpm"},
          {"week_start": "2025-11-30", "value": 65.1, "unit": "bpm"},
          {"week_start": "2025-12-07", "value": 65.5, "unit": "bpm"},
          {"week_start": "2025-12-14", "value": 65.8, "unit": "bpm"},
          {"week_start": "2025-12-21", "value": 66.2, "unit": "bpm"},
          {"week_start": "2025-12-28", "value": 66.5, "unit": "bpm"},
          {"week_start": "2026-01-04", "value": 66.8, "unit": "bpm"},
          {"week_start": "2026-01-11", "value": 67.1, "unit": "bpm"},
          {"week_start": "2026-01-18", "value": 67.4, "unit": "bpm"},
          {"week_start": "2026-01-25", "value": 67.7, "unit": "bpm"},
          {"week_start": "2026-02-01", "value": 68.1, "unit": "bpm"},
          {"week_start": "2026-02-08", "value": 68.4, "unit": "bpm"},
          {"week_start": "2026-02-15", "value": 68.8, "unit": "bpm", "trend": "creeping_elevation"}
        ],
        "walkingAsymmetryPercentage": [
          {"week_start": "2025-08-24", "value": 1.1, "unit": "%"},
          {"week_start": "2025-08-31", "value": 1.1, "unit": "%"},
          {"week_start": "2025-09-07", "value": 1.2, "unit": "%"},
          {"week_start": "2025-09-14", "value": 1.2, "unit": "%"},
          {"week_start": "2025-09-21", "value": 1.3, "unit": "%"},
          {"week_start": "2025-09-28", "value": 1.3, "unit": "%"},
          {"week_start": "2025-10-05", "value": 1.4, "unit": "%"},
          {"week_start": "2025-10-12", "value": 1.5, "unit": "%"},
          {"week_start": "2025-10-19", "value": 1.6, "unit": "%"},
          {"week_start": "2025-10-26", "value": 1.8, "unit": "%"},
          {"week_start": "2025-11-02", "value": 2.0, "unit": "%"},
          {"week_start": "2025-11-09", "value": 2.1, "unit": "%"},
          {"week_start": "2025-11-16", "value": 2.3, "unit": "%"},
          {"week_start": "2025-11-23", "value": 2.4, "unit": "%"},
          {"week_start": "2025-11-30", "value": 2.5, "unit": "%"},
          {"week_start": "2025-12-07", "value": 2.6, "unit": "%"},
          {"week_start": "2025-12-14", "value": 2.8, "unit": "%"},
          {"week_start": "2025-12-21", "value": 2.9, "unit": "%"},
          {"week_start": "2025-12-28", "value": 3.1, "unit": "%"},
          {"week_start": "2026-01-04", "value": 3.3, "unit": "%"},
          {"week_start": "2026-01-11", "value": 3.4, "unit": "%"},
          {"week_start": "2026-01-18", "value": 3.6, "unit": "%"},
          {"week_start": "2026-01-25", "value": 3.8, "unit": "%"},
          {"week_start": "2026-02-01", "value": 4.0, "unit": "%"},
          {"week_start": "2026-02-08", "value": 4.1, "unit": "%"},
          {"week_start": "2026-02-15", "value": 4.3, "unit": "%", "trend": "gradual_impairment"}
        ]
      }
    }
  }
}