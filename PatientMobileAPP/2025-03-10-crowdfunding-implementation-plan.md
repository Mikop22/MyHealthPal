# Crowdfunding Data Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a minimal crowdfunding data layer to the MyHealthPal backend: JSON-file storage for campaigns and contributions, plus 5 REST endpoints. No auth, no payment.

**Architecture:** Single JSON file (`backend/data/crowdfunding.json`) with `{ "campaigns": [], "contributions": [] }`. Load on first use; overwrite file on every create. New module in existing FastAPI app for routes and load/save.

**Tech Stack:** Existing FastAPI backend; Python stdlib `json`, `pathlib`; Pydantic for request/response models.

---

## Task 1: Data file and load/save

**Files:**
- Create: `backend/data/.gitkeep` (or ensure `backend/data/` exists)
- Create: `backend/app/crowdfunding_storage.py`
- Test: `backend/tests/test_crowdfunding_storage.py`

**Step 1: Define storage contract**

Storage module must provide:
- `get_data() -> dict` — returns `{"campaigns": list, "contributions": list}`; if file missing, return `{"campaigns": [], "contributions": []}` and do not create file yet.
- `save_data(data: dict) -> None` — write `data` to the JSON file (create file and parent dir if needed). `data` must have keys `campaigns` and `contributions`.

**Step 2: Write failing test**

Create `backend/tests/test_crowdfunding_storage.py`:
- Use a temporary directory (e.g. `tmp_path` in pytest) for the JSON file path.
- Test: after `save_data({"campaigns": [], "contributions": []})`, `get_data()` returns that structure.
- Test: when file does not exist, `get_data()` returns `{"campaigns": [], "contributions": []}`.

**Step 3: Implement**

Create `backend/app/crowdfunding_storage.py`:
- Default path: e.g. `Path(__file__).parent.parent / "data" / "crowdfunding.json"`.
- Allow override via env `CROWDFUNDING_DATA_PATH` or a function argument for tests.
- `get_data()`: if path exists, `json.load(open(path))`; else return `{"campaigns": [], "contributions": []}`.
- `save_data(data)`: ensure parent dir exists, `json.dump(data, open(path, "w"), indent=2)`.

**Step 4: Run tests**

Run from `backend/`: `PYTHONPATH=. pytest tests/test_crowdfunding_storage.py -v`. Expected: PASS.

**Step 5: Commit** (skip if no git repo)

---

## Task 2: Pydantic models and route registration

**Files:**
- Create: `backend/app/crowdfunding_models.py`
- Modify: `backend/app/main.py`

**Step 1: Models**

Create `backend/app/crowdfunding_models.py`:
- `CampaignCreate`: `owner_identifier: str`, `title: str`, `description: str`, `goal_amount: float`, `deadline: str | None = None`.
- `CampaignResponse`: `id`, `owner_identifier`, `title`, `description`, `goal_amount`, `status`, `deadline`, `created_at`; optional `total_raised` for GET by id.
- `ContributionCreate`: `contributor_identifier: str`, `amount: float`, `message: str | None = None`.
- `ContributionResponse`: `id`, `campaign_id`, `contributor_identifier`, `amount`, `message`, `created_at`.

Add validators: `goal_amount` and `amount` >= 0; `title`/`description` non-empty if required.

**Step 2: Register router**

In `backend/app/main.py`: create a sub-router (e.g. `APIRouter(prefix="/campaigns", tags=["crowdfunding"])`) and include it in `app`. For now add one placeholder route so the app starts, e.g. `@router.get("")` returning `[]`. Implement full routes in later tasks.

**Step 3: Verify**

Run: `uvicorn app.main:app --port 8001` (or 8000); `curl http://localhost:8001/campaigns`. Expected: `[]`.

**Step 4: Commit** (skip if no git repo)

---

## Task 3: POST /campaigns and GET /campaigns

**Files:**
- Create: `backend/app/crowdfunding.py` (or add to existing router file)
- Modify: `backend/app/main.py` (wire router if not already)
- Test: `backend/tests/test_crowdfunding_api.py`

**Step 1: Implement POST /campaigns**

- Load data with `get_data()`.
- Generate `id = uuid.uuid4().hex`, `created_at = datetime.utcnow().isoformat() + "Z"`, `status = "active"`.
- Build campaign dict from request body (CampaignCreate) + id, status, created_at.
- Append to `data["campaigns"]`, call `save_data(data)`, return campaign (CampaignResponse shape).

**Step 2: Implement GET /campaigns**

- Load data, return `data["campaigns"]` (list only; no total_raised in list view).

**Step 3: Write test**

In `backend/tests/test_crowdfunding_api.py`: use TestClient and a temp data path (inject or env). POST a campaign, assert status 200 and response has id, title, status. GET /campaigns, assert list contains one campaign.

**Step 4: Run tests**

`PYTHONPATH=. pytest tests/test_crowdfunding_api.py -v`. Fix storage to accept optional path for tests if needed.

**Step 5: Commit** (skip if no git repo)

---

## Task 4: GET /campaigns/{id} with total_raised

**Files:**
- Modify: `backend/app/crowdfunding.py` (or router)
- Modify: `backend/tests/test_crowdfunding_api.py`

**Step 1: Implement GET /campaigns/{id}**

- Load data; find campaign by `id` in `data["campaigns"]`.
- If not found, raise HTTP 404.
- Compute `total_raised = sum(c["amount"] for c in data["contributions"] if c["campaign_id"] == id)`.
- Return campaign dict with `total_raised` added.

**Step 2: Add test**

GET /campaigns/{id} for unknown id → 404. POST campaign, GET by id → 200 and total_raised present (e.g. 0).

**Step 3: Run tests**

`pytest tests/test_crowdfunding_api.py -v`. Expected: PASS.

**Step 4: Commit** (skip if no git repo)

---

## Task 5: POST /campaigns/{id}/contributions and GET /campaigns/{id}/contributions

**Files:**
- Modify: `backend/app/crowdfunding.py` (or router)
- Modify: `backend/tests/test_crowdfunding_api.py`

**Step 1: Implement POST /campaigns/{id}/contributions**

- Load data; check campaign exists (else 404).
- Generate contribution id and created_at.
- Append to `data["contributions"]` with campaign_id, contributor_identifier, amount, message.
- save_data(data); return contribution (ContributionResponse shape).
- Validate amount >= 0; 400 if invalid.

**Step 2: Implement GET /campaigns/{id}/contributions**

- Load data; check campaign exists (else 404). Return list of contributions where `campaign_id == id`.

**Step 3: Add tests**

POST contribution to existing campaign → 200, response has id and amount. POST to missing campaign → 404. GET contributions for campaign → list. POST contribution with negative amount → 400.

**Step 4: Run tests**

`pytest tests/test_crowdfunding_api.py -v`. Expected: PASS.

**Step 5: Commit** (skip if no git repo)

---

## Task 6: Validation and error handling

**Files:**
- Modify: `backend/app/crowdfunding_models.py` and/or route handlers

**Step 1: Ensure 400 for invalid input**

- Campaign: goal_amount < 0 or empty title/description → 400.
- Contribution: amount < 0 → 400. Return clear detail message.

**Step 2: Ensure 404**

- GET /campaigns/{id} and GET/POST /campaigns/{id}/contributions when campaign id not found → 404.

**Step 3: Run full test suite**

`pytest backend/tests/ -v` (or from backend: `pytest tests/ -v`). All existing tests (vision pipeline) and crowdfunding tests should pass.

**Step 4: Commit** (skip if no git repo)

---

## Execution handoff

Plan saved to `docs/plans/2025-03-10-crowdfunding.md`.

**Execution options:**
1. **Subagent-driven (this session)** — implement task-by-task with review.
2. **Parallel session** — open new session and use executing-plans in worktree.

Which approach?
