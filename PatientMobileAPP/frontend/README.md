# MyHealthPal Boilerplate Frontend (Test Only)

Minimal web app used only to exercise the MyHealthPal backend APIs. This is not the product frontend—just a test harness.

## Prerequisites

- Node 18+
- Backend running (e.g. `cd backend && uvicorn app.main:app --port 8000`)

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

App runs at http://localhost:5173. Set `VITE_API_BASE` (e.g. in `.env`) to point at a different API URL if needed.

## Sections

- **Health** — `GET /health`
- **Vision** — `POST /translate` (image + optional culture, diet, biometrics)
- **Crowdfunding** — list/create campaigns, get campaign, add/list contributions
- **Check In** — load cards, `POST /check-in/extract`, `POST /check-in/action-plan`
