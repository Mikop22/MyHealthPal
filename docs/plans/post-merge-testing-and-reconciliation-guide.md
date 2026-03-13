# Post-Merge Testing & Database Reconciliation Guide

## Purpose

Now that the PatientMobileAPP and DoctorAPP front-end and back-end are integrated, this document describes how to manually test the end-to-end user experience and identifies database/configuration items that need reconciliation before the system works reliably.

---

## Part 1 — User Experience Testing

### Prerequisites

Before testing, start all four services:

| Service | Directory | Command | Default Port |
|---------|-----------|---------|-------------|
| DoctorAPP Backend | `DoctorAPP/back-end` | `uvicorn app.main:app --reload --port 8000` | 8000 |
| DoctorAPP Frontend | `DoctorAPP/front-end` | `npm run dev` | 3000 |
| PatientMobileAPP Backend | `PatientMobileAPP/backend` | `uvicorn app.main:app --reload --port 8080` | 8080 |
| PatientMobileAPP Mobile | `PatientMobileAPP/frontend/mobile-app` | `npx expo start` | 8081 (Metro) |

> **Important:** The PatientMobileAPP backend must run on a **different port** than DoctorAPP backend since they both default to 8000. See Part 2, Issue 1 for details.

### Flow 1 — Clinician Creates a Patient and Schedules an Appointment

**What you are testing:** DoctorAPP frontend → DoctorAPP backend → MongoDB

1. Open the DoctorAPP frontend at `http://localhost:3000`.
2. Navigate to the **Patients** page.
3. Click **Add Patient** and fill in a name and email.
4. Verify the patient appears in the roster with status "Pending".
5. Click on the new patient and select **Schedule Appointment**.
6. Fill in the date/time and submit.
7. Verify:
   - The appointment appears in the patient's appointment list.
   - An email is sent to the patient with an invite link (check the SMTP configuration or console logs).
   - In MongoDB, a new document exists in the `prep_episodes` collection with `status: "invite_sent"` and a valid `invite_token`.

**What could go wrong:**
- MongoDB connection string not set → backend returns 500.
- SMTP credentials not configured → email send fails silently; the prep episode is still created but the patient never gets the link.
- XRP wallet creation fails if the XRPL network is down (non-blocking but `xrp_wallet_address` will be empty).

---

### Flow 2 — Patient Opens the Invite Link on Mobile

**What you are testing:** Mobile deep link → PatientMobileAPP frontend → PatientMobileAPP backend → DoctorAPP backend

1. Copy the `invite_token` from MongoDB (`prep_episodes.invite_token`) or from the email link.
2. In the Expo mobile app, navigate to the **Onboarding** screen.
3. Enter (or deep-link with) the invite token.
4. The app should call `GET /prep/invite/{token}` on the PatientMobileAPP backend, which proxies to `GET /api/v1/mobile-prep/invite/{token}` on DoctorAPP.
5. Verify:
   - The patient sees their name and appointment date.
   - The prep episode status in MongoDB updates to `"invite_opened"`.

**What could go wrong:**
- `DOCTORAPP_BASE_URL` not set or pointing to the wrong port → PatientMobileAPP backend returns 502 (Bad Gateway). See Part 2, Issue 1.
- Token expired (14-day TTL) → DoctorAPP returns 410 Gone.
- Token not found → DoctorAPP returns 404.

---

### Flow 3 — Patient Completes the Symptom Check-In

**What you are testing:** Triage tab → check-in extraction → save to DoctorAPP

1. After resolving the invite, the patient taps **Start Prep**.
   - This calls `POST /prep/{token}/start`, proxied to DoctorAPP.
   - Verify the prep episode status updates to `"started"`.
2. Navigate to the **Triage** tab in the mobile app.
3. Enter a free-text symptom narrative (e.g., "I've had a headache and dizziness for 3 days").
4. The app should extract symptom cards using OpenAI.
5. Review, confirm, or dismiss individual symptom cards.
6. Submit the check-in.
   - This calls `POST /prep/{token}/save-checkin` with the `CheckinPayload` (raw text, extracted symptoms, confirmed/dismissed lists).
   - Verify the `checkin_payload` field in the `prep_episodes` MongoDB document is populated.

**What could go wrong:**
- `OPENAI_API_KEY` not set on the PatientMobileAPP backend → symptom extraction fails.
- Payload shape mismatch between mobile frontend and `CheckinPayload` schema → 422 Validation Error.
- Proxy timeout if DoctorAPP is slow → PatientMobileAPP returns 504.

---

### Flow 4 — Patient Scans and Uploads Documents

**What you are testing:** Scanner tab → image capture → MedGemma translation → save to DoctorAPP

1. Navigate to the **Scanner** tab.
2. Take a photo of a medical document or select one from the camera roll.
3. The app sends the image to `POST /translate` on the PatientMobileAPP backend for summarization via MedGemma.
4. Review the summary bullets and optional patient note.
5. Submit the scanned documents.
   - This calls `POST /prep/{token}/save-documents` with the `DocumentsPayload`.
   - Verify the `documents` array in the `prep_episodes` MongoDB document is populated.

**What could go wrong:**
- AWS SageMaker endpoint (`SAGEMAKER_ENDPOINT_NAME`) not configured or not deployed → MedGemma translation fails.
- Image too large (exceeds `MAX_IMAGE_SIZE_MB`) → backend returns 413.
- The `/translate` endpoint is a local feature on PatientMobileAPP — it does not proxy to DoctorAPP. The document save step does proxy to DoctorAPP.

---

### Flow 5 — Patient Submits Health Data and Finalizes

**What you are testing:** Health data sync → submit → analysis pipeline → patient summary

1. If the patient has connected Apple Health data (via webhook), navigate to the **Vitals** tab to review metrics.
2. Tap **Share Health Data**.
   - This calls `POST /prep/{token}/save-health-data` with the `HealthDataPayload`.
3. Tap **Submit** to finalize.
   - This calls `POST /prep/{token}/submit`, proxied to DoctorAPP.
   - DoctorAPP runs the full analysis pipeline: transform → embeddings → RAG analysis → persist results.
4. Verify:
   - The prep episode status progresses: `"submitted"` → `"analysis_running"` → `"ready_for_review"`.
   - The `analysis_response` field in MongoDB is populated with biometric deltas and condition matches.
   - The `patient_safe_summary` field contains neutral, non-alarming bullet points.
5. Poll `GET /prep/{token}/status` to watch the status transition.
6. Retrieve `GET /prep/{token}/summary` to see what the patient would see.

**What could go wrong:**
- OpenAI API key not set on DoctorAPP → analysis pipeline fails.
- HuggingFace token not set → embedding model cannot load.
- MongoDB vector search index not created → condition matching returns empty.
- Analysis takes longer than the proxy timeout (default 30s) → PatientMobileAPP returns 504.

---

### Flow 6 — Clinician Reviews Results on the Dashboard

**What you are testing:** DoctorAPP frontend → dashboard → analysis results

1. Go back to the DoctorAPP frontend at `http://localhost:3000`.
2. Navigate to the patient's appointment.
3. Click on the **Dashboard** view.
4. Verify the clinician sees:
   - Clinical brief with summary, key symptoms, severity assessment.
   - Biometric delta table (acute vs. longitudinal comparisons).
   - Condition matches with similarity scores and literature references.
   - Guiding questions for the consultation.
5. Mark the appointment as reviewed.

**What could go wrong:**
- Dashboard fetches from `/api/v1/appointments/{id}/dashboard` or `/api/v1/patients/{id}/dashboard` — make sure the analysis has completed before loading.
- If analysis failed silently (e.g., partial data), the dashboard may show incomplete results.

---

### Flow 7 — Web Fallback Intake (Alternative Path)

**What you are testing:** DoctorAPP web intake form as a fallback when mobile is unavailable

1. Use the web fallback URL from the invite email (format: `http://localhost:3000/intake/{token}`).
2. Fill in the web intake form.
3. Submit.
   - This calls `POST /api/v1/intake/{token}/submit` directly on DoctorAPP.
   - The prep episode source should update to `"web_fallback"`.
4. Verify the same analysis pipeline runs and the clinician dashboard shows results.

---

### Flow 8 — Crowdfunding (PatientMobileAPP Only)

**What you are testing:** Campaign creation and contributions (standalone feature, no DoctorAPP dependency)

1. Create a campaign via `POST /campaigns` on the PatientMobileAPP backend.
2. List campaigns via `GET /campaigns`.
3. Add a contribution via `POST /campaigns/{id}/contributions`.
4. Verify the campaign total updates.
5. Note: This uses **local JSON file storage** (`data/crowdfunding.json`), not MongoDB. See Part 2, Issue 3.

---

## Part 2 — Database & Configuration Reconciliation

### Issue 1 — Port Mismatch Between Backends (Critical)

**Problem:** Both DoctorAPP and PatientMobileAPP backends default to port 8000. When running together, one will fail to bind.

Additionally, `PatientMobileAPP/backend/app/doctorapp_client.py` defaults `DOCTORAPP_BASE_URL` to `http://localhost:8001`, but DoctorAPP actually starts on port 8000 (per `DoctorAPP/back-end/start.sh`).

The `.env.example` for PatientMobileAPP also shows the incorrect port:
```
DOCTORAPP_BASE_URL=http://localhost:8001
```

**What needs to happen:**
- Decide on a port convention. Recommended: DoctorAPP on `8000`, PatientMobileAPP on `8080`.
- Update `PatientMobileAPP/backend/.env.example` to reflect the correct DoctorAPP URL (e.g., `http://localhost:8000`).
- Update the default in `PatientMobileAPP/backend/app/doctorapp_client.py` to match (or remove the default and require explicit configuration).
- Ensure `DOCTORAPP_BASE_URL` is set in `PatientMobileAPP/backend/.env`.
- Update the mobile frontend's `EXPO_PUBLIC_API_URL` to point to the PatientMobileAPP backend port (e.g., `http://localhost:8080`).

---

### Issue 2 — Missing Environment Variables in PatientMobileAPP .env

**Problem:** The actual `PatientMobileAPP/backend/.env` file is missing `DOCTORAPP_BASE_URL`. Without it, all eight `/prep/` proxy routes will fail because `doctorapp_client.py` falls back to `http://localhost:8001` which is likely not running.

**What needs to happen:**
- Add `DOCTORAPP_BASE_URL=http://localhost:8000` to `PatientMobileAPP/backend/.env`.
- Optionally add `DOCTORAPP_TIMEOUT=30` for explicit timeout control.

---

### Issue 3 — Crowdfunding Uses JSON File Storage, Not a Database

**Problem:** The crowdfunding feature (`PatientMobileAPP/backend/app/crowdfunding.py`) stores campaigns and contributions in a local JSON file (`data/crowdfunding.json`), while the rest of the system uses MongoDB and Supabase.

**Implications:**
- Data is lost if the server is redeployed or the container is recreated.
- No concurrent write safety beyond the atomic file replace.
- No query capability (no search, filter, or pagination at the storage layer).
- Inconsistent with the rest of the system's data architecture.

**What needs to happen (eventually):**
- Decide if crowdfunding should move to MongoDB (alongside patients/appointments) or Supabase (alongside labels).
- For now, it works for demo/hackathon purposes but should not be considered production-ready.

---

### Issue 4 — Two Databases in PatientMobileAPP (Supabase + MongoDB)

**Problem:** PatientMobileAPP uses **Supabase** (PostgreSQL) for label storage (`app/labels.py`) and **MongoDB** (shared with DoctorAPP) for prep episodes. This is a deliberate architecture choice, but it means:

- Two sets of database credentials to manage.
- Two different query patterns (SQL vs. document-based).
- Labels stored in Supabase cannot be joined with prep episode data in MongoDB without application-level joins.

**What needs to happen:**
- This is not necessarily a bug, but be aware when testing that label data and prep episode data live in separate databases.
- Ensure both `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` and `MONGODB_URI` (indirectly via DoctorAPP proxy) are configured.

---

### Issue 5 — Hardcoded URL in apiSync.ts

**Problem:** `PatientMobileAPP/frontend/mobile-app/services/apiSync.ts` hardcodes `http://localhost:8000` without environment variable support, unlike `api.ts` which reads `EXPO_PUBLIC_API_URL`.

```typescript
// apiSync.ts — hardcoded
const API_BASE = "http://localhost:8000";

// api.ts — configurable
const API_BASE =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
    "http://localhost:8000";
```

**What needs to happen:**
- Update `apiSync.ts` to use the same environment variable pattern as `api.ts`.
- This matters when testing on a physical device (where `localhost` doesn't resolve to the dev machine).

---

### Issue 6 — CORS Configuration Differences

**Problem:** DoctorAPP uses a permissive CORS policy (`"*"` by default via `ALLOWED_ORIGINS`), while PatientMobileAPP uses a regex-based policy that only allows `localhost` and `127.0.0.1` origins.

**What needs to happen:**
- For local testing, both work fine.
- For deployment (or testing with ngrok/tunnels), PatientMobileAPP's CORS regex will block requests from non-localhost origins. You would need to update the regex or add the tunnel domain.
- DoctorAPP's `"*"` policy is fine for development but should be tightened for production.

---

### Issue 7 — Email Configuration Required for Full Flow

**Problem:** The appointment creation flow sends an invite email to the patient. If SMTP is not configured, the email silently fails but the prep episode is still created.

**What needs to happen:**
- For testing without email: manually copy the `invite_token` from MongoDB and use it directly.
- For testing with email: configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` in the DoctorAPP backend `.env`.
- Consider adding a log warning when email sending fails so testers know to check SMTP configuration.

---

## Part 3 — Quick-Reference Testing Checklist

Use this checklist to verify the full integration is working:

### Configuration
- [ ] DoctorAPP backend running on port 8000
- [ ] PatientMobileAPP backend running on a different port (e.g., 8080)
- [ ] `DOCTORAPP_BASE_URL` set correctly in PatientMobileAPP `.env`
- [ ] MongoDB connection string configured in DoctorAPP `.env`
- [ ] OpenAI API key set in both backends
- [ ] Mobile frontend `EXPO_PUBLIC_API_URL` pointing to PatientMobileAPP backend

### End-to-End Flow
- [ ] Health check: `GET /health` returns 200 on both backends
- [ ] Create patient via DoctorAPP frontend
- [ ] Schedule appointment → prep episode created in MongoDB
- [ ] Resolve invite token via mobile app (or direct API call)
- [ ] Start prep episode
- [ ] Complete symptom check-in and save
- [ ] Scan document and save
- [ ] Submit prep and verify analysis runs
- [ ] Poll status until `ready_for_review`
- [ ] Retrieve patient-safe summary
- [ ] View full analysis on DoctorAPP clinician dashboard
- [ ] Test web fallback intake form as alternative path

### Edge Cases
- [ ] Expired token returns appropriate error
- [ ] Invalid token returns 404
- [ ] Submitting with missing sections (no documents, no health data) still works
- [ ] Duplicate submission is handled gracefully
- [ ] DoctorAPP backend down → PatientMobileAPP returns 502, not 500
- [ ] Timeout on slow analysis → PatientMobileAPP returns 504

### Database Verification
- [ ] `patients` collection has the new patient with XRP wallet
- [ ] `appointments` collection has the scheduled appointment
- [ ] `prep_episodes` collection tracks full lifecycle (draft → submitted → ready_for_review)
- [ ] Supabase labels table is accessible (if using label features)
- [ ] Crowdfunding JSON file is created and persists across restarts

---

## Part 4 — Running Existing Automated Tests

Both backends have existing test suites that should pass before and after any configuration changes:

```bash
# DoctorAPP backend (61 tests)
cd DoctorAPP/back-end
pip install -r requirements.txt
python -m pytest tests/ -v

# PatientMobileAPP backend (115 tests, 3 pre-existing failures unrelated to integration)
cd PatientMobileAPP/backend
pip install -r requirements.txt
python -m pytest tests/ -v
```

These test suites mock external dependencies (MongoDB, OpenAI, DoctorAPP) and do not require running services. They validate schema contracts, route handlers, and business logic in isolation.
