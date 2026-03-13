# Frontend ↔ Backend Gap Remediation Plan

## Purpose

An audit of the MyHealthPal repository identified **9 gaps** where backend services lack frontend consumers or frontend pages operate on mock/local data with no backend persistence. This document provides a detailed, actionable remediation plan for each gap, ordered by priority.

---

## Gap Summary

| # | App | Gap | Type | Priority |
|---|-----|-----|------|----------|
| 1 | DoctorAPP | Notes page has no backend persistence | Frontend-only | 🔴 Critical |
| 2 | DoctorAPP | Schedule page uses hardcoded mock data | Frontend-only | 🔴 Critical |
| 3 | PatientMobileAPP | `funding.tsx` ignores existing `/campaigns` API | Both exist, disconnected | 🟠 High |
| 4 | PatientMobileAPP | `community.tsx` uses hardcoded mock data | Frontend-only | 🟠 High |
| 5 | PatientMobileAPP | `settings.tsx` has no backend profile persistence | Frontend-only | 🟡 Medium |
| 6 | PatientMobileAPP | `POST /check-in/action-plan` is never called | Backend-only | 🟡 Medium |
| 7 | PatientMobileAPP | `POST /labels` is never called | Backend-only | 🟡 Medium |
| 8 | DoctorAPP | `POST /api/v1/analyze-patient` unused by frontend | Backend-only | 🟢 Low |
| 9 | PatientMobileAPP | `analyzePatient()` defined in api.ts but never imported | Dead code | 🟢 Low |

---

## Gap 1 — DoctorAPP Notes: No Backend Persistence

### Current State

- **Frontend page:** `DoctorAPP/front-end/src/app/notes/[patientId]/page.tsx` renders a two-column layout with a `NotesEditor` component on the left and a research sidebar on the right.
- **NotesEditor** (`DoctorAPP/front-end/src/app/notes/[patientId]/NotesEditor.tsx`) is a client component that stores notes in local `useState` only:

```tsx
const [notes, setNotes] = useState("");
// No save, no API call — notes are lost on refresh
```

- **Backend:** No notes-related endpoint exists anywhere in `DoctorAPP/back-end/app/routes/`.

### What Needs to Happen

#### 1.1 Create a Notes Model

**File:** `DoctorAPP/back-end/app/models/notes.py`

Define a Pydantic model following the existing pattern in `patient_management.py`:

```python
class ClinicalNote(BaseModel):
    id: str                          # UUID
    patient_id: str                  # Links to patient
    appointment_id: Optional[str]    # Optionally links to appointment
    content: str                     # The note text
    created_at: str                  # ISO 8601
    updated_at: str                  # ISO 8601
```

#### 1.2 Add Notes CRUD Endpoints

**File:** `DoctorAPP/back-end/app/routes/notes.py`

Follow the MongoDB access pattern established in `patients.py` (uses `request.app.state.mongo_client[request.app.state.db_name]`):

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/patients/{patient_id}/notes` | List all notes for a patient, ordered by `updated_at` desc |
| `POST` | `/api/v1/patients/{patient_id}/notes` | Create a new note (generate `id`, set timestamps) |
| `PUT` | `/api/v1/patients/{patient_id}/notes/{note_id}` | Update note content, bump `updated_at` |
| `DELETE` | `/api/v1/patients/{patient_id}/notes/{note_id}` | Delete a note |

Register the router in `main.py` alongside the existing routers.

#### 1.3 Add API Client Functions

**File:** `DoctorAPP/front-end/src/lib/api.ts`

Add functions following the existing pattern (`fetchPatients`, `createPatient`, etc.):

```typescript
export async function getPatientNotes(patientId: string): Promise<ClinicalNote[]>
export async function savePatientNote(patientId: string, content: string): Promise<ClinicalNote>
export async function updatePatientNote(patientId: string, noteId: string, content: string): Promise<ClinicalNote>
export async function deletePatientNote(patientId: string, noteId: string): Promise<void>
```

#### 1.4 Update NotesEditor Component

**File:** `DoctorAPP/front-end/src/app/notes/[patientId]/NotesEditor.tsx`

- Accept `patientId` as a prop.
- On mount, call `getPatientNotes(patientId)` to load existing notes.
- Auto-save on a debounce (e.g. 1 second after typing stops) via `savePatientNote` or `updatePatientNote`.
- Show a save status indicator (e.g. "Saved" / "Saving…").

#### 1.5 Tests

**File:** `DoctorAPP/back-end/tests/test_notes.py`

Follow the existing test pattern in `test_intake.py` — use the `_make_client()` factory that mocks `app.state.mongo_client`, `db_name`, and `embedding_model`. Test all four CRUD operations.

---

## Gap 2 — DoctorAPP Schedule: Hardcoded Mock Data

### Current State

- **Frontend page:** `DoctorAPP/front-end/src/app/(main)/schedule/page.tsx` displays a daily schedule of 5 appointments that are entirely hardcoded:

```tsx
const scheduleEntries: ScheduleEntry[] = [
  { time: "8:30 AM", name: "Amara Osei", type: "New Patient", status: "In Progress", ... },
  { time: "10:30 AM", name: "David Chen", type: "Lab Review", status: "Confirmed", ... },
  // 3 more hardcoded entries
];
```

- **Backend:** `GET /api/v1/appointments/{patient_id}` exists and returns `list[AppointmentRecord]`, but the schedule page never calls it. There is no endpoint to list *all* appointments across patients for a given date.

### What Needs to Happen

#### 2.1 Add a Date-Based Appointments Endpoint

**File:** `DoctorAPP/back-end/app/routes/appointments.py`

Add a new endpoint for fetching all appointments on a given date (needed by the schedule view which shows all patients):

```
GET /api/v1/appointments?date=2026-03-13
```

Return a list of `AppointmentRecord` objects filtered by date, sorted by time. This avoids requiring the frontend to know all patient IDs.

#### 2.2 Add API Client Function

**File:** `DoctorAPP/front-end/src/lib/api.ts`

```typescript
export async function fetchAppointmentsByDate(date: string): Promise<AppointmentRecord[]>
```

#### 2.3 Update Schedule Page

**File:** `DoctorAPP/front-end/src/app/(main)/schedule/page.tsx`

- Remove the hardcoded `scheduleEntries` array.
- Call `fetchAppointmentsByDate(selectedDate)` on mount and whenever the user clicks the previous/next day buttons.
- Map `AppointmentRecord[]` to `ScheduleEntry[]` format (the UI shape can remain the same).
- Derive `summaryStats` and `typeBreakdown` dynamically from the fetched data.
- Handle loading and empty states.

#### 2.4 Tests

**File:** `DoctorAPP/back-end/tests/test_appointments.py`

Add tests for the new date-filtered list endpoint, following the `_make_client()` pattern.

---

## Gap 3 — PatientMobileAPP Funding: Mock Data Ignoring Existing Backend

### Current State

- **Backend:** `PatientMobileAPP/backend/app/crowdfunding.py` exposes 5 fully implemented endpoints under `/campaigns`:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/campaigns` | Create campaign |
| `GET` | `/campaigns` | List all campaigns |
| `GET` | `/campaigns/{id}` | Get campaign detail with `total_raised` |
| `POST` | `/campaigns/{id}/contributions` | Create contribution |
| `GET` | `/campaigns/{id}/contributions` | List contributions |

- **Frontend:** `funding.tsx` (778 lines) uses hardcoded mock data:

```tsx
const MOCK_DONORS = [
  { id: "d1", initials: "AK", amount: 50, timeAgo: "2 h ago" },
  // 4 more mock donors
];
const GOAL = 2000;
const INITIAL_RAISED = 1240;
```

Donation buttons (`simulateDonation`, `fillToGoal`) only modify local state — no API calls are made.

### What Needs to Happen

#### 3.1 Add Campaign API Functions to Mobile Client

**File:** `PatientMobileAPP/frontend/mobile-app/services/api.ts`

Follow the existing pattern (`postTranslate`, `postTriageExtract`) to add:

```typescript
export async function createCampaign(data: CampaignCreate): Promise<CampaignResponse>
export async function listCampaigns(): Promise<CampaignResponse[]>
export async function getCampaign(campaignId: string): Promise<CampaignDetailResponse>
export async function createContribution(campaignId: string, data: ContributionCreate): Promise<ContributionResponse>
export async function listContributions(campaignId: string): Promise<ContributionResponse[]>
```

#### 3.2 Update funding.tsx

**File:** `PatientMobileAPP/frontend/mobile-app/app/(tabs)/funding.tsx`

- Remove `MOCK_DONORS`, `GOAL`, and `INITIAL_RAISED` constants.
- On mount, call `getCampaign(campaignId)` to fetch the user's active campaign (or `listCampaigns()` and filter).
- Populate the progress card from `CampaignDetailResponse.total_raised` and `goal_amount`.
- Call `listContributions(campaignId)` to populate the "Recent Supporters" section.
- Replace `simulateDonation()` with a real `createContribution()` call.
- Remove the `fillToGoal` debug button.
- Add a campaign creation flow if no campaign exists (using the "About Me" and "Case Description" fields that are already in the UI).

#### 3.3 Tests

**Backend tests already exist** for the crowdfunding router. Frontend integration testing should verify the API calls are wired correctly.

---

## Gap 4 — PatientMobileAPP Community: Hardcoded Mock Data

### Current State

- **Frontend:** `community.tsx` displays 10 hardcoded community funding requests with progress bars, category chips, and a "Contribute" button:

```tsx
const REQUESTS: CommunityRequest[] = [
  { id: "r01", title: "Iron supplements for anemia recovery", amount: 28, raised: 18, ... },
  // 9 more hardcoded requests
];
```

- **Backend:** The `/campaigns` endpoints already support listing campaigns and creating contributions, but `community.tsx` doesn't use them.

### What Needs to Happen

#### 4.1 Update community.tsx

**File:** `PatientMobileAPP/frontend/mobile-app/app/(tabs)/community.tsx`

- Remove the hardcoded `REQUESTS` array.
- On mount, call `listCampaigns()` to fetch all active community campaigns.
- Map `CampaignResponse[]` → `CommunityRequest[]` UI shape (the CampaignResponse already has `title`, `description`, `goal_amount`, and — via `CampaignDetailResponse` — `total_raised`).
- Wire the "Contribute" button to call `createContribution(campaignId, { contributor_identifier, amount })`.
- Add a contribution amount input (modal or inline).
- Add pull-to-refresh and loading/empty states.

#### 4.2 Extend Campaign Model (Optional)

The `CommunityRequest` interface includes `category` and `aboutMe` fields that don't exist in `CampaignCreate`. Consider adding:

```python
class CampaignCreate(BaseModel):
    ...
    category: Optional[str] = None   # "Supplements", "Pain Mgmt", "Monitoring", "Recovery"
    about_me: Optional[str] = None   # Requester bio for community display
```

#### 4.3 Tests

Add backend tests for the new campaign fields (if added). Frontend integration testing should verify the list + contribute flow.

---

## Gap 5 — PatientMobileAPP Settings: No Backend Profile Persistence

### Current State

- **Frontend:** `settings.tsx` reads demographics from the Zustand `usePatientStore` (age, sex, ethnicity, language, email). Data is populated during onboarding and stored in-memory only — it's lost when the app is force-closed or cache-cleared.
- **Backend:** No profile or settings endpoint exists.

### What Needs to Happen

#### 5.1 Add a Profile Endpoint

**File:** `PatientMobileAPP/backend/app/profile.py`

```python
router = APIRouter(prefix="/profile", tags=["profile"])

class ProfilePayload(BaseModel):
    age: Optional[int]
    sex: Optional[str]
    primary_language: Optional[str]
    ethnicity: list[str]
    email: Optional[str]

@router.get("/{patient_id}")
async def get_profile(patient_id: str) -> ProfilePayload: ...

@router.put("/{patient_id}")
async def update_profile(patient_id: str, payload: ProfilePayload) -> ProfilePayload: ...
```

Storage can use the existing Supabase connection (like `labels.py`) or a local JSON store (like `crowdfunding.py`).

Register the router in `main.py`.

#### 5.2 Add API Client Function

**File:** `PatientMobileAPP/frontend/mobile-app/services/api.ts`

```typescript
export async function getProfile(patientId: string): Promise<ProfilePayload>
export async function updateProfile(patientId: string, data: ProfilePayload): Promise<ProfilePayload>
```

#### 5.3 Sync Store with Backend

**File:** `PatientMobileAPP/frontend/mobile-app/store/patientStore.ts`

- On app launch (in `_layout.tsx`), call `getProfile()` and hydrate the store.
- When the user completes onboarding or edits settings, call `updateProfile()` to persist.
- This ensures data survives app reinstalls.

#### 5.4 Tests

**File:** `PatientMobileAPP/backend/tests/test_profile.py`

Test GET/PUT for the profile endpoint, following the existing `pytest + FastAPI TestClient + monkeypatch` patterns.

---

## Gap 6 — PatientMobileAPP Action Plan: Backend Endpoint Never Called

### Current State

- **Backend:** `POST /check-in/action-plan` is fully implemented in `check_in.py`. It accepts confirmed/rejected symptom card IDs plus a transcript, calls GPT-4o, and returns:

```python
class ActionPlanResponse(BaseModel):
    summary_bullets: List[str]   # 3–5 plain-language bullets
    questions: List[str]         # 5 advocacy questions for the doctor
```

- **Frontend:** `triage.tsx` handles symptom extraction (`POST /triage/extract`) and card confirmation (swipe right = confirm, swipe left = reject), but after all cards are reviewed the flow ends without calling `/check-in/action-plan`.

### What Needs to Happen

#### 6.1 Add API Client Function

**File:** `PatientMobileAPP/frontend/mobile-app/services/api.ts`

```typescript
export async function postActionPlan(data: {
    transcript: string;
    confirmed_card_ids: string[];
    rejected_card_ids: string[];
}): Promise<ActionPlanResponse>
```

#### 6.2 Add Action Plan Step to Triage Flow

**File:** `PatientMobileAPP/frontend/mobile-app/app/(tabs)/triage.tsx`

After all symptom cards have been reviewed (`allReviewed = true`):

1. Collect the `confirmed_card_ids` and `rejected_card_ids` from `usePatientStore`.
2. Call `postActionPlan({ transcript, confirmed_card_ids, rejected_card_ids })`.
3. Show a loading state while GPT-4o generates the plan.
4. Render the returned `summary_bullets` as a summary card and `questions` as a "Questions for your Doctor" list.
5. Optionally allow the user to save the plan to the prep episode via `POST /prep/{token}/save-checkin` (which already accepts a `confirmed_cards` field).

#### 6.3 Tests

The backend already has tests for `/check-in/action-plan` in `test_check_in_action_plan.py`. Frontend integration testing should verify the end-to-end flow.

---

## Gap 7 — PatientMobileAPP Labels: Backend Endpoint Never Called

### Current State

- **Backend:** `POST /labels` in `labels.py` persists training/correction data to Supabase. The `LabelPayload` model supports:
  - `flow` — which AI feature generated the output (e.g. `check_in_extract`, `vision_translate`)
  - `raw_input` — original input to the model
  - `model_output` — structured output shown to the user
  - `user_corrected` — user's corrections (if any)
  - `truth_diagnosis` — ground-truth label
  - Diversity metadata fields

- **Frontend:** No screen or component calls this endpoint. There is no UI for users to correct AI outputs and submit labels.

### What Needs to Happen

#### 7.1 Add Label Submission After AI Outputs

The `/labels` endpoint is designed for training data collection. It should be called *after* a user interacts with AI-generated outputs. The natural integration points are:

| Flow | Screen | When to Call `/labels` |
|------|--------|----------------------|
| `check_in_extract` | `triage.tsx` | After user confirms/rejects extracted symptom cards |
| `vision_translate` | `scanner.tsx` | After user reviews scanned document interpretation |
| `vitals` | `vitals.tsx` | After user confirms or corrects vitals readings |
| `check_in_action_plan` | `triage.tsx` | After user reviews action plan (once Gap 6 is resolved) |

#### 7.2 Add API Client Function

**File:** `PatientMobileAPP/frontend/mobile-app/services/api.ts`

```typescript
export async function postLabel(data: {
    flow: string;
    raw_input?: Record<string, any>;
    model_output: Record<string, any>;
    user_corrected?: Record<string, any>;
    truth_diagnosis?: string;
    notes?: string;
}): Promise<{ id: string; flow: string }>
```

#### 7.3 Add Correction UI (Optional Enhancement)

For each AI output screen, add a small "Report issue" or "Correct this" affordance that:

1. Lets the user edit/correct the AI output.
2. Calls `postLabel()` with both the original `model_output` and the `user_corrected` version.

This can be a shared component (e.g. `<LabelFeedback flow="check_in_extract" rawInput={...} modelOutput={...} />`) reused across triage, scanner, and vitals screens.

#### 7.4 Fire-and-Forget Pattern

Label submission is non-critical — it should not block the user flow. Use a fire-and-forget pattern:

```typescript
// Don't await, don't block UI
postLabel({ flow: "check_in_extract", raw_input: transcript, model_output: cards })
    .catch(console.warn);
```

#### 7.5 Tests

**Backend tests already exist** for `POST /labels` in `test_labels.py`.

---

## Gap 8 — DoctorAPP analyze-patient: Frontend Function Unused

### Current State

- **Backend:** `POST /api/v1/analyze-patient` is the full RAG diagnostic analysis pipeline (biometric deltas → embeddings → vector search → GPT-4o clinical brief). It works correctly.
- **Frontend:** `analyzePatient()` is defined in `DoctorAPP/front-end/src/lib/api.ts` but no page or component ever imports or calls it.
- **Actual usage:** The analysis pipeline is triggered *internally* by backend routes:
  - `POST /api/v1/intake/{token}/submit` calls the analysis service function directly.
  - `POST /api/v1/mobile-prep/{token}/submit` also calls the pipeline internally.
  - Clinicians view results via `GET /api/v1/patients/{patient_id}/dashboard`.

### What Needs to Happen

This is a **low-priority decision point** with two valid options:

#### Option A: Remove Dead Code

If analysis should only be triggered as part of intake/prep submission (the current design), remove the unused function:

- Delete `analyzePatient()` from `DoctorAPP/front-end/src/lib/api.ts`.
- This reduces confusion and dead code.

#### Option B: Add a Manual Re-Analysis Button

If clinicians should be able to re-run analysis on demand (e.g. after updating patient data):

- Add a "Re-analyze" button to the dashboard page (`DoctorAPP/front-end/src/app/dashboard/[patientId]/page.tsx`).
- On click, call `analyzePatient()` with the current patient payload.
- Show a loading state while analysis runs.
- Refresh the dashboard with new results.

**Recommendation:** Option A unless there is a product requirement for manual re-analysis.

---

## Gap 9 — PatientMobileAPP: No Dedicated Frontend Gap (Informational)

The previous audit flagged `analyzePatient()` in the DoctorAPP frontend as dead code. This is the same issue as Gap 8 (see above). There is no separate PatientMobileAPP-specific dead code gap — the PatientMobileAPP frontend does not reference `analyzePatient`.

---

## Implementation Order

The recommended implementation order balances user impact with dependency chains:

```
Phase 1 — Critical (data loss / non-functional UI)
├── Gap 1: Notes persistence (clinicians lose work)
└── Gap 2: Schedule real data (core clinician workflow)

Phase 2 — High (features exist but disconnected)
├── Gap 3: Funding ↔ Campaigns wiring
└── Gap 4: Community ↔ Campaigns wiring (depends on Gap 3)

Phase 3 — Medium (missing flow steps, data collection)
├── Gap 6: Action plan step in triage
├── Gap 5: Settings persistence
└── Gap 7: Label collection hooks

Phase 4 — Low (cleanup)
└── Gap 8: Remove or use analyzePatient()
```

---

## Cross-Cutting Concerns

### Error Handling

All new frontend API calls should follow the existing pattern in `services/api.ts`:
- Show user-friendly error messages on failure.
- Don't block the user flow for non-critical operations (labels, analytics).

### Loading States

Every screen that transitions from mock data to real API calls needs:
- A loading skeleton or spinner during fetch.
- An empty state when no data exists.
- Pull-to-refresh on mobile screens.

### Testing Strategy

- **Backend:** Follow the existing `pytest + FastAPI TestClient + monkeypatch` patterns. DoctorAPP tests mock MongoDB via `app.state`; PatientMobileAPP tests use `monkeypatch`.
- **Frontend:** Add integration tests for new API calls if test infrastructure exists; otherwise, manual verification.

### Data Migration

- **Notes (Gap 1):** No migration needed — there's no existing persisted data.
- **Campaigns (Gap 3):** The backend uses JSON file storage. If campaigns already exist from testing, they'll be served immediately.
- **Profile (Gap 5):** First-time load will return empty/defaults; the onboarding flow should trigger a `PUT` to persist.
