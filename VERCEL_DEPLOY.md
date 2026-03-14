# Deploy MyHealthPal frontends to Vercel

This repo has **two frontends**. Create **two Vercel projects** and set each project’s **Root Directory** to the matching path below.

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

## Deploy from CLI

From the repo root, deploy each app by pointing Vercel at the right directory:

```bash
# Doctor app
vercel --cwd DoctorAPP/front-end

# Mobile app (Expo web)
vercel --cwd PatientMobileAPP/frontend/mobile-app
```

On first run, link each to a (different) Vercel project and follow the prompts.
