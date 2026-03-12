# Vision Pipeline (Document Translator) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Backend that accepts a photo of a medical document plus optional patient context and returns a 3-bullet plain-language summary and one culturally relevant, affordable nutritional swap using GPT-4o.

**Architecture:** Single FastAPI app with one `POST /translate` endpoint. Request: multipart (image + optional culture, diet, biometrics). No persistence. Call OpenAI GPT-4o with image + prompt; parse response into fixed JSON; return 200 or appropriate error.

**Tech Stack:** Python 3.10+, FastAPI, uvicorn, openai, python-multipart.

---

## Task 1: Project scaffold

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Test: N/A (sanity run only)

**Step 1: Create backend directory and requirements**

Create `backend/requirements.txt`:

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
openai>=1.12.0
python-multipart>=0.0.6
```

**Step 2: Create FastAPI app with health check**

Create `backend/app/__init__.py` (empty file).

Create `backend/app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI(title="MyHealthPal Document Translator")


@app.get("/health")
def health():
    return {"status": "ok"}
```

**Step 3: Run app and verify**

Run: `cd backend && uvicorn app.main:app --reload --port 8000`  
In another terminal: `curl http://localhost:8000/health`  
Expected: `{"status":"ok"}`

**Step 4: Commit**

```bash
git add backend/
git commit -m "chore: add FastAPI backend scaffold and health check"
```

---

## Task 2: POST /translate route and multipart request

**Files:**
- Create: `backend/app/schemas.py`
- Modify: `backend/app/main.py`
- Test: `tests/test_translate_route.py`

**Step 1: Add response schema**

Create `backend/app/schemas.py`:

```python
from pydantic import BaseModel


class TranslateResponse(BaseModel):
    summaryBullets: list[str]
    nutritionalSwap: str
```

**Step 2: Add POST /translate with multipart**

In `backend/app/main.py`, add:

```python
from fastapi import File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# After app = FastAPI(...)

@app.post("/translate", response_model=TranslateResponse)
async def translate(
    image: UploadFile = File(...),
    culture: str | None = Form(None),
    diet: str | None = Form(None),
    biometrics: str | None = Form(None),
):
    # TODO: validate image, call LLM, parse, return
    raise HTTPException(status_code=501, detail="Not implemented")
```

Import `TranslateResponse` from `app.schemas`. Use `Optional` from typing if needed for older Python.

**Step 3: Write failing test for route existence**

Create `tests/test_translate_route.py`:

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_translate_requires_image():
    response = client.post("/translate")
    assert response.status_code in (400, 422, 501)
```

**Step 4: Run test**

Run: `cd backend && pip install -r requirements.txt && pytest tests/ -v`  
Expected: test runs; may fail on 501 or pass on 422. Goal is route is present.

**Step 5: Commit**

```bash
git add backend/app/main.py backend/app/schemas.py tests/
git commit -m "feat: add POST /translate route and multipart params"
```

---

## Task 3: Image validation

**Files:**
- Create: `backend/app/validation.py`
- Modify: `backend/app/main.py`
- Test: `tests/test_validation.py`

**Step 1: Write failing validation tests**

Create `tests/test_validation.py`:

```python
import io
from app.validation import validate_image

def test_validate_image_rejects_empty_content_type():
    class FakeFile:
        content_type = None
        file = io.BytesIO(b"fake")
    err = validate_image(FakeFile(), max_size_mb=10)
    assert err is not None
    assert "type" in err.lower() or "content" in err.lower()

def test_validate_image_accepts_jpeg():
    class FakeFile:
        content_type = "image/jpeg"
        file = io.BytesIO(b"\xff\xd8\xff" + b"x" * 100)
    err = validate_image(FakeFile(), max_size_mb=10)
    assert err is None
```

**Step 2: Run tests (expect fail)**

Run: `pytest tests/test_validation.py -v`  
Expected: FAIL (validate_image not defined or wrong behavior)

**Step 3: Implement validate_image**

Create `backend/app/validation.py`:

```python
ALLOWED_TYPES = {"image/jpeg", "image/png"}


def validate_image(file, max_size_mb: int = 10) -> str | None:
    if not file or not file.content_type:
        return "Image is required"
    if file.content_type not in ALLOWED_TYPES:
        return "Invalid image type. Use JPEG or PNG."
    size_mb = 0
    if hasattr(file, "file") and file.file:
        file.file.seek(0, 2)
        size_mb = file.file.tell() / (1024 * 1024)
        file.file.seek(0)
    if size_mb > max_size_mb:
        return "Image too large"
    return None
```

**Step 4: Run tests**

Run: `pytest tests/test_validation.py -v`  
Expected: PASS (adjust tests if your API differs, e.g. first test might expect content_type check)

**Step 5: Wire validation in main.py**

In `translate`, after reading form data, call `validate_image(image, max_size_mb=10)`. If error string returned, raise `HTTPException(status_code=400, detail=err)`.

**Step 6: Commit**

```bash
git add backend/app/validation.py backend/app/main.py tests/test_validation.py
git commit -m "feat: validate image type and size in /translate"
```

---

## Task 4: Prompt builder and context

**Files:**
- Create: `backend/app/prompt.py`
- Test: `tests/test_prompt.py`

**Step 1: Write test for prompt content**

Create `tests/test_prompt.py`:

```python
from app.prompt import build_messages

def test_build_messages_includes_context():
    msgs = build_messages(
        image_b64="dummy",
        culture="Mexican",
        diet="vegetarian",
        biometrics='{"activityLevel":"moderate"}',
    )
    assert len(msgs) >= 1
    content = str(msgs)
    assert "Mexican" in content
    assert "vegetarian" in content
```

**Step 2: Run test (expect fail)**

Run: `pytest tests/test_prompt.py -v`  
Expected: FAIL (build_messages not defined)

**Step 3: Implement build_messages**

Create `backend/app/prompt.py`:

```python
def build_messages(
    image_b64: str,
    culture: str | None = None,
    diet: str | None = None,
    biometrics: str | None = None,
) -> list[dict]:
    culture = culture or "Not provided"
    diet = diet or "Not provided"
    biometrics = biometrics or "Not provided"
    user_content = [
        {
            "type": "text",
            "text": (
                "This image is a lab result or clinical note. Using the image and this patient context: "
                f"culture/cuisine: {culture}, diet: {diet}, biometrics: {biometrics}. "
                "Provide: (1) Exactly 3 bullet points that summarize the document in plain language (6th-grade reading level, no jargon). "
                "(2) Exactly one culturally relevant, affordable nutritional swap that could help with the findings. "
                "Format your response exactly as:\nSUMMARY:\n- bullet 1\n- bullet 2\n- bullet 3\nNUTRITIONAL_SWAP:\nYour one swap here."
            ),
        },
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
    ]
    return [
        {"role": "system", "content": "You explain medical documents for patients. Use simple language (6th-grade reading level). No jargon. Output only in the requested format."},
        {"role": "user", "content": user_content},
    ]
```

**Step 4: Run test**

Run: `pytest tests/test_prompt.py -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/prompt.py tests/test_prompt.py
git commit -m "feat: add prompt builder with context for GPT-4o"
```

---

## Task 5: OpenAI GPT-4o call and timeout

**Files:**
- Create: `backend/app/llm.py`
- Test: `tests/test_llm.py` (mock OpenAI)

**Step 1: Write test with mocked OpenAI**

Create `tests/test_llm.py`:

```python
from unittest.mock import patch, MagicMock
from app.llm import call_gpt4o_vision

@patch("app.llm.openai.OpenAI")
def test_call_gpt4o_returns_content(mock_openai):
    mock_openai.return_value.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="SUMMARY:\n- a\n- b\n- c\nNUTRITIONAL_SWAP:\nEat more beans."))]
    )
    out = call_gpt4o_vision([{"role": "user", "content": "test"}], api_key="sk-fake")
    assert "SUMMARY" in out
    assert "NUTRITIONAL_SWAP" in out
```

**Step 2: Run test (expect fail)**

Run: `pytest tests/test_llm.py -v`  
Expected: FAIL

**Step 3: Implement call_gpt4o_vision**

Create `backend/app/llm.py`:

```python
import os
from openai import OpenAI

def call_gpt4o_vision(messages: list[dict], api_key: str | None = None, timeout_sec: int = 60) -> str:
    client = OpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY"))
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=1024,
        timeout=timeout_sec,
    )
    return resp.choices[0].message.content or ""
```

**Step 4: Run test**

Run: `pytest tests/test_llm.py -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/llm.py tests/test_llm.py
git commit -m "feat: add GPT-4o vision call with timeout"
```

---

## Task 6: Response parser (no fallback)

**Files:**
- Create: `backend/app/parser.py`
- Test: `tests/test_parser.py`

**Step 1: Write tests**

Create `tests/test_parser.py`:

```python
from app.parser import parse_translate_response

def test_parse_valid_response():
    text = "SUMMARY:\n- One\n- Two\n- Three\nNUTRITIONAL_SWAP:\nEat more greens."
    out = parse_translate_response(text)
    assert out is not None
    assert out["summaryBullets"] == ["One", "Two", "Three"]
    assert "greens" in out["nutritionalSwap"]

def test_parse_invalid_returns_none():
    assert parse_translate_response("garbage") is None
    assert parse_translate_response("SUMMARY:\n- Only one") is None
```

**Step 2: Run tests (expect fail)**

Run: `pytest tests/test_parser.py -v`  
Expected: FAIL

**Step 3: Implement parser**

Create `backend/app/parser.py`:

```python
def parse_translate_response(text: str) -> dict | None:
    if not text or "NUTRITIONAL_SWAP:" not in text:
        return None
    parts = text.split("NUTRITIONAL_SWAP:", 1)
    summary_part = parts[0].replace("SUMMARY:", "").strip()
    swap_part = parts[1].strip()
    bullets = [line.lstrip("- ").strip() for line in summary_part.split("\n") if line.strip().startswith("-")]
    if len(bullets) != 3:
        return None
    return {"summaryBullets": bullets, "nutritionalSwap": swap_part}
```

**Step 4: Run tests**

Run: `pytest tests/test_parser.py -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/parser.py tests/test_parser.py
git commit -m "feat: parse LLM response into summaryBullets and nutritionalSwap (no fallback)"
```

---

## Task 7: Wire /translate end-to-end and error handling

**Files:**
- Modify: `backend/app/main.py`
- Test: Manual or integration test

**Step 1: Implement full translate handler**

In `backend/app/main.py`:

- Read image file; convert to base64.
- Call `validate_image(image)`; on error raise 400.
- Call `build_messages(image_b64, culture, diet, biometrics)`.
- Call `call_gpt4o_vision(messages)` inside try/except for OpenAI errors → raise 502/503 with generic message; on timeout → 504.
- Call `parse_translate_response(llm_content)`; if None raise 500 with "Could not process document".
- Return `TranslateResponse(**parsed)`.

Use `OPENAI_API_KEY` from env; do not log image content or raw LLM output.

**Step 2: Add CORS if app will be called from React Native (e.g. development)**

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

**Step 3: Manual test**

Run server: `uvicorn app.main:app --reload --port 8000`  
Run: `curl -X POST http://localhost:8000/translate -F "image=@/path/to/small.jpg" -F "diet=vegetarian"`  
Expected: 200 and JSON with `summaryBullets` and `nutritionalSwap`, or 500 if parsing fails. Ensure 400 when image missing.

**Step 4: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: wire /translate end-to-end with error handling"
```

---

## Task 8: Env and README

**Files:**
- Create: `backend/.env.example`
- Create: `backend/README.md`

**Step 1: .env.example**

Create `backend/.env.example`:

```
OPENAI_API_KEY=sk-your-key-here
MAX_IMAGE_SIZE_MB=10
```

**Step 2: README**

Create `backend/README.md` with: how to install (`pip install -r requirements.txt`), set `OPENAI_API_KEY`, run (`uvicorn app.main:app --reload --port 8000`), and call `POST /translate` (multipart image + optional culture, diet, biometrics).

**Step 3: Commit**

```bash
git add backend/.env.example backend/README.md
git commit -m "docs: add env example and backend README"
```

---

## Execution handoff

Plan complete and saved to `docs/plans/2025-03-10-vision-pipeline.md`.

**Two execution options:**

1. **Subagent-driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Parallel session (separate)** — Open a new session with executing-plans and run through the plan with checkpoints there.

Which approach do you want?
