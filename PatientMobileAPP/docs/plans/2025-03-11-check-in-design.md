# MyHealthPal — Check In Tab — Design

**App:** MyHealthPal (React Native)  
**Feature:** Check In tab — symptom intake (voice + swipeable cards), triage-style summary, questions to ask, and clinic map.  
**Date:** 2025-03-11

---

## 1. Purpose & scope

- **Users:** Patients. They open the Check In tab when:
  - **Something feels off** (acute/uncertain) — e.g. new chest tightness, headache; they want to turn fuzzy worries into a clear, shareable summary.
  - **Before or after a doctor visit** — to log symptoms and get a “questions to ask” checklist.
  - **Ongoing chronic tracking** — quick daily or flare-up logging (e.g. asthma, migraines).
- **Same UI** for all three; the pitch narrative changes by scenario.
- **Grand plan (stated, not built):** Reported symptoms (human feedback) + doctor’s diagnosis (ground truth) are eventually weighted to improve symptom–diagnosis models, especially for underrepresented populations. No training pipeline or data collection in this prototype.

---

## 2. What is real vs mocked

### Implemented (real)

- **Speech-to-text:** OS or cloud STT (e.g. Whisper) for voice intake.
- **LLM API calls:**
  - Extract structured symptoms + context from transcript.
  - Generate “Check-In Summary” bullets.
  - Generate “Questions to Ask” list.
- **Symptom cards:** Predefined bank; selection and ordering driven by LLM-extracted symptoms (see §5).
- **Clinic map:** `react-native-maps` with London map; clinic list can be from a real places API or a fixed list with real coordinates. No “emergency vs urgent” logic.
- **Local/session storage:** Check-in data can be stored locally or in a simple backend for the session/demo only.

### Mocked (conceptual only for pitch)

- **Emergency / routing intelligence** — determining emergency vs urgent vs routine; any smart routing beyond “here are some clinics.”
- **Data collection for training** — storage of check-ins as training signals; any pipeline to aggregate, de-identify, and train models.
- **Authentication & user accounts** — sign-in, multi-device sync, secure medical history, sharing with providers.
- **RLHF / learned ranking** — any model that has learned from diagnosis-weighted feedback to order cards; we only use “relevant to what they said” ordering.

---

## 3. User flow & screens

### 3.1 Entry

- **First time:** Short explainer (“Use Check In when something feels off, before/after a visit, or to track symptoms”) + “Get started.” Optional one-time demographics (age range, ethnicity) with clear “helps us tailor questions” framing.
- **Returning:** Tab opens directly to the intake screen; optional “Last check-in: X days ago” hint.

### 3.2 Intake (split UI)

**Top half — Voice**

- Glowing microphone; tap/toggle to record.
- Copy: “Describe what’s going on in your own words.” / “Any language is okay.”
- On submit: STT → transcript; then “Organizing your symptoms…” while LLM runs.
- Output: transcript + structured symptom list (see §5).

**Bottom half — Symptom cards**

- Deck of cards (stack). Each card: main statement, optional subtitle, optional tags (e.g. “Physical”, “Started 1–3 days ago”).
- Swipe right = Yes, left = No; optional tap for “Not sure” or more detail.
- Optional “?” on card for short explanation (health literacy).
- Cards are chosen and ordered from the bank using LLM-extracted symptoms (Option B, §5).
- User can tap “Done” when satisfied; minimum number of cards or time is optional.

### 3.3 Action Plan (post-intake)

Single scrollable view with three sections:

1. **Your Check-In Summary**
   - “Here’s what we heard.”
   - 3–5 bullets (from LLM, based on transcript + confirmed cards).
   - “Copy summary” to paste elsewhere.

2. **Questions to Ask**
   - “If you talk to a doctor, here are 5 good questions.”
   - Numbered checklist (tap to check); optionally “Share / Copy” (summary + questions).
   - Questions from LLM; generic, non-diagnostic, advocacy-focused.

3. **Where you can go (London clinics map)**
   - `react-native-maps` with user-ish location (demo: fixed London point) and 3 clinic pins.
   - List below: name, short description, distance/time (e.g. “10 min walk”), “Open now” / “Opens 8am.”
   - Tap clinic → highlight on map; mock “Call”, “Directions”, “Website.”
   - Small disclaimer: not emergency advice; call emergency if needed.

---

## 4. Data flow (high level)

1. User records voice → STT → transcript.
2. App sends transcript to backend (or in-app LLM call); backend returns structured symptoms (see §5).
3. App matches structured symptoms to card bank; builds ordered deck; user swipes.
4. On “Done”: send transcript + confirmed/rejected card ids (and any severity) to LLM → get summary bullets + questions to ask.
5. Render Action Plan; load map + clinic list (real API or fixed JSON).

---

## 5. Cards in context of symptoms (Option B)

### 5.1 Card bank

- **Stored in app (or backend):** List of symptom cards. Each card has:
  - `id`, `text` (main statement), `subtitle` (optional), `tags` (e.g. `["chest", "exertion", "cardiovascular"]`).
- Wording is fixed and safe; no LLM-generated card text.

### 5.2 Two-step flow

**Step 1 — Structure the input (LLM)**

- **Input:** User transcript.
- **Prompt (conceptually):** “From this description, extract a structured list of symptoms and context. For each: symptom phrase, brief context (e.g. when it happens), duration/severity if mentioned. Return as a short JSON list.”
- **Output (example):**  
  `[{ "symptom": "chest tightness", "context": "when walking or climbing stairs" }, { "symptom": "dizziness", "context": "after meals" }]`
- This same structure is used later for the Check-In Summary.

**Step 2 — Match and order**

- **Match:** For each extracted symptom (and optionally context), match to cards in the bank via tags/keywords (e.g. overlap, or simple embedding similarity). Score cards by match strength.
- **Select:** Take top N cards (e.g. 8–12).
- **Order:** By match score, or by an optional second LLM call: “Given these extracted symptoms, here are the card texts we will show; suggest the best order for the patient to see them.” Use returned order for the deck.
- **Render:** Deck shows only these cards in the chosen order.

### 5.3 RLHF (out of scope for prototype)

- In the app we do **not** use diagnosis or past outcomes to order cards.
- The “human feedback” = what the user reports (voice + swipes). The “ground truth” = doctor’s diagnosis. Weighting symptoms against diagnosis for model improvement is part of the future vision and is mocked.

---

## 6. Tech notes

- **Map:** `react-native-maps`; London; 3 clinics (real places API or fixed list).
- **Backend:** Can be same FastAPI app as Vision/Crowdfunding; new route(s) for symptom extraction and for summary + questions. Or client-side LLM calls if appropriate.
- **STT:** Use OS APIs or e.g. Whisper/cloud STT; no mock transcript in the main flow.

---

## 7. Summary table

| Item | Choice |
|------|--------|
| Card selection | Option B: LLM extracts structured symptoms → match to card bank → order by score or LLM |
| Voice | Real STT (OS or cloud) |
| Summary + questions | Real LLM |
| Map | react-native-maps; 3 London clinics (real or fixed list) |
| Mocked | Emergency/routing logic; training pipeline; auth; RLHF learned ranking |
| RLHF (vision) | Reported symptoms = human feedback; diagnosis = ground truth; weighting not built |
