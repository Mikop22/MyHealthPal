# Deploying MyHealthPal for Demo / Judging

This guide covers three ways to run the full MyHealthPal stack so that judges (or
anyone) can try the demo end-to-end.

| Service | Tech | Default port |
|---------|------|-------------|
| **DoctorAPP backend** | FastAPI / Python 3.11 | 8000 |
| **DoctorAPP frontend** | Next.js 16 | 3000 |
| **PatientMobileAPP backend** | FastAPI / Python 3.11 | 8080 |
| **PatientMobileAPP frontend** | Expo / React Native | Expo Go on device |

---

## Prerequisites (all approaches)

| Requirement | Purpose |
|-------------|---------|
| **OpenAI API key** | DoctorAPP RAG analysis |
| **MongoDB Atlas URI** | DoctorAPP patient & condition data |
| **AWS credentials + SageMaker endpoint** | PatientMobileAPP MedGemma document translation |
| *(optional)* HuggingFace token | DoctorAPP embedding model (falls back to local model) |
| *(optional)* Supabase URL + key | PatientMobileAPP label storage |

---

## Option 1 — Local quickstart (no Docker)

Best for development or a quick on-laptop demo.

### 1. DoctorAPP backend

```bash
cd DoctorAPP/back-end
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env          # fill in your API keys
python seed_mock_patients.py  # (optional) populate demo patients

./start.sh                    # → http://localhost:8000
```

### 2. DoctorAPP frontend

```bash
cd DoctorAPP/front-end
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm ci
npm run dev                   # → http://localhost:3000
```

### 3. PatientMobileAPP backend

```bash
cd PatientMobileAPP/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # fill in your API keys
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload  # → http://localhost:8080
```

### 4. PatientMobileAPP mobile frontend (Expo)

```bash
cd PatientMobileAPP/frontend/mobile-app
npm install

# Point the mobile app at your PatientMobileAPP backend:
# Edit services/api.ts or set the API_BASE env var to http://<YOUR_IP>:8080

npx expo start
```

Then open **Expo Go** on your phone (same Wi-Fi network) and scan the QR code.

---

## Option 2 — Docker Compose (one command)

Best for a self-contained demo on a single machine.

> **Note:** The Expo mobile frontend is not included in Docker because React
> Native apps need a device or emulator. Run it separately with Expo Go
> (step 4 above).

```bash
# 1. Create env files
cp DoctorAPP/back-end/.env.example  DoctorAPP/back-end/.env
cp PatientMobileAPP/backend/.env.example PatientMobileAPP/backend/.env
# Fill in your API keys in each .env file

# 2. Build & start
docker compose up --build

# 3. Access
#   DoctorAPP frontend  → http://localhost:3000
#   DoctorAPP backend   → http://localhost:8000/health
#   Patient backend     → http://localhost:8080/health
```

To stop: `docker compose down`

---

## Option 3 — Cloud deployment (recommended for remote judging)

Deploy each service to a managed platform so judges only need a URL.

### DoctorAPP backend → Railway

The backend already has `Procfile` and `railway.toml` configured.

1. Create a [Railway](https://railway.app) project and connect the repo.
2. Set the **root directory** to `DoctorAPP/back-end`.
3. Add these **environment variables** in the Railway dashboard:
   - `OPENAI_API_KEY`
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `ALLOWED_ORIGINS=*` (or the Vercel frontend URL)
   - `FRONTEND_URL` (your Vercel frontend URL, for email links)
   - *(optional)* `HUGGINGFACE_TOKEN`, `PUBMED_API_KEY`, SMTP vars
4. Railway auto-deploys on push. Health check: `GET /health`.

### DoctorAPP frontend → Vercel

1. Import the repo into [Vercel](https://vercel.com).
2. Set the **root directory** to `DoctorAPP/front-end`.
3. Add the environment variable:
   - `NEXT_PUBLIC_API_URL` → your Railway backend URL (e.g. `https://doctorapp-backend-production.up.railway.app`)
4. Deploy. Vercel auto-detects Next.js.

### PatientMobileAPP backend → Railway

1. In the same Railway project, add a **new service** and connect the repo.
2. Set the **root directory** to `PatientMobileAPP/backend`.
3. Add environment variables:
   - `SAGEMAKER_ENDPOINT_NAME`
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
   - `DOCTORAPP_BASE_URL` → the Railway URL of the DoctorAPP backend
   - `ALLOWED_ORIGINS=*`
   - *(optional)* `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. Health check: `GET /health`.

### PatientMobileAPP mobile frontend → Expo Go / EAS

For judges to test the mobile app:

**Option A — Expo Go (easiest):**
Run `npx expo start` locally or on a cloud VM. Share the QR code / deep link
with judges. They install Expo Go on their phone and scan it.

**Option B — EAS Build (standalone APK/IPA):**
```bash
cd PatientMobileAPP/frontend/mobile-app
npx eas build --platform android --profile preview  # generates an APK link
```
Share the download link with judges. No Expo Go required.

Before building, update the API base URL in `services/api.ts` to point to
the deployed PatientMobileAPP backend Railway URL.

---

## Exposing local services to the internet (ngrok)

If you want to keep everything running locally but let remote judges access it:

```bash
# Terminal 1 — expose DoctorAPP backend
ngrok http 8000

# Terminal 2 — expose PatientMobileAPP backend
ngrok http 8080
```

Use the generated `https://*.ngrok.io` URLs as `NEXT_PUBLIC_API_URL` and the
mobile API base URL respectively.

---

## Environment variable reference

### DoctorAPP backend (`DoctorAPP/back-end/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key for RAG analysis |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | — | Database name (default: `diagnostic`) |
| `ALLOWED_ORIGINS` | — | CORS origins, comma-separated or `*` (default: `*`) |
| `FRONTEND_URL` | — | Frontend URL for email links (default: `http://localhost:3000`) |
| `HUGGINGFACE_TOKEN` | — | HuggingFace token for embedding model |
| `PUBMED_API_KEY` | — | PubMed API key for paper search |
| `SMTP_HOST` | — | SMTP server for emails (default: `smtp.gmail.com`) |
| `SMTP_PORT` | — | SMTP port (default: `587`) |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASSWORD` | — | SMTP app password |

### DoctorAPP frontend (`DoctorAPP/front-end/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL (e.g. `http://localhost:8000`) |

### PatientMobileAPP backend (`PatientMobileAPP/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SAGEMAKER_ENDPOINT_NAME` | ✅ | AWS SageMaker MedGemma endpoint name |
| `AWS_REGION` | — | AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | ✅ | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | ✅ | AWS credentials |
| `DOCTORAPP_BASE_URL` | — | DoctorAPP backend URL (default: `http://localhost:8000`) |
| `ALLOWED_ORIGINS` | — | CORS origins, comma-separated or `*` (unset = localhost only) |
| `MAX_IMAGE_SIZE_MB` | — | Max upload size (default: `10`) |
| `SUPABASE_URL` | — | Supabase project URL for label storage |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Supabase service role key |

### PatientMobileAPP mobile frontend

| Variable | Description |
|----------|-------------|
| API base URL in `services/api.ts` | Points to the PatientMobileAPP backend |

---

## Seeding demo data

```bash
# Seed medical conditions with embeddings (DoctorAPP)
cd DoctorAPP/back-end
python seed_db.py

# Seed mock patients (DoctorAPP)
python seed_mock_patients.py
```

---

## Health checks

Once services are running, verify they're healthy:

```bash
curl http://localhost:8000/health   # DoctorAPP backend
curl http://localhost:8080/health   # PatientMobileAPP backend
curl http://localhost:3000          # DoctorAPP frontend
```

All backends return `{"status": "ok"}` when healthy.
