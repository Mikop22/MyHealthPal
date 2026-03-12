# MyHealthPal Backend

FastAPI backend for the MyHealthPal demo. It includes:
- Vision pipeline endpoints for document translation
- Crowdfunding campaign and contribution endpoints
- Backend-only Check In endpoints for symptom extraction, card support, and action plans

## Requirements

- Python 3.9+
- Hosted **MedGemma** API (Featherless/OpenAI-compatible) for `/translate`.
- An OpenAI API key for Check In and other LLM features.

## Setup

From the **backend** directory:

```bash
# Create a virtual environment (recommended; avoids "No module named 'supabase'" with system Python)
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
```

In `.env`, configure:

- `OPENAI_API_KEY` for existing LLM features.
- `MEDGEMMA_BASE_URL` (e.g. `https://api.featherless.ai/v1`).
- `MEDGEMMA_API_KEY` (your Featherless API key).
- Optionally `MEDGEMMA_MODEL_ID` (defaults to `google/medgemma-4b-it`) and `MEDGEMMA_MAX_NEW_TOKENS`.

## Run the API

From the **backend** directory (with venv activated if you use one):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Use `--host 0.0.0.0` if the frontend runs on another device (e.g. Expo on a phone).

## Endpoints

- `GET /health` returns `{"status":"ok"}`
- `POST /translate` accepts `multipart/form-data` with:
  - `image` (required, JPEG or PNG)
  - `culture` (optional)
  - `diet` (optional)
  - `biometrics` (optional)
  - uses MedGemma via the configured HTTP provider (Featherless/OpenAI-compatible)
- `POST /campaigns`
- `GET /campaigns`
- `GET /campaigns/{id}`
- `POST /campaigns/{id}/contributions`
- `GET /campaigns/{id}/contributions`
- `GET /check-in/cards`
- `POST /check-in/extract`
- `POST /check-in/action-plan`

Example request:

```bash
curl -X POST http://127.0.0.1:8000/translate \
  -F "image=@/path/to/document.png" \
  -F "culture=Mexican" \
  -F "diet=vegetarian" \
  -F 'biometrics={"steps":9000}'
```

Example response:

```json
{
  "summaryBullets": [
    "Bullet one",
    "Bullet two",
    "Bullet three"
  ],
  "nutritionalSwap": "Try beans instead of chips."
}
```

## Testing

```bash
python3 -m pytest tests -q
```

## MedGemma for /translate

The backend uses **MedGemma** (hosted) for document and medical image summarization.

Typical Featherless configuration:

```bash
MEDGEMMA_BASE_URL=https://api.featherless.ai/v1
MEDGEMMA_PROVIDER=featherless
MEDGEMMA_API_KEY=your-featherless-api-key
MEDGEMMA_MODEL_ID=google/medgemma-4b-it
MEDGEMMA_MAX_NEW_TOKENS=512
```

### Smoke test

From the `backend` directory, with MedGemma configured:

```bash
python scripts/smoke_test_medgemma_endpoint.py path/to/your/image.png
```
