# MyHealthPal — MedGemma `/translate` Replacement — Design

**App:** MyHealthPal backend  
**Feature:** Replace the current OpenAI-backed `/translate` route with a SageMaker-hosted MedGemma integration.  
**Date:** 2026-03-11

---

## 1. Purpose & scope

- **Goal:** Keep the existing `/translate` API contract while replacing the upstream model call with a MedGemma endpoint hosted on AWS SageMaker.
- **In scope:** SageMaker request/response adapter, env-based configuration, route wiring, tests, and an AWS starter deployment script.
- **Out of scope:** Full infrastructure provisioning, DICOM preprocessing pipelines, multi-image studies, retries, queues, or fallback routing.

---

## 2. Product constraints

- The frontend contract must stay the same:
  - request: multipart upload with `image` and optional `culture`, `diet`, `biometrics`
  - response: `{ "summaryBullets": [...], "nutritionalSwap": "..." }`
- The backend should continue to return plain-language, non-diagnostic summaries.
- MedGemma should become the default and only provider used by `/translate`.

---

## 3. Architecture

- **Route remains unchanged:** `POST /translate`
- **Prompt builder remains responsible** for assembling the patient-safe instructions and optional context.
- **New provider module:** a small MedGemma client sends a multimodal payload to SageMaker and returns plain text.
- **Parser remains unchanged:** the existing parser continues to normalize the model output into the fixed response schema.

This keeps the integration surface small: swap the upstream call while preserving validation, parsing, and the API contract.

---

## 4. Configuration

The backend adds environment variables for the SageMaker integration:

- `AWS_REGION`
- `SAGEMAKER_MEDGEMMA_ENDPOINT_NAME`
- optional request tuning such as `MEDGEMMA_MAX_NEW_TOKENS`

The current `MAX_IMAGE_SIZE_MB` validation remains in place.

---

## 5. Request flow

1. Client uploads image and optional personalization fields.
2. Backend validates file type and image bytes.
3. Backend base64-encodes the image.
4. Backend builds the same patient-facing prompt as today.
5. Backend calls SageMaker with a multimodal MedGemma payload.
6. Backend extracts the generated text from the SageMaker response.
7. Existing parser converts the text into `summaryBullets` and `nutritionalSwap`.

---

## 6. Error handling

- Invalid image -> existing `400`
- SageMaker timeout / transport failure -> `502`
- Invalid or unexpected SageMaker payload shape -> `502`
- Unparseable model output -> existing `500`

The route should not leak AWS internals or raw model output in user-facing errors.

---

## 7. Testing strategy

- Add unit tests for the MedGemma SageMaker client:
  - correct payload shape
  - env/config handling
  - response extraction
  - invalid response handling
- Update `/translate` tests so they verify the route now uses the MedGemma client path instead of the OpenAI helper.
- Keep parser tests and route response-shape tests intact.

---

## 8. AWS bootstrap

- Add a small deployment helper script under `backend/scripts/` as a starting point for the SageMaker endpoint.
- Treat it as a convenience script, not as fully validated infrastructure code.
- Prefer documenting expected environment variables and instance assumptions rather than over-engineering deployment automation.
