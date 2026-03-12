# MyHealthPal — Vision Pipeline (Document Translator) — Design

**App:** MyHealthPal (React Native)  
**Feature:** Backend vision pipeline for Scanner tab — scan medical forms/lab results, get plain-language summary + one nutritional swap.  
**Date:** 2025-03-10

---

## 1. Purpose & scope

- **Users:** Patients.
- **Flow:** App captures photo of lab result or clinical note (full-screen camera with alignment bracket) and sends it to the backend with optional context. Backend returns a 3-bullet, jargon-free summary (6th-grade reading level) and one culturally relevant, affordable nutritional swap.
- **Context passed from app:** Culture/cuisine, diet (e.g. vegetarian), Apple Watch biometric data. All optional; used to personalize the nutritional swap.
- **Demo constraint:** Ship fast (2-day demo). No HIPAA hardening, no persistence.

---

## 2. Architecture & endpoint contract

- **Single backend:** One HTTP endpoint. Request in → call vision LLM → response out. No DB, no queue, no cache.
- **Endpoint:** `POST /translate` (or `/scan`).
- **Request:** `multipart/form-data` with:
  - **Required:** `image` — one file (JPEG/PNG).
  - **Optional:** `culture`, `diet`, `biometrics` (e.g. JSON string or separate fields) for personalization.
- **Response (200):**  
  `{ "summaryBullets": [ "bullet 1", "bullet 2", "bullet 3" ], "nutritionalSwap": "One culturally relevant, affordable swap..." }`
- **Response (errors):** 4xx/5xx with `{ "error": "message" }`. No PHI in messages or logs.
- **No persistence:** Do not store images or LLM responses.

---

## 3. Data flow & prompt strategy

1. App sends `POST` with image + optional context.
2. Backend validates image (required, size, type).
3. Backend builds one request to the vision LLM (image + prompt including context and output rules).
4. LLM returns text; backend parses into exactly 3 bullets and 1 nutritional swap. **No fallback:** if parsing fails, return 500.
5. Return fixed JSON; no storage.

**Prompt:** System/user message sets role (explain for patients, 6th-grade reading level, no jargon). User message includes image and: "Using this image and patient context: culture [X], diet [Y], biometrics [Z]. Provide: (1) Exactly 3 bullet points summarizing the document in plain language. (2) Exactly one culturally relevant, affordable nutritional swap." Use a strict format (e.g. `SUMMARY:\n- ...\n- ...\n- ...\nNUTRITIONAL_SWAP:\n...`) or JSON mode if available for reliable parsing. If context is missing, pass "Not provided".

---

## 4. Tech stack & deployment

- **Framework:** FastAPI (Python).
- **Vision LLM:** OpenAI GPT-4o (image in message content).
- **Config:** `OPENAI_API_KEY` in env; optional `MAX_IMAGE_SIZE_MB`, `ALLOWED_MIME_TYPES`.
- **Deployment (demo):** Run locally (e.g. uvicorn) or single serverless function; app calls backend URL (tunnel if needed for device).

---

## 5. Error handling & demo constraints

- **Validation:** 400 if image missing, too large, or wrong type. Context optional.
- **LLM/parsing:** On OpenAI failure → 502/503 with generic message. On unparseable response → 500 "Could not process document". No fallback content.
- **Timeouts:** Set timeout on OpenAI request; on timeout return 504/503.
- **Demo:** No persistence, no HIPAA, no retries/queues, no PHI in logs.

---

## 6. Summary table

| Item            | Choice                                      |
|-----------------|---------------------------------------------|
| Framework       | FastAPI                                     |
| Vision LLM      | GPT-4o (OpenAI)                             |
| Endpoint        | `POST /translate`                           |
| Request         | Multipart image + optional context          |
| Response        | `summaryBullets` (3), `nutritionalSwap` (1) |
| Parsing         | Strict; no fallback → 500 on failure        |
| Deployment      | Local or single serverless for demo         |
