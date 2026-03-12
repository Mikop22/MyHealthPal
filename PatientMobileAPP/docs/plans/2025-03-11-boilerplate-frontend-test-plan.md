# Boilerplate Frontend (Test-Only) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A minimal web app used only to exercise the MyHealthPal backend APIs (Vision, Crowdfunding, Check In). This is not the real product frontend—just a test harness with forms and response display.

**Architecture:** Single Vite + React app with one page and simple in-page sections (or tabs) for Health, Vision, Crowdfunding, and Check In. Each section calls the backend, shows loading/error state, and renders the JSON response. Base API URL is configurable (default `http://localhost:8000`).

**Tech Stack:** Node 18+, Vite, React 18, minimal CSS. No state library, no router—plain local state and fetch.

---

## Task 1: Project scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`

**Step 1: Create frontend directory and package.json**

Create `frontend/package.json`:

```json
{
  "name": "myhealthpal-boilerplate-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

**Step 2: Add Vite config and index**

Create `frontend/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
```

Create `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>MyHealthPal Backend Test</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Step 3: Add React entry and a minimal App**

Create `frontend/src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Create `frontend/src/index.css`:

```css
body { font-family: system-ui, sans-serif; margin: 1rem; }
section { margin-bottom: 2rem; }
pre { background: #f4f4f4; padding: 0.5rem; overflow: auto; }
.error { color: #c00; }
```

Create `frontend/src/App.jsx`:

```jsx
export default function App() {
  return (
    <div>
      <h1>MyHealthPal Backend Test</h1>
      <p>Use the sections below to hit the API.</p>
    </div>
  )
}
```

**Step 4: Install and run**

Run: `cd frontend && npm install && npm run dev`  
Expected: App runs at http://localhost:5173 and shows the title.

**Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: add Vite + React boilerplate frontend scaffold"
```

---

## Task 2: API client and health check

**Files:**
- Create: `frontend/src/api.js`
- Modify: `frontend/src/App.jsx`

**Step 1: Add API base URL and fetch helper**

Create `frontend/src/api.js`:

```js
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export async function getHealth() {
  const r = await fetch(`${BASE}/health`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export function getBaseUrl() {
  return BASE
}
```

**Step 2: Add Health section to App**

In `frontend/src/App.jsx`, add state and a Health section that calls `getHealth()` on a button click and displays the result (or error). Show the base URL and a “Check health” button; on success show `status`.

Example structure:

```jsx
import { useState } from 'react'
import { getHealth, getBaseUrl } from './api'

export default function App() {
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(null)

  async function handleHealth() {
    setHealthError(null)
    setHealth(null)
    try {
      const data = await getHealth()
      setHealth(data)
    } catch (e) {
      setHealthError(e.message)
    }
  }

  return (
    <div>
      <h1>MyHealthPal Backend Test</h1>
      <p>API base: {getBaseUrl()}</p>

      <section>
        <h2>Health</h2>
        <button type="button" onClick={handleHealth}>Check health</button>
        {healthError && <p className="error">{healthError}</p>}
        {health && <pre>{JSON.stringify(health, null, 2)}</pre>}
      </section>
    </div>
  )
}
```

**Step 3: Run dev server and test**

Run backend: `cd backend && uvicorn app.main:app --port 8000`  
Run frontend: `cd frontend && npm run dev`  
Click “Check health”; expected: `{"status":"ok"}`.

**Step 4: Commit**

```bash
git add frontend/src/api.js frontend/src/App.jsx
git commit -m "feat(frontend): add API client and health check section"
```

---

## Task 3: Vision (POST /translate) test section

**Files:**
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/App.jsx`

**Step 1: Add translate API function**

In `frontend/src/api.js`, add:

```js
export async function postTranslate(formData) {
  const r = await fetch(`${BASE}/translate`, {
    method: 'POST',
    body: formData,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || data.detail || r.statusText)
  return data
}
```

Contract: `POST /translate` with `multipart/form-data`: `image` (required), optional `culture`, `diet`, `biometrics`. Success 200: `{ summaryBullets: string[], nutritionalSwap: string }`. Errors: body has `error` or `detail`.

**Step 2: Add Vision section in App**

Add a form: file input (image), optional text inputs for culture, diet, biometrics; submit builds `FormData`, calls `postTranslate(formData)`, then displays `summaryBullets` and `nutritionalSwap` or error. Use local state for result and error.

**Step 3: Manual test**

Select a small JPEG/PNG, submit; expected: 200 and display of three bullets and one nutritional swap (or 4xx/5xx error message).

**Step 4: Commit**

```bash
git add frontend/src/api.js frontend/src/App.jsx
git commit -m "feat(frontend): add Vision /translate test section"
```

---

## Task 4: Crowdfunding test section

**Files:**
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/App.jsx`

**Step 1: Add crowdfunding API functions**

In `frontend/src/api.js`, add:

```js
export async function getCampaigns() {
  const r = await fetch(`${BASE}/campaigns`)
  if (!r.ok) throw new Error((await r.json()).detail || r.statusText)
  return r.json()
}

export async function getCampaign(id) {
  const r = await fetch(`${BASE}/campaigns/${id}`)
  if (!r.ok) throw new Error((await r.json()).detail || r.statusText)
  return r.json()
}

export async function postCampaign(body) {
  const r = await fetch(`${BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.detail || r.statusText)
  return data
}

export async function postContribution(campaignId, body) {
  const r = await fetch(`${BASE}/campaigns/${campaignId}/contributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.detail || r.statusText)
  return data
}

export async function getContributions(campaignId) {
  const r = await fetch(`${BASE}/campaigns/${campaignId}/contributions`)
  if (!r.ok) throw new Error((await r.json()).detail || r.statusText)
  return r.json()
}
```

Request shapes: Campaign: `{ owner_identifier, title, description, goal_amount, deadline? }`. Contribution: `{ contributor_identifier, amount, message? }`.

**Step 2: Add Crowdfunding section in App**

- “List campaigns” button → `getCampaigns()` → show list (e.g. id, title, goal_amount).
- Form “Create campaign”: owner_identifier, title, description, goal_amount, deadline (optional); submit `postCampaign(body)` → show created campaign or error.
- For one campaign: input campaign id, “Get campaign” → `getCampaign(id)` → show campaign with `total_raised`.
- Form “Add contribution”: campaign id, contributor_identifier, amount, message (optional); submit `postContribution(campaignId, body)` → show created contribution or error.
- “List contributions” for a campaign id → `getContributions(campaignId)` → show list.

Use local state for lists and errors; no persistence.

**Step 3: Manual test**

Create a campaign, list campaigns, get campaign by id, add a contribution, list contributions. Expected: 200 and correct JSON.

**Step 4: Commit**

```bash
git add frontend/src/api.js frontend/src/App.jsx
git commit -m "feat(frontend): add Crowdfunding test section"
```

---

## Task 5: Check In test section

**Files:**
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/App.jsx`

**Step 1: Add check-in API functions**

In `frontend/src/api.js`, add:

```js
export async function getCheckInCards() {
  const r = await fetch(`${BASE}/check-in/cards`)
  if (!r.ok) throw new Error((await r.json()).detail || r.statusText)
  return r.json()
}

export async function postCheckInExtract(body) {
  const r = await fetch(`${BASE}/check-in/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.detail || r.statusText)
  return data
}

export async function postCheckInActionPlan(body) {
  const r = await fetch(`${BASE}/check-in/action-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.detail || r.statusText)
  return data
}
```

Extract body: `{ transcript: string }`. Response: `{ symptoms: [{ symptom, context? }], matched_card_ids: string[] }`.  
Action-plan body: `{ transcript: string, confirmed_card_ids: string[], rejected_card_ids: string[] }`. Response: `{ summary_bullets: string[], questions: string[] }`.

**Step 2: Add Check In section in App**

- “Load cards” button → `getCheckInCards()` → show list of cards (id, text, tags).
- “Extract” form: textarea for transcript; submit `postCheckInExtract({ transcript })` → show `symptoms` and `matched_card_ids`.
- “Action plan” form: transcript, confirmed_card_ids (e.g. comma-separated or checkboxes from loaded cards), rejected_card_ids; submit `postCheckInActionPlan({ transcript, confirmed_card_ids, rejected_card_ids })` → show `summary_bullets` and `questions`.

Use local state; show errors from API.

**Step 3: Manual test**

Load cards, run extract with a short transcript, run action plan with the same transcript and some confirmed/rejected card ids. Expected: 200 and correct shapes.

**Step 4: Commit**

```bash
git add frontend/src/api.js frontend/src/App.jsx
git commit -m "feat(frontend): add Check In test section"
```

---

## Task 6: README and env example

**Files:**
- Create: `frontend/README.md`
- Create: `frontend/.env.example`

**Step 1: Add .env.example**

Create `frontend/.env.example`:

```
VITE_API_BASE=http://localhost:8000
```

**Step 2: Add README**

Create `frontend/README.md` with: purpose (test-only boilerplate for backend), prerequisites (Node 18+, backend running on port 8000), install (`npm install`), run (`npm run dev`), optional `VITE_API_BASE` for a different API URL, and list of sections (Health, Vision, Crowdfunding, Check In).

**Step 3: Commit**

```bash
git add frontend/.env.example frontend/README.md
git commit -m "docs(frontend): add env example and README"
```

---

## Execution handoff

Plan complete and saved to `docs/plans/2025-03-11-boilerplate-frontend-test-plan.md`.

**Two execution options:**

1. **Subagent-driven (this session)** — I dispatch a fresh subagent per task (or per batch of tasks), with review between batches for fast iteration.
2. **Parallel session (separate)** — You open a new session (optionally in a worktree), use **superpowers:executing-plans**, and run through the plan task-by-task with checkpoints.

Which approach do you want?
