# MyHealthPal — Crowdfunding Data Layer — Design

**App:** MyHealthPal (React Native)  
**Feature:** Database (storage + API) for crypto crowdfunding posts and contributions. No payment processing, no auth.  
**Date:** 2025-03-10

---

## 1. Purpose & scope

- **Goal:** Let people create crowdfunding campaigns to help pay medical bills and record contributions. Prototype only: no real payments, no authentication.
- **In scope:** Persist campaigns and contributions; expose minimal REST API for the app to create/list campaigns and create/list contributions.
- **Out of scope:** Payment processing, user accounts/auth, PATCH/DELETE, currency/token field.

---

## 2. Storage

- **Single JSON file:** `backend/data/crowdfunding.json` (or project-relative path).
- **Shape:** `{ "campaigns": [ ... ], "contributions": [ ... ] }`.
- **Lifecycle:** Load once at startup (or on first request). On every **create** (campaign or contribution), rewrite the entire file. No DB, no migrations.

---

## 3. Data model

**Campaign**

| Field              | Type   | Notes                                      |
|--------------------|--------|--------------------------------------------|
| id                 | string | Generated (UUID or short id)                |
| owner_identifier   | string | Wallet or display name                     |
| title              | string |                                            |
| description        | string |                                            |
| goal_amount        | number | Non-negative                               |
| status             | string | `active` \| `closed` \| `goal_reached`     |
| deadline           | string \| null | Optional ISO date (e.g. `2025-04-01`) |
| created_at         | string | ISO datetime                               |

**Contribution**

| Field                | Type   | Notes          |
|----------------------|--------|----------------|
| id                   | string | Generated      |
| campaign_id          | string | FK to campaign |
| contributor_identifier | string |            |
| amount               | number | Non-negative   |
| message              | string \| null | Optional   |
| created_at           | string | ISO datetime   |

---

## 4. API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /campaigns | Create campaign. Body: `owner_identifier`, `title`, `description`, `goal_amount`, `deadline?`. Returns created campaign (`status: "active"`). |
| GET    | /campaigns | List all campaigns. |
| GET    | /campaigns/{id} | Single campaign; include computed `total_raised` (sum of contributions for this campaign). 404 if not found. |
| POST   | /campaigns/{id}/contributions | Create contribution. Body: `contributor_identifier`, `amount`, `message?`. 404 if campaign missing. |
| GET    | /campaigns/{id}/contributions | List contributions for campaign. 404 if campaign missing. |

No PATCH/DELETE. No auth.

---

## 5. Where it lives & errors

- **App:** Same FastAPI app as the vision pipeline. New routes and load/save logic in e.g. `backend/app/crowdfunding.py` (or `crowdfunding/` package). Register routes on existing `app`.
- **Validation:** 400 if required fields missing or invalid (e.g. negative amount, empty title). 404 for unknown campaign id. 500 only on file read/write failure.
- **Ids:** Generate with `uuid.uuid4().hex` or similar; keep `campaign_id` and contribution `id` as strings.

---

## 6. Summary

| Item       | Choice                          |
|------------|----------------------------------|
| Storage    | Single JSON file                 |
| Users      | None; owner/contributor as string identifiers |
| Endpoints  | 5 (create campaign, list campaigns, get campaign, create contribution, list contributions) |
| Auth       | None                             |

---

## 7. Pitch prototype: in-app mock

For the pitch, we **do not** call the backend. The app uses an **in-app mock** that matches the backend shapes exactly. Campaign and contribution types (fields, names, and semantics) are the same as in §3 and §4; only the source of data changes. This keeps the UI and data contracts ready for a later swap to the real API.

The mock lives in the React Native app as a static module (e.g. `crowdfundingMockData.ts`): a small list of campaigns and contributions in the same JSON shape the API would return. The "Support" tab reads from this module and, when the user submits a contribution, appends to an in-memory (or AsyncStorage) copy and updates the list and progress. No POST to the server, no persistence beyond the session or local device. When we implement the real backend per the plan above, we replace the mock layer with API calls and leave the screens unchanged.
