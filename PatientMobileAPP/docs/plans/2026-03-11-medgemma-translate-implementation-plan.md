# MedGemma `/translate` Replacement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the backend's OpenAI-backed `/translate` call with a SageMaker-hosted MedGemma integration while preserving the existing API contract.

**Architecture:** Keep the current FastAPI route, validation, prompt builder, and parser. Add a small MedGemma SageMaker client that accepts the base64 image plus prompt text, returns generated text, and becomes the route's default upstream provider. Add a lightweight AWS deployment helper script and env documentation.

**Tech Stack:** FastAPI, Python, boto3 SageMaker Runtime, existing parser/prompt modules, pytest.

---

## Task 1: Add failing tests for the SageMaker MedGemma client

**Files:**
- Create: `backend/tests/test_medgemma.py`
- Modify: none

**Step 1: Write the failing test**

Add tests that expect:
- a SageMaker runtime client is called with the configured endpoint name
- the request body contains multimodal message content with text plus base64 image URL
- the response extractor returns generated text from a SageMaker JSON payload
- invalid response shapes raise `ValueError`

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=. pytest tests/test_medgemma.py -v`
Expected: FAIL because `app.medgemma` does not exist yet.

**Step 3: Write minimal implementation**

Create `backend/app/medgemma.py` with:
- env helpers for region, endpoint name, and max tokens
- a `build_medgemma_payload(...)` helper
- a `call_medgemma_sagemaker(...)` function
- a small response extraction helper

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=. pytest tests/test_medgemma.py -v`
Expected: PASS

---

## Task 2: Add failing route tests for MedGemma wiring

**Files:**
- Modify: `backend/tests/test_translate_route.py`
- Modify: `backend/tests/test_llm.py`

**Step 1: Write the failing test**

In `backend/tests/test_translate_route.py`:
- replace the route monkeypatch targets so the route uses `call_medgemma_sagemaker`
- add a test that confirms the route sends the prompt messages to the MedGemma client through `asyncio.to_thread`

In `backend/tests/test_llm.py`:
- keep existing OpenAI tests for the helper module only, but stop treating it as the active `/translate` provider

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=. pytest tests/test_translate_route.py -v`
Expected: FAIL because `main.py` still imports and calls `call_gpt4o_vision`.

**Step 3: Write minimal implementation**

Modify `backend/app/main.py` to import and call `call_medgemma_sagemaker` instead of `call_gpt4o_vision`.

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=. pytest tests/test_translate_route.py -v`
Expected: PASS

---

## Task 3: Add env documentation and startup-safe defaults

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/README.md`
- Test: `backend/tests/test_medgemma.py`

**Step 1: Write the failing test**

Add a unit test that verifies:
- missing endpoint configuration raises a clear `ValueError`
- max token parsing falls back to a sane default when env is missing or invalid

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=. pytest tests/test_medgemma.py -v`
Expected: FAIL until the env helpers are complete.

**Step 3: Write minimal implementation**

Document:
- `AWS_REGION`
- `SAGEMAKER_MEDGEMMA_ENDPOINT_NAME`
- optional `MEDGEMMA_MAX_NEW_TOKENS`

Keep defaults small and explicit.

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=. pytest tests/test_medgemma.py -v`
Expected: PASS

---

## Task 4: Add AWS SageMaker starter script

**Files:**
- Create: `backend/scripts/deploy_medgemma_sagemaker.py`
- Modify: `backend/README.md`

**Step 1: Write the failing test**

No automated test required for this script. Keep it isolated and documented.

**Step 2: Implement the minimal script**

Add a script that:
- reads an HF token from env
- configures `google/medgemma-1.5-4b-it`
- builds a `HuggingFaceModel`
- deploys to a named GPU instance type

Include a warning that request payload compatibility still needs validation with real image inputs.

**Step 3: Manual verification**

Review the script for placeholders and required env vars.

---

## Task 5: Run focused verification

**Files:**
- Modify: none

**Step 1: Run targeted tests**

Run: `PYTHONPATH=. pytest tests/test_medgemma.py tests/test_translate_route.py tests/test_llm.py -v`
Expected: PASS

**Step 2: Run lints/diagnostics**

Use editor diagnostics for changed files and fix any new issues.

**Step 3: Summarize integration risks**

Call out that:
- SageMaker multimodal payloads must be validated against the chosen container
- MRI/CT workflows may need preprocessing beyond ordinary PNG/JPEG uploads
- the deployment script is a starter, not fully proven infrastructure

---

## Execution handoff

Plan saved to `docs/plans/2026-03-11-medgemma-translate-implementation-plan.md`.

**Execution options:**
1. **Subagent-driven (this session)** — implement task-by-task with review.
2. **Parallel session** — open new session and use executing-plans in worktree.

Chosen: **Subagent-driven (this session)** via direct execution in the current session.
