# Check In Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the Check In tab to MyHealthPal: voice symptom intake, LLM-driven symptom extraction, swipeable card deck for confirmation, and Action Plan (summary, questions to ask, London clinic map). Real STT and LLM; mocked auth, training pipeline, and emergency routing.

**Architecture:** (1) Backend: two FastAPI endpoints—POST /check-in/extract (transcript → structured symptoms), POST /check-in/action-plan (transcript + card responses → summary bullets + questions). (2) App: Check In screen with split UI (top: mic + STT; bottom: card deck); on Done → Action Plan screen with summary, checklist, and react-native-maps. Card bank in app or backend; match and order cards from extracted symptoms (Option B).

**Tech Stack:** React Native, react-native-maps; Expo AV or platform STT for voice; existing FastAPI backend + OpenAI (or same LLM provider as Vision); Pydantic for request/response.

---

## Task 1: Card bank data and types

**Files:**
- Create: `backend/app/check_in_data.py` (or `app/data/symptom_cards.json` + loader in app)
- Create: `backend/app/check_in_schemas.py`

**Step 1: Define symptom card shape**

In `backend/app/check_in_schemas.py` (or equivalent in app if cards live in RN):

- `SymptomCard`: `id: str`, `text: str`, `subtitle: str | None`, `tags: list[str]`
- `StructuredSymptom` (LLM output): `symptom: str`, `context: str | None`
- `ExtractResponse`: `symptoms: list[StructuredSymptom]`
- `ActionPlanRequest`: `transcript: str`, `confirmed_card_ids: list[str]`, `rejected_card_ids: list[str]`
- `ActionPlanResponse`: `summary_bullets: list[str]`, `questions: list[str]`

**Step 2: Create minimal card bank**

Create a JSON file or Python list with 10–15 symptom cards covering 2–3 example flows (e.g. chest/breathing, headache, stomach). Each card has `id`, `text`, `subtitle`, `tags`. Example:

```json
[
  { "id": "chest-tight", "text": "Chest feels tight when I walk or climb stairs", "subtitle": "You notice it more with activity.", "tags": ["chest", "exertion", "breathing"] },
  { "id": "dizzy-meals", "text": "I feel dizzy after eating", "subtitle": null, "tags": ["dizziness", "meals"] }
]
```

**Step 3: Expose card list via backend (optional) or load in app**

- Backend: add `GET /check-in/cards` returning the full card list (so app can load once).
- Or ship cards as static JSON in the app and load from there. Plan assumes backend exposes cards so one source of truth.

**Step 4: Commit**

```bash
git add backend/app/check_in_data.py backend/app/check_in_schemas.py
git commit -m "feat(check-in): add symptom card bank and request/response schemas"
```

---

## Task 2: POST /check-in/extract endpoint

**Files:**
- Create: `backend/app/check_in.py` (router)
- Modify: `backend/app/main.py` (include router)
- Test: `backend/tests/test_check_in_extract.py`

**Step 1: Write failing test**

- Test: `POST /check-in/extract` with body `{ "transcript": "I have chest tightness when I walk and dizziness after meals" }` returns 200 and JSON with `symptoms` array; each element has `symptom` and optional `context`.
- Test: empty transcript returns 400 or empty symptoms per product rule.

**Step 2: Implement endpoint**

- Accept JSON body: `{ "transcript": str }`.
- Call LLM with prompt: from transcript, extract structured list of symptoms and context; return JSON array of `{ "symptom": "...", "context": "..." }`.
- Parse LLM response into `ExtractResponse`; return it. On parse failure return 500.

**Step 3: Run test**

Run: `pytest backend/tests/test_check_in_extract.py -v`. Expected: PASS.

**Step 4: Commit**

```bash
git add backend/app/check_in.py backend/app/main.py backend/tests/test_check_in_extract.py
git commit -m "feat(check-in): add POST /check-in/extract for symptom extraction"
```

---

## Task 3: Card selection and ordering (match + optional reorder)

**Files:**
- Create: `backend/app/check_in_cards.py`
- Test: `backend/tests/test_check_in_cards.py`

**Step 1: Write matching logic**

- Function `match_symptoms_to_cards(extracted: list[StructuredSymptom], card_bank: list[SymptomCard], top_n: int = 10) -> list[SymptomCard]`:
  - For each card, score by tag/keyword overlap with extracted symptom phrases (case-insensitive).
  - Sort by score descending; return top `top_n` cards.

**Step 2: Write failing test**

- Given one extracted symptom "chest tightness" and a bank with one card tagged ["chest", "exertion"], match returns that card.
- Given two cards with overlapping tags, higher overlap wins.

**Step 3: Implement and run tests**

Run: `pytest backend/tests/test_check_in_cards.py -v`. Expected: PASS.

**Step 4: Optional reorder by LLM**

- Add function or endpoint that takes extracted symptoms + list of card texts and asks LLM: "Suggest best order for patient to see these." Return ordered list of card ids. (Can be Task 3b or part of Task 2 response.)

**Step 5: Commit**

```bash
git add backend/app/check_in_cards.py backend/tests/test_check_in_cards.py
git commit -m "feat(check-in): match extracted symptoms to card bank and optionally reorder"
```

---

## Task 4: POST /check-in/action-plan endpoint

**Files:**
- Modify: `backend/app/check_in.py`
- Test: `backend/tests/test_check_in_action_plan.py`

**Step 1: Write failing test**

- POST /check-in/action-plan with body `ActionPlanRequest` (transcript + confirmed/rejected card ids) returns 200 and JSON with `summary_bullets` (list of str) and `questions` (list of str, length 5).

**Step 2: Implement endpoint**

- Accept `ActionPlanRequest`. Call LLM with transcript and card responses; ask for (1) 3–5 plain-language summary bullets, (2) exactly 5 advocacy-focused "questions to ask your doctor." Parse and return `ActionPlanResponse`. On parse failure return 500.

**Step 3: Run test**

Run: `pytest backend/tests/test_check_in_action_plan.py -v`. Expected: PASS.

**Step 4: Commit**

```bash
git add backend/app/check_in.py backend/tests/test_check_in_action_plan.py
git commit -m "feat(check-in): add POST /check-in/action-plan for summary and questions"
```

---

## Task 5: Check In tab and screen shell (React Native)

**Files:**
- Create: `app/screens/CheckInScreen.tsx` (or equivalent path in your RN project)
- Modify: navigation/tabs to add "Check In" tab

**Step 1: Add tab**

- Add "Check In" to bottom (or top) tab navigator; icon and label "Check In". Route to `CheckInScreen`.

**Step 2: Create screen shell**

- CheckInScreen: full-screen container with two main regions (top half, bottom half) as placeholders (e.g. View with flex). Top: placeholder text "Voice input"; bottom: "Symptom cards". No logic yet.

**Step 3: Run app**

Run: `npx expo start` (or your RN run command). Navigate to Check In tab. Expected: split layout visible.

**Step 4: Commit**

```bash
git add app/screens/CheckInScreen.tsx app/navigation/*
git commit -m "feat(check-in): add Check In tab and screen shell"
```

---

## Task 6: Voice input UI and STT

**Files:**
- Create: `app/components/CheckIn/VoiceInput.tsx`
- Modify: `app/screens/CheckInScreen.tsx`

**Step 1: Implement VoiceInput component**

- Glowing/pulsing microphone button (styled per design). On press: start recording (Expo AV or react-native-voice / platform API). On release or stop: get audio → call STT (device or cloud). On result: callback `onTranscript(transcript: string)`.
- Show "Listening…" and optional waveform while recording. If STT is async, show "Organizing your symptoms…" after transcript is ready until parent has received transcript.

**Step 2: Integrate in CheckInScreen**

- State: `transcript: string | null`. When `onTranscript` fires, set transcript and trigger request to `POST /check-in/extract` with transcript. Store `extractedSymptoms` in state for next task.

**Step 3: Run app**

Verify: tap mic → record → transcript appears (or mock); extract API is called and response stored.

**Step 4: Commit**

```bash
git add app/components/CheckIn/VoiceInput.tsx app/screens/CheckInScreen.tsx
git commit -m "feat(check-in): voice input and STT with extract API call"
```

---

## Task 7: Swipeable symptom card deck

**Files:**
- Create: `app/components/CheckIn/SymptomCardDeck.tsx`
- Modify: `app/screens/CheckInScreen.tsx`

**Step 1: Implement card deck**

- Props: `cards: SymptomCard[]`, `onDone: (confirmed: string[], rejected: string[]) => void`.
- Use swipeable component (e.g. react-native-deck-swiper or custom PanResponder / gesture handler). Swipe right = confirm (add card id to confirmed), swipe left = reject (add to rejected). Show card text, subtitle, tags. Optional "Done" button to finish early.
- When deck is empty or user taps Done, call `onDone(confirmedIds, rejectedIds)`.

**Step 2: Wire cards in CheckInScreen**

- After extract returns: call backend to get ordered cards (use match from Task 3; if cards endpoint returns full list, run match in app or add `POST /check-in/cards/order` that takes transcript and returns ordered card ids). Render `SymptomCardDeck` with ordered cards.
- When `onDone` fires: store confirmed/rejected; call `POST /check-in/action-plan` with transcript + confirmed/rejected; navigate to Action Plan screen (or set state to show it).

**Step 3: Run app**

Verify: after voice, cards appear in order; swipe updates state; Done triggers action-plan request and transition.

**Step 4: Commit**

```bash
git add app/components/CheckIn/SymptomCardDeck.tsx app/screens/CheckInScreen.tsx
git commit -m "feat(check-in): swipeable symptom cards and action-plan request"
```

---

## Task 8: Action Plan screen (summary + questions)

**Files:**
- Create: `app/screens/ActionPlanScreen.tsx` (or same CheckInScreen with conditional view)
- Create: `app/components/CheckIn/SummarySection.tsx`, `QuestionsSection.tsx`

**Step 1: Summary section**

- Receives `summary_bullets: string[]`. Render "Here's what we heard" + list of bullets. "Copy summary" button copies bullets to clipboard.

**Step 2: Questions section**

- Receives `questions: string[]`. Render "If you talk to a doctor, here are 5 good questions" + numbered checklist. Tap toggles check state (local state). Optional "Copy" for summary + questions.

**Step 3: Action Plan layout**

- ScrollView: SummarySection, then QuestionsSection, then placeholder for map (Task 9). Pass in data from action-plan API response.

**Step 4: Run app**

Verify: after completing cards, Action Plan shows with summary and questions from API.

**Step 5: Commit**

```bash
git add app/screens/ActionPlanScreen.tsx app/components/CheckIn/SummarySection.tsx app/components/CheckIn/QuestionsSection.tsx
git commit -m "feat(check-in): Action Plan summary and questions sections"
```

---

## Task 9: Clinic map (react-native-maps)

**Files:**
- Create: `app/components/CheckIn/ClinicMap.tsx`
- Modify: `app/screens/ActionPlanScreen.tsx` (or Check In flow)

**Step 1: Add react-native-maps**

- If not already: `npx expo install react-native-maps`. Configure for iOS/Android per Expo/RN docs.

**Step 2: Implement ClinicMap**

- Props: `clinics: Array<{ id: string, name: string, lat: number, lng: number, description?: string, distance?: string }>`, optional `userRegion` (lat/lng for London demo).
- Render MapView with region centered on user or first clinic. Plot 3 clinic pins. Below map, flat list of clinics: name, description, distance; tap scrolls/highlights pin. "Directions" opens system maps with clinic coordinates (mock "Call"/"Website" OK).
- Use fixed London user coordinate and 3 mock clinics with name, lat/lng, description, distance (e.g. "10 min walk").

**Step 3: Add disclaimer**

- Small text: "This is not emergency advice. If you think it's an emergency, call your local emergency number."

**Step 4: Run app**

Verify: Action Plan shows map with 3 pins and list; tap clinic highlights pin; Directions opens external map.

**Step 5: Commit**

```bash
git add app/components/CheckIn/ClinicMap.tsx app/screens/ActionPlanScreen.tsx
git commit -m "feat(check-in): clinic map with 3 London clinics and directions"
```

---

## Task 10: First-time onboarding (optional)

**Files:**
- Create: `app/screens/CheckInOnboardingScreen.tsx` or modal
- Modify: navigation or CheckInScreen to show once (e.g. AsyncStorage flag)

**Step 1: Explain and optional demographics**

- Short copy: "Use Check In when something feels off, before or after a visit, or to track symptoms. We'll help you organize your story and questions."
- "Get started" button. Optional: one-time age range and ethnicity chips; store in local state or AsyncStorage (not sent to backend for prototype). Then set "onboarding done" and navigate to Check In intake.

**Step 2: Show once**

- On first open of Check In tab, if onboarding not done, show onboarding; else show intake.

**Step 3: Commit**

```bash
git add app/screens/CheckInOnboardingScreen.tsx app/screens/CheckInScreen.tsx
git commit -m "feat(check-in): first-time onboarding and optional demographics"
```

---

## Task 11: Integration and error handling

**Files:**
- Modify: `app/screens/CheckInScreen.tsx`, `app/screens/ActionPlanScreen.tsx`, API layer

**Step 1: Loading and errors**

- Show loading state during extract and action-plan calls. On 4xx/5xx or network error: show friendly message and retry option. Do not leave user stuck.

**Step 2: Empty transcript**

- If transcript is empty after STT, show "We couldn't catch that. Try again?" and allow re-record.

**Step 3: End-to-end run**

- Run app; complete flow: onboarding (if any) → voice → cards → Done → Action Plan (summary, questions, map). Verify no crashes and copy/share work.

**Step 4: Commit**

```bash
git add app/screens/CheckInScreen.tsx app/screens/ActionPlanScreen.tsx
git commit -m "fix(check-in): loading states and error handling"
```

---

## Execution handoff

Plan complete and saved to `docs/plans/2025-03-11-check-in-implementation-plan.md`.

**Two execution options:**

1. **Subagent-driven (this session)** — I dispatch a fresh subagent per task (or per backend vs app batch), review between tasks, fast iteration.
2. **Parallel session (separate)** — You open a new session in the repo (or worktree) and use **superpowers:executing-plans** to run the plan task-by-task with checkpoints.

Which approach do you want?
