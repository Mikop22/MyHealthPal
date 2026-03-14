# Deploy MyHealthPal to Vercel

This repo has **two frontends** and **two backends**. Create a separate Vercel project for each and set the **Root Directory** accordingly.

---

## 1. Doctor app (Next.js)

- **Root Directory:** `DoctorAPP/front-end`
- **Framework:** Next.js (auto-detected via `vercel.json`)
- **Build:** `next build` (default)
- **Output:** handled by Vercel

**Steps:**

1. In [Vercel](https://vercel.com), create a new project and import this repo.
2. Set **Root Directory** to `DoctorAPP/front-end` (Override → Edit).
3. Add env vars if needed (e.g. `NEXT_PUBLIC_API_URL` for production API).
4. Deploy.

---

## 2. Mobile app (Expo web)

- **Root Directory:** `PatientMobileAPP/frontend/mobile-app`
- **Build Command:** `npm run build:web` (runs `expo export --platform web`)
- **Output Directory:** `dist`
- **Routing:** `cleanUrls: true` so Vercel serves Expo's exported `route.html` files at clean paths like `/route`
- **Install Command:** `npm ci` (or leave default)

**Steps:**

1. In Vercel, create a **second** project and import the same repo.
2. Set **Root Directory** to `PatientMobileAPP/frontend/mobile-app`.
3. Vercel will use `vercel.json` in that root:
   - Build: `npm run build:web`
   - Output: `dist`
   - Clean URLs: enabled so direct visits to `/scanner`, `/community`, etc. resolve to Expo's exported `.html` files
4. Add env vars if the web app needs them (e.g. `EXPO_PUBLIC_API_URL`).
5. Deploy.

---

## 3. Doctor app backend (FastAPI / Python)

- **Root Directory:** `DoctorAPP/back-end`
- **Runtime:** `@vercel/python` (auto-detected via `vercel.json`)
- **Entry point:** `api/index.py` → re-exports the FastAPI `app` from `app.main`

**Steps:**

1. In Vercel, create a new project and import this repo.
2. Set **Root Directory** to `DoctorAPP/back-end`.
3. Add the required env vars (see `.env.example`):
   - `OPENAI_API_KEY`, `MONGODB_URI`, `MONGODB_DB_NAME`
   - `ALLOWED_ORIGINS` — set to `*` or the frontend's Vercel URL
   - SMTP vars if email features are needed
4. Deploy.

> **Caveat — ML model cold-start:** The DoctorAPP backend loads a
> `sentence-transformers` embedding model on startup. This works well on
> always-on hosts (Railway, Fly.io, EC2) but may cause cold-start timeouts or
> exceed the 250 MB bundle-size limit on Vercel's Hobby plan. If you hit
> these limits, consider upgrading to a Pro plan (larger functions), using an
> external embedding API, or keeping this backend on Railway while deploying
> everything else on Vercel.

---

## 4. Patient app backend (FastAPI / Python)

- **Root Directory:** `PatientMobileAPP/backend`
- **Runtime:** `@vercel/python`
- **Entry point:** `api/index.py` → re-exports the FastAPI `app` from `app.main`

**Steps:**

1. In Vercel, create a new project and import this repo.
2. Set **Root Directory** to `PatientMobileAPP/backend`.
3. Add the required env vars (see `.env.example`):
   - `SAGEMAKER_ENDPOINT_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - `ALLOWED_ORIGINS` — set to `*` or the mobile web frontend's Vercel URL
   - Supabase / DoctorAPP vars as needed
4. Deploy.

> **Note — file-based storage:** Profile data is stored in JSON files under
> `data/`. Vercel's serverless filesystem is ephemeral, so profile changes
> will not persist across invocations. Migrate to a database (e.g. Supabase)
> before relying on profiles in production.

---

## Deploy from CLI

From the repo root, deploy each app by pointing Vercel at the right directory:

```bash
# Doctor app frontend
vercel --cwd DoctorAPP/front-end

# Mobile app frontend (Expo web)
vercel --cwd PatientMobileAPP/frontend/mobile-app

# Doctor app backend
vercel --cwd DoctorAPP/back-end

# Patient app backend
vercel --cwd PatientMobileAPP/backend
```

On first run, link each to a (different) Vercel project and follow the prompts.
