# PatientMobileAPP ↔ DoctorAPP Technical Integration Plan

## Purpose
This document is the implementation plan for making `PatientMobileAPP` the **primary patient-facing intake surface** and `DoctorAPP` the **primary clinician-facing workspace**.

It is intended for an AI software engineer to execute incrementally.

## Product Decision
- **PatientMobileAPP** is the default patient experience for pre-visit preparation.
- **DoctorAPP** remains the source of truth for patient roster, appointment scheduling, clinician review, and dashboard analysis.
- The existing DoctorAPP web intake remains available only as a **fallback path**.
- Patients should only see a **neutral summary** and **questions to ask**.
- Clinicians continue to see the full analysis/dashboard experience.

---

## Existing Repository Areas

### PatientMobileAPP
Relevant existing files/routes:
- `PatientMobileAPP/frontend/mobile-app/app/_layout.tsx`
- `PatientMobileAPP/frontend/mobile-app/app/onboarding`
- `PatientMobileAPP/frontend/mobile-app/app/(tabs)/_layout.tsx`
- `PatientMobileAPP/frontend/mobile-app/app/(tabs)/scanner.tsx`
- `PatientMobileAPP/frontend/mobile-app/app/(tabs)/triage.tsx`
- `PatientMobileAPP/frontend/mobile-app/app/(tabs)/vitals.tsx`
- `PatientMobileAPP/frontend/mobile-app/services/api.ts`

Current mobile app shell already supports:
- dedicated onboarding stack entry
- tab-based navigation
- scanner flow
- triage/check-in flow
- vitals view

### DoctorAPP
Relevant existing areas from repo documentation:
- `DoctorAPP/front-end/src/app/patients/page.tsx`
- `DoctorAPP/front-end/src/app/patients/_components/AddPatientModal.tsx`
- `DoctorAPP/front-end/src/app/patients/_components/ScheduleModal.tsx`
- `DoctorAPP/front-end/src/app/schedule/page.tsx`
- `DoctorAPP/front-end/src/app/intake/[token]/page.tsx`
- `DoctorAPP/front-end/src/app/dashboard/[patientId]/page.tsx`
- `DoctorAPP/front-end/src/lib/api.ts`
- `DoctorAPP/back-end/app/routes/patients.py`
- `DoctorAPP/back-end/app/routes/appointments.py`
- `DoctorAPP/back-end/app/routes/intake.py`
- `DoctorAPP/back-end/app/routes/webhook.py`
- `DoctorAPP/back-end/app/routes/analyze.py`
- `DoctorAPP/back-end/app/models/patient_management.py`

---

## Target System Behavior

### End-to-end flow
1. Clinician creates patient in DoctorAPP.
2. Clinician schedules appointment in DoctorAPP.
3. DoctorAPP creates a **prep episode** for that appointment and sends a mobile invite.
4. Patient opens invite in PatientMobileAPP onboarding.
5. Patient completes:
   - check-in / symptom narrative
   - optional document scan/upload
   - optional health data inclusion
6. Patient submits prep package.
7. DoctorAPP backend stores the prep package and marks appointment as submitted.
8. Existing analysis pipeline runs against the submitted package.
9. DoctorAPP dashboard shows clinician-facing results.
10. PatientMobileAPP shows only patient-safe summary and questions to ask.

---

## Core Technical Strategy

### Strategy summary
Do **not** merge the apps.

Instead:
- keep both frontends separate
- make DoctorAPP backend the primary orchestration/service layer for appointment-linked prep
- let PatientMobileAPP call DoctorAPP APIs for invite resolution, prep save/submit, and summary retrieval
- optionally keep PatientMobileAPP’s existing backend for standalone features that are not part of appointment prep

### Why
DoctorAPP already owns:
- patients
- appointments
- intake token concepts
- analysis pipeline
- clinician dashboard

The simplest stable architecture is to make DoctorAPP backend own the appointment-prep lifecycle.

---

## New Shared Domain Concepts

### 1. Prep Episode
Introduce a new appointment-linked concept in DoctorAPP backend:
- `PrepEpisode`

Recommended fields:
- `id`
- `patient_id`
- `appointment_id`
- `invite_token`
- `status`
- `invite_sent_at`
- `invite_opened_at`
- `started_at`
- `submitted_at`
- `reviewed_at`
- `source` (`mobile`, `web_fallback`)
- `checkin_payload`
- `documents[]`
- `health_data_payload`
- `patient_safe_summary`
- `questions_to_ask[]`
- `analysis_response`
- `created_at`
- `updated_at`

### 2. Prep Status Lifecycle
Recommended internal states:
- `draft`
- `invite_sent`
- `invite_opened`
- `started`
- `in_progress`
- `submitted`
- `analysis_running`
- `ready_for_review`
- `reviewed`
- `fallback_web_used`

Recommended doctor-facing simplified labels:
- `Not started`
- `In progress`
- `Submitted`
- `Ready for review`
- `Reviewed`

### 3. Provenance Model
All prep data shown in DoctorAPP should be categorized by source:
- `patient_entered`
- `patient_confirmed`
- `device_imported`
- `ai_generated`

This provenance should be preserved in storage and in dashboard rendering.

---

## Backend Changes Required (DoctorAPP)

### A. Data model changes
Update DoctorAPP persistence layer to support prep episodes.

#### Tasks
1. Add a `prep_episodes` collection/table.
2. Link each prep episode to a patient and appointment.
3. Store mobile-submitted check-in, documents, and health data separately from analysis output.
4. Store patient-safe summary separately from clinician analysis response.

#### Notes
- Do not overwrite the existing patient record with raw mobile inputs directly.
- Store the mobile prep package as a first-class object.
- Existing dashboard code can derive from `prep_episode.analysis_response` or a normalized transformed model.

### B. Invite resolution endpoints
DoctorAPP backend needs endpoints the mobile app can call.

#### Add endpoints
1. `GET /api/v1/mobile-prep/invite/{token}`
   - validate invite token
   - return patient-safe appointment context
   - mark `invite_opened_at` if first open

2. `POST /api/v1/mobile-prep/{token}/start`
   - create/mark prep as started
   - return existing draft if present

3. `POST /api/v1/mobile-prep/{token}/save-checkin`
   - save symptom narrative + confirmed symptom cards
   - status becomes `in_progress`

4. `POST /api/v1/mobile-prep/{token}/save-documents`
   - save uploaded/scanned document metadata and summaries

5. `POST /api/v1/mobile-prep/{token}/save-health-data`
   - save included vitals/wearable payload

6. `POST /api/v1/mobile-prep/{token}/submit`
   - finalize prep package
   - generate patient-safe summary + questions to ask
   - trigger analysis pipeline
   - mark status `analysis_running`

7. `GET /api/v1/mobile-prep/{token}/summary`
   - return patient-safe summary and questions to ask

8. `GET /api/v1/mobile-prep/{token}/status`
   - return current mobile-prep state for polling/resume

### C. Analysis pipeline integration
DoctorAPP currently has an analysis flow driven by web intake / mock payload concepts.

#### Required changes
1. Add a transform layer that converts mobile prep data into the existing `PatientPayload` or equivalent analysis input.
2. Use mobile check-in narrative as `patient_narrative`.
3. Map mobile health data into the analysis payload if present.
4. If health data is absent, still allow submission and analysis with partial context.
5. Persist clinician-facing `AnalysisResponse` to the prep episode.
6. Mark status `ready_for_review` when pipeline completes successfully.

### D. Patient-safe summary generator
Add a separate backend function/service for patient-safe output.

#### Requirements
- must not include diagnosis ranking
- must not include condition match probabilities
- must not include alarming clinical phrasing
- may include:
  - neutral summary of reported concerns
  - impact on daily life
  - what was shared
  - questions to ask the clinician

#### Implementation note
This can be:
- LLM-generated with a strict patient-safe prompt, or
- template-generated from structured inputs, or
- hybrid approach

Strongly recommend a dedicated patient-safe prompt/service rather than reusing clinician analysis output.

---

## Frontend Changes Required (PatientMobileAPP)

### A. Routing / app shell
Use existing shell; do not redesign from scratch.

#### Existing base files
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`

#### Required changes
1. Make `onboarding` route the deep-link target for appointment invite flow.
2. Pass invite token through onboarding into subsequent steps.
3. Add resume behavior so partially completed prep can continue.
4. Add a new patient-safe summary route/screen if not already present.

### B. Onboarding route
Repurpose onboarding for appointment-specific prep.

#### Requirements
On onboarding load:
- read invite token from deep link
- call DoctorAPP `GET /mobile-prep/invite/{token}`
- show appointment context
- start prep when user continues

#### Screen output
- appointment info
- short explanation of prep process
- CTA to continue into check-in

### C. Triage tab (`triage.tsx`)
Keep this as the main symptom check-in surface.

#### Required changes
1. Reframe copy from generic triage to appointment prep / visit check-in.
2. Persist:
   - raw free text
   - returned symptom cards
   - confirmed/dismissed selections
3. After confirmation flow completes, save result via DoctorAPP `save-checkin` endpoint.
4. Add affordance to continue to documents or health data.
5. Add resume state if the user leaves and returns.

#### Data to send
Recommended payload:
- `raw_text`
- `extracted_symptoms[]`
- `confirmed_symptoms[]`
- `dismissed_symptoms[]`
- optional severity/context if available

### D. Scanner tab (`scanner.tsx`)
Keep as document-support flow.

#### Required changes
1. Reframe copy from standalone scanner to “Add document for your visit”.
2. Preserve AI summary behavior.
3. Replace or demote nutrition-specific output if not relevant to appointment prep.
4. Add “share with care team” state per scanned item.
5. Save selected shared items via DoctorAPP `save-documents` endpoint.

#### Data to send
Per document item:
- `document_id`
- `local/remote asset reference`
- `document_type` (if available)
- `patient_note`
- `ai_summary_bullets[]`
- `shared: boolean`
- uploaded timestamp

### E. Vitals tab (`vitals.tsx`)
Use as optional health-data review/inclusion layer.

#### Required changes
1. Reframe from generic vitals demo to “health data for this visit”.
2. Distinguish demo/mock state from real connected data.
3. Allow patients to explicitly include or exclude the data for this appointment.
4. Save included data via DoctorAPP `save-health-data` endpoint.

#### Data to send
- source (`apple_health`, `mock`, etc.)
- sync timestamp
- included metrics
- metric series summary or raw payload depending backend needs

### F. New summary screen
Add a patient-facing summary route.

#### Requirements
After submit:
- call `GET /mobile-prep/{token}/summary`
- show neutral summary
- show “questions to ask”
- do not show diagnosis candidates or risk ranking

---

## Frontend Changes Required (DoctorAPP)

### A. Patients list
Relevant area:
- `DoctorAPP/front-end/src/app/patients/page.tsx`

#### Required changes
1. Add prep status to patient cards/rows.
2. Display next appointment prep state.
3. Add indicators for:
   - invite sent
   - in progress
   - submitted
   - ready for review
4. Add quick action to resend mobile invite.

### B. Schedule modal
Relevant area:
- `DoctorAPP/front-end/src/app/patients/_components/ScheduleModal.tsx`

#### Required changes
1. On appointment creation, create prep episode automatically.
2. Default CTA should become “Schedule & send prep invite”.
3. Generate mobile invite token/deep link.
4. Trigger email/SMS invite message.
5. Expose web fallback link as secondary action only.

### C. Schedule page
Relevant area:
- `DoctorAPP/front-end/src/app/schedule/page.tsx`

#### Required changes
1. Show prep state per appointment.
2. Allow staff to filter by prep status.
3. Surface “not started / submitted / ready” so the clinic can follow up.

### D. Dashboard entry and dashboard page
Relevant area:
- `DoctorAPP/front-end/src/app/dashboard/[patientId]/page.tsx`

#### Required changes
1. Add prep status header.
2. Add a “What patient shared” section separate from AI analysis.
3. Show:
   - raw narrative
   - confirmed symptoms
   - shared documents
   - included health data
4. Keep clinician analysis sections below that.
5. If prep not yet submitted, show non-ready state instead of trying to render full dashboard.

### E. Existing web intake route
Relevant area:
- `DoctorAPP/front-end/src/app/intake/[token]/page.tsx`

#### Required changes
1. Reposition as fallback-only route.
2. Update copy to indicate mobile app is preferred when applicable.
3. Mark prep episode source as `web_fallback` when used.
4. Ensure both mobile and fallback web routes can feed the same backend prep episode model.

---

## API Contract / Payload Design

### Invite resolution response
Recommended shape:
```json
{
  "prep_episode_id": "prep_123",
  "patient_id": "pt_123",
  "appointment_id": "appt_123",
  "status": "invite_sent",
  "patient_first_name": "Jane",
  "appointment": {
    "date": "2026-03-20",
    "time": "10:30",
    "clinic_name": "MyHealthPal Clinic",
    "clinician_name": "Dr. Smith"
  },
  "can_resume": true,
  "has_submitted": false
}
```

### Save check-in payload
```json
{
  "raw_text": "I have had abdominal pain for four days...",
  "extracted_symptoms": [
    { "id": "sym_1", "label": "abdominal pain", "severity": 4 },
    { "id": "sym_2", "label": "fatigue", "severity": 3 }
  ],
  "confirmed_symptoms": ["sym_1", "sym_2"],
  "dismissed_symptoms": []
}
```

### Save documents payload
```json
{
  "documents": [
    {
      "document_id": "doc_1",
      "title": "Lab instruction sheet",
      "summary_bullets": ["...", "..."],
      "patient_note": "I got this at urgent care.",
      "shared": true
    }
  ]
}
```

### Save health-data payload
```json
{
  "source": "apple_health",
  "sync_timestamp": "2026-03-13T12:00:00Z",
  "metrics": {
    "restingHeartRate": [],
    "stepCount": []
  },
  "shared": true
}
```

### Submit response
```json
{
  "status": "analysis_running",
  "summary_ready": false,
  "prep_episode_id": "prep_123"
}
```

### Patient-safe summary response
```json
{
  "status": "ready",
  "summary": [
    "You reported abdominal pain, fatigue, and reduced activity.",
    "You shared that this has affected sleep and daily routines."
  ],
  "questions_to_ask": [
    "What possibilities should we rule out based on these symptoms?",
    "What tests or next steps would help explain this pain?",
    "What should make me seek urgent care?"
  ]
}
```

---

## Deep-Link / Invite Plan

### Requirements
DoctorAPP must generate links that open PatientMobileAPP onboarding directly.

### Recommended format
- custom scheme for app install path, e.g. `myhealthpal://onboarding?token=...`
- universal link / fallback web URL if available

### DoctorAPP invite behavior
1. Appointment created.
2. Prep episode created.
3. Invite token generated.
4. Email/SMS contains:
   - primary mobile deep link
   - fallback web intake link
5. Opening the deep link routes to mobile onboarding.

### Mobile app responsibilities
- parse token
- call invite resolution endpoint
- continue or resume prep state

---

## Suggested File-Level Work Breakdown

### DoctorAPP backend
Likely touch:
- `DoctorAPP/back-end/app/routes/appointments.py`
- `DoctorAPP/back-end/app/routes/intake.py`
- `DoctorAPP/back-end/app/routes/analyze.py`
- `DoctorAPP/back-end/app/routes/webhook.py`
- `DoctorAPP/back-end/app/models/patient_management.py`
- add new route module, e.g. `DoctorAPP/back-end/app/routes/mobile_prep.py`
- add new service module, e.g. `DoctorAPP/back-end/app/services/patient_safe_summary.py`
- add new transform service for mobile payload → analysis payload

### DoctorAPP frontend
Likely touch:
- `DoctorAPP/front-end/src/app/patients/page.tsx`
- `DoctorAPP/front-end/src/app/patients/_components/ScheduleModal.tsx`
- `DoctorAPP/front-end/src/app/schedule/page.tsx`
- `DoctorAPP/front-end/src/app/dashboard/[patientId]/page.tsx`
- `DoctorAPP/front-end/src/lib/api.ts`

### PatientMobileAPP frontend
Likely touch:
- `PatientMobileAPP/frontend/mobile-app/app/_layout.tsx`
- `PatientMobileAPP/frontend/mobile-app/app/onboarding/*`
- `PatientMobileAPP/frontend/mobile-app/app/(tabs)/triage.tsx`
- `PatientMobileAPP/frontend/mobile-app/app/(tabs)/scanner.tsx`
- `PatientMobileAPP/frontend/mobile-app/app/(tabs)/vitals.tsx`
- `PatientMobileAPP/frontend/mobile-app/services/api.ts`
- add new patient-safe summary screen/route

---

## Implementation Phases

### Phase 1 — Backend foundation
Deliverables:
- prep episode model/storage
- mobile prep endpoints
- invite token resolution
- submit endpoint
- patient-safe summary service

Exit criteria:
- backend can receive and store mobile prep data independently of DoctorAPP web intake

### Phase 2 — Mobile onboarding + check-in integration
Deliverables:
- deep-link into onboarding
- invite resolution API integration
- triage check-in saved to DoctorAPP backend
- resume in-progress prep

Exit criteria:
- patient can open invite and save check-in data linked to an appointment

### Phase 3 — Documents and health data integration
Deliverables:
- scanner outputs saved as appointment-linked documents
- vitals inclusion saved to prep episode
- submit composes complete prep package

Exit criteria:
- patient can submit full prep package from mobile app

### Phase 4 — Clinician workflow integration
Deliverables:
- DoctorAPP patient/schedule views show prep status
- schedule modal sends mobile invite
- dashboard reads prep episode and analysis results
- web intake becomes fallback-only path

Exit criteria:
- clinic can operate using mobile-first prep end to end

### Phase 5 — Hardening and rollout
Deliverables:
- analytics/logging
- failure handling
- retry/resume behavior
- docs for staff workflow
- QA across fallback and mobile paths

Exit criteria:
- stable mobile-first rollout with fallback support

---

## Non-Goals for First Iteration
- full auth/account unification across both apps if invite token flow is sufficient
- replacing all PatientMobileAPP standalone/community/funding functionality
- removing existing web intake immediately
- exposing clinician analysis output directly to patients

---

## Risks and Mitigations

### Risk: duplicated intake models across mobile and web
Mitigation:
- normalize both into a shared prep episode model in DoctorAPP backend

### Risk: patient sees inappropriate clinical output
Mitigation:
- separate patient-safe summary service from clinician analysis pipeline

### Risk: wearable data is unavailable or flaky
Mitigation:
- make health data optional and never block submission

### Risk: clinic staff confusion during transition
Mitigation:
- surface prep statuses clearly and keep web fallback available

### Risk: partial/incomplete prep packages break dashboard logic
Mitigation:
- make dashboard resilient to missing docs/health data and only require core check-in narrative

---

## Acceptance Criteria

### Backend
- mobile invite token resolves to appointment-linked prep context
- mobile prep data can be saved incrementally
- submit triggers analysis pipeline
- patient-safe summary is retrievable separately
- clinician analysis remains available in DoctorAPP

### PatientMobileAPP
- patient can open invite and complete onboarding
- patient can submit check-in linked to appointment
- patient can optionally add documents and health data
- patient sees neutral summary and questions to ask only

### DoctorAPP
- staff can send mobile prep invite during scheduling
- patient/schedule screens show prep status
- dashboard can review mobile-submitted prep package
- web intake works only as fallback and feeds same backend model

---

## Recommended First PR Sequence
1. DoctorAPP backend: prep episode model + endpoints
2. PatientMobileAPP: onboarding invite resolution + check-in save
3. PatientMobileAPP: documents + health data save
4. DoctorAPP frontend: schedule modal + status badges
5. DoctorAPP dashboard: prep package rendering + provenance separation
6. patient-safe summary screen and final UX pass

---

## Architecture Review — Structured Feedback

> Review conducted against the eight dimensions requested: completeness,
> data contracts, auth, error handling, sequencing, scalability, gaps
> vs assumptions, and quick wins / red flags.

### 1. Completeness

**Strengths**
- End-to-end lifecycle well defined (invite → submit → review).
- Provenance model (`patient_entered`, `device_imported`, etc.) adds
  auditability that investors will notice.

**Gaps to address**
- **Token expiry**: The plan does not specify an invite-token TTL. Tokens
  that never expire are a security and data-quality risk. Add a
  `invite_expires_at` field to `PrepEpisode` and enforce it on
  resolution.
- **Concurrent editing**: No mention of what happens when a patient has
  two tabs/devices open simultaneously. Consider `updated_at`-based
  optimistic locking for saves.
- **Offline support**: Mobile app may lose connectivity mid-prep. The
  plan should explicitly state that local draft state is persisted
  on-device and synced on reconnect.
- **Notification delivery tracking**: The plan generates invite emails
  but does not track bounces or delivery status. Surface a
  `invite_delivery_status` field so clinic staff know whether the
  patient actually received the link.

### 2. Data Flow & Contracts

**Strengths**
- Payload examples are concrete and JSON-ready — easy to implement.
- Provenance labeling is cleanly separated from data content.

**Gaps to address**
- **Error response schema**: Only happy-path payloads are defined.
  Standardise error shapes, e.g.
  `{"detail": "...", "code": "TOKEN_EXPIRED"}`.
- **API versioning**: Endpoints use `/api/v1/` — good. Ensure the
  mobile app pins to `v1` so breaking changes can be introduced in
  `v2` without affecting deployed clients.
- **Pagination**: `save-documents` accepts an unbounded list. Set a
  `max_documents` limit (e.g. 20) to prevent abuse.
- **Idempotency**: `save-checkin` and `save-documents` should be
  idempotent (PUT semantics) so retries after network failure don't
  create duplicates.

### 3. Authentication & Authorization

**Strengths**
- Token-only flow is pragmatic for the first iteration and minimises
  patient friction (no account creation required).

**Red flags**
- **Token as sole auth**: UUID v4 invite tokens are unguessable but
  anyone with the link has full access. For demo this is acceptable;
  for production, layer a short-lived JWT or OTP on top.
- **No rate limiting**: The mobile-prep endpoints accept unlimited
  requests per token. Add basic rate limiting (e.g. 60 req/min/token)
  to prevent abuse.
- **CORS policy**: DoctorAPP backend currently allows `*` origins. The
  mobile-prep endpoints should restrict origins to the known mobile
  app and web fallback domains before production.
- **Token revocation**: No mechanism to invalidate a leaked token. Add
  a `revoked` status to `PrepEpisode` and a staff-facing "revoke
  invite" action.

### 4. Error Handling & Resilience

**Strengths**
- Health data is optional and never blocks submission — good.
- Dashboard is designed to be resilient to missing docs/health data.

**Gaps to address**
- **Retry / resume**: The plan mentions "resume behavior" for the
  mobile app but does not specify the backend contract. The `start`
  endpoint should return existing draft state so the client can
  continue from where it left off (implemented in Phase 1 code).
- **Analysis pipeline failure**: If the pipeline fails after submit,
  the status remains `analysis_running` forever. Add a timeout-based
  fallback that sets status to `analysis_failed` and surfaces a
  retry action.
- **Partial save validation**: `save-checkin` should validate minimum
  content (e.g. `raw_text` must be non-empty) to prevent blank
  submissions reaching the analysis pipeline.
- **Network timeout guidance**: Mobile clients should implement
  exponential backoff for save/submit calls, with clear UX for
  "saving…" vs "failed to save" states.

### 5. Sequencing & Dependencies

**Strengths**
- Five-phase plan is well-ordered with clear exit criteria per phase.
- Backend-first approach is correct — mobile can develop against
  mocked/stub endpoints in parallel.

**Concerns**
- **Phase 1 is large**: Prep episode model + eight endpoints + summary
  service + transform layer is a lot for one phase. Consider splitting
  into 1a (model + CRUD) and 1b (submit + summary + transform).
- **Deep-link infrastructure**: Phase 2 assumes deep-link routing
  works. On iOS this requires Associated Domains entitlement and an
  `apple-app-site-association` file hosted on the web. This has a
  non-trivial setup time and should be started in Phase 1 as a
  parallel track.
- **Email/SMS dependency**: Invite delivery requires a working SMTP
  or SMS gateway. Ensure this is testable locally (the existing
  `aiosmtplib` integration is already in place).

### 6. Scalability Concerns

**Strengths**
- MongoDB is a good fit for the document-shaped prep episode model.
- Analysis pipeline runs asynchronously (background task).

**Concerns**
- **Analysis pipeline is synchronous in the current intake route**:
  The existing `POST /intake/{token}/submit` runs the full RAG
  pipeline in-request. For mobile prep, analysis should be queued
  (e.g. via a task queue or background worker) to avoid HTTP
  timeouts.
- **No caching layer**: Patient-safe summaries and status responses
  will be polled frequently. Consider a short-TTL cache (even
  in-memory) for `/status` and `/summary` endpoints.
- **Document storage**: `save-documents` currently stores metadata
  only. When actual file uploads are added, use object storage (S3)
  with pre-signed URLs rather than storing blobs in MongoDB.
- **Connection pooling**: MongoDB connection is shared via
  `app.state`. This is fine for a demo but should use a connection
  pool for production load.

### 7. Gaps vs. Assumptions

| Assumption | Status | Action needed |
|---|---|---|
| MongoDB Atlas is available and seeded | Assumed | Verify connection string in CI/deploy |
| Email service (SMTP) works | Assumed | Add smoke test; provide fallback "copy link" |
| Mobile deep-link routing is configured | Assumed | Requires iOS/Android platform config |
| PatientMobileAPP can reach DoctorAPP backend | Assumed | Document network/CORS requirements |
| Single patient per invite token | Assumed | Enforce uniqueness constraint on `invite_token` |
| Analysis pipeline accepts partial data | Partially validated | Mock-data fallback exists; test edge cases |
| Patient will have connectivity during prep | Assumed | Design offline-first local storage |

### 8. Quick Wins & Red Flags

**Strongest parts (Quick Wins)**
- **PrepEpisode model** is clean and well-designed — single source of
  truth for the entire mobile-prep lifecycle.
- **Patient-safe summary separation** from clinician analysis is a
  strong architectural decision that reduces liability risk.
- **Incremental save endpoints** allow the patient to save progress
  step-by-step, which is excellent UX.
- **Provenance model** is a differentiator for investor demos —
  clinicians can see exactly what came from the patient vs AI vs
  device.

**Riskiest parts (Red Flags)**
- 🔴 **No auth beyond invite tokens**: Fine for demo, but must be
  addressed before any real patient data flows through the system.
- 🔴 **Synchronous analysis pipeline**: Will cause timeouts under
  load. Queue-based processing is essential for production.
- 🟡 **Deep-link setup complexity**: iOS Universal Links require
  server-side config and Apple Developer account changes. This could
  block the demo if not started early.
- 🟡 **Email deliverability**: SMTP-based email may land in spam
  folders. For the demo, consider a "copy invite link" fallback in
  the DoctorAPP UI.