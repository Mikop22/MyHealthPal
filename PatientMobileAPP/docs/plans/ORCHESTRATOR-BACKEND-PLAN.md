# MyHealthPal Backend — Orchestrator Plan

**Purpose:** Single dispatch plan for an orchestrator agent to complete all backend work by dispatching subagents. Defines workstreams, deliverables, design references, and which agent types to use.

**Scope:** Backend only (FastAPI app + Vision, Crowdfunding, Check In). App/frontend (Vitals, Support tab mock, Scanner/Check In UI) is out of scope for this plan.

---

## 1. Backend workstreams (no dependencies between them)

| Workstream | Delivers | Depends on |
|------------|----------|------------|
| **A. Vision pipeline** | FastAPI app scaffold + `POST /translate` (image → summary + nutritional swap) | None (creates backend) |
| **B. Crowdfunding** | JSON storage + 5 REST endpoints (campaigns, contributions) | Existing FastAPI app (from A) |
| **C. Check In** | `POST /check-in/extract`, card matching, `POST /check-in/action-plan` (LLM) | Existing FastAPI app (from A) |

**Recommended build order:** A first (creates the app), then B and C in parallel (both attach to the same app).

---

## 2. What must be completed (checklist)

### Workstream A — Vision pipeline

- [ ] Backend directory and `requirements.txt` (FastAPI, uvicorn, openai, python-multipart).
- [ ] `GET /health` and `POST /translate` (multipart: image + optional culture, diet, biometrics).
- [ ] Vision LLM integration (e.g. GPT-4o): parse response into `summaryBullets` (3) and `nutritionalSwap` (1).
- [ ] Validation and error handling (400/404/500 per design).
- [ ] Tests for route and response shape (see implementation plan).

### Workstream B — Crowdfunding

- [ ] JSON file storage (`backend/data/crowdfunding.json`) with `get_data()` / `save_data()`.
- [ ] Pydantic models and router registered on existing app.
- [ ] POST /campaigns, GET /campaigns, GET /campaigns/{id} (with total_raised), POST /campaigns/{id}/contributions, GET /campaigns/{id}/contributions.
- [ ] Validation (400/404) and tests per implementation plan.

### Workstream C — Check In

- [ ] Card bank data + request/response schemas (extract, action-plan).
- [ ] POST /check-in/extract (transcript → structured symptoms via LLM).
- [ ] Card matching logic (symptoms → ordered card ids).
- [ ] POST /check-in/action-plan (transcript + card responses → summary bullets + questions via LLM).
- [ ] Router registered on existing app; tests per implementation plan.

---

## 3. Markdown files to reference

All paths relative to project root: `MyHealthPath Features/` (or repo root if different).

### Design (authoritative behavior and contracts)

| Topic | File | Use for |
|-------|------|--------|
| Vision pipeline | `2025-03-10-vision-pipeline-design.md` | Endpoint contract, request/response, prompt strategy, errors |
| Crowdfunding | `2025-03-10-crowdfunding-design.md` | Data model, storage, API endpoints, validation |
| Check In | `docs/plans/2025-03-11-check-in-design.md` | Extract/action-plan flow, card bank, Option B matching, real vs mocked |

### Implementation (task-level steps, tests, code)

| Topic | File | Use for |
|-------|------|--------|
| Vision pipeline | `2025-03-10-vision-pipeline-implementation-plan.md` | Task order, file paths, test cases, code snippets |
| Crowdfunding | `2025-03-10-crowdfunding-implementation-plan.md` | Storage, routes, validation, test cases |
| Check In | `docs/plans/2025-03-11-check-in-implementation-plan.md` | Backend tasks (card bank, extract, matching, action-plan), tests |

### Not used for backend (app-only)

- `docs/plans/2025-03-11-vitals-lifestyle-design.md` — Vitals tab (no backend).
- `docs/plans/2025-03-11-vitals-lifestyle-implementation-plan.md` — Vitals tab (app mock).
- `docs/plans/2025-03-11-crowdfunding-support-tab-mock-implementation-plan.md` — Support tab (in-app mock).

---

## 4. Agent roles and dispatch

### Orchestrator (you / main agent)

- Read this plan and the three implementation plans.
- Create a single TodoWrite for the three workstreams (A, B, C).
- Dispatch **Workstream A** first (Vision). Wait for completion.
- Then dispatch **Workstream B** and **Workstream C** in parallel (Crowdfunding and Check In).
- After all complete: dispatch one **code-reviewer** subagent over the full backend (optional but recommended).

### Subagent for Workstream A — Vision pipeline

- **Agent type:** `generalPurpose` (or use **executing-plans** in a dedicated session).
- **Instructions:** “Implement the Vision pipeline backend per the implementation plan. Use the design doc for contract and errors. Create backend scaffold, POST /translate with multipart, call vision LLM, parse response, add tests. Do not add Crowdfunding or Check In.”
- **Reference:** `2025-03-10-vision-pipeline-design.md`, `2025-03-10-vision-pipeline-implementation-plan.md`.
- **Output:** Backend runs; `POST /translate` returns 200 with `summaryBullets` and `nutritionalSwap`; tests pass.

### Subagent for Workstream B — Crowdfunding

- **Agent type:** `generalPurpose` (or **executing-plans**).
- **Instructions:** “Add the Crowdfunding data layer to the existing FastAPI app. Use the implementation plan and design doc. Implement JSON storage, Pydantic models, and all 5 endpoints. Do not modify Vision or Check In routes.”
- **Reference:** `2025-03-10-crowdfunding-design.md`, `2025-03-10-crowdfunding-implementation-plan.md`.
- **Precondition:** Workstream A done (backend exists and has `app`).
- **Output:** GET/POST campaigns and GET/POST contributions work; tests pass.

### Subagent for Workstream C — Check In

- **Agent type:** `generalPurpose` (or **executing-plans**).
- **Instructions:** “Add the Check In backend to the existing FastAPI app. Use the implementation plan and design doc. Implement card bank/schemas, POST /check-in/extract (LLM), card matching, POST /check-in/action-plan (LLM). Do not modify Vision or Crowdfunding routes.”
- **Reference:** `docs/plans/2025-03-11-check-in-design.md`, `docs/plans/2025-03-11-check-in-implementation-plan.md`.
- **Precondition:** Workstream A done (backend exists and has `app`).
- **Output:** Extract and action-plan return expected shapes; tests pass.

### Subagent for final review (optional)

- **Agent type:** `code-reviewer`.
- **Instructions:** “Review the full MyHealthPal backend (Vision, Crowdfunding, Check In) against the three design docs and implementation plans. Confirm contracts, error handling, and no cross-feature breakage.”
- **Reference:** All three design + implementation plan files above.

---

## 5. Dispatch sequence summary

```
1. Dispatch Agent A (Vision)     → backend scaffold + POST /translate
2. On A complete:
   ├── Dispatch Agent B (Crowdfunding)  → storage + 5 endpoints
   └── Dispatch Agent C (Check In)      → extract + action-plan + cards
3. On B and C complete:
   └── Dispatch code-reviewer (full backend)
```

---

## 6. Shared context to pass to every subagent

- **Repo/workspace:** MyHealthPath Features (or actual repo path).
- **Backend path:** `backend/` (Python, FastAPI). Vision plan creates it; B and C extend it.
- **No auth:** None of the designs require authentication.
- **Env:** Vision and Check In need LLM API keys (e.g. `OPENAI_API_KEY`); document in README or .env.example.
- **Tests:** Each workstream has its own test file(s); run from `backend/` with `PYTHONPATH=. pytest tests/ -v`.
