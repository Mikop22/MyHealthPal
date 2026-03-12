# MyHealthPal — Vitals & Lifestyle (Hardware Sync) — Design

**App:** MyHealthPal (React Native)  
**Feature:** Tab 3 — Vitals & Lifestyle (Hardware Sync)  
**Date:** 2025-03-11

---

## 1. Purpose & scope

- **Tab name:** Vitals & Lifestyle (Hardware Sync).
- **Goal:** Give patients a simple way to see their biometrics in context and get metric-specific, low-cost grocery suggestions tied to those metrics. This is **visual storytelling for the pitch**, not clinical decision support.
- **For the prototype:** 
  - No real HealthKit/Google Fit integration.
  - One-tap “Sync” loads **mock biometric + baseline data** and renders charts + suggestions.
  - Everything is local to the app; no backend needed for this feature.

**User scenarios:**
- They’re curious: “How has my body been doing lately?” after using Check In or Scanner.
- They’re trying to connect: “Is my stress/sleep/exercise showing up anywhere in my numbers?”
- They want concrete, affordable ideas: “What could I actually eat this week that helps?”

---

## 2. What’s real vs mocked

### Real (in the prototype)

- **Charts:** We use `react-native-gifted-charts` to render smooth time-series for each metric with:
  - An **“actual”** series (mock values).
  - A faint **“ghost baseline”** series (mock baseline).
- **Delta calculations:** We can compute simple percentage/absolute deltas between the mock actuals and mock baseline for display text (e.g. “down ~15%”).
- **UI state:** Real interaction: “Sync” button updates state; scrolling and chart interaction are real.

### Mocked

- **Hardware / HealthKit sync:** 
  - No actual Apple HealthKit or other device APIs.
  - The “Sync with Apple Health” button simply loads a canned data set and flips the UI from empty state to charts.
- **Biometric data & baselines:**
  - All values, trends, and baselines are **predefined in-code or static JSON**, designed to tell a clear story (e.g. HRV dip, sleep short, steps low).
- **Grocery suggestions:**
  - Fixed lists of 2–3 “cheap grocery alternatives” per metric (e.g. oats, lentils, leafy greens).
  - No live pricing or store integration; no personalization beyond “per metric.”
- **Persistence & accounts:**
  - No user accounts, no multi-device sync, no long-term history beyond what’s in the mock dataset.

---

## 3. Metrics & structure

We show a **broader set** of vitals, each as its own block in a single scrollable screen. Target metrics:

1. **HRV (Heart Rate Variability)** — primary “stress/recovery” metric.
2. **Resting Heart Rate (RHR)** — cardiovascular load/stress.
3. **Sleep** — duration (and optionally quality as a secondary value).
4. **Steps** — daily movement volume.
5. **Active Energy** — exercise calories/spend.
6. **Optional:** **Blood Oxygen (SpO₂)** — if we want an extra block; likely a more stable line.

**Per metric, the data we mock:**
- **Time window:** e.g. last 7 days (or 14 days) with one value per day.
- **Actual values:** array of numbers (units per metric).
- **Baseline:** 
  - Either a single baseline value (e.g. 7-day average) expanded as a flat ghost line.
  - Or its own array if we want a more nuanced baseline shape.
- **Headline delta:** derived from actual vs baseline, expressed in plain language (e.g. “HRV is down ~15% vs your usual” or “You walked ~3,000 fewer steps than your average yesterday”).

All of this lives in a **static mock data module** the UI reads from after “Sync.”

---

## 4. User flow & layout

### 4.1 Entry & empty state

- Tab label/icon: **“Vitals”** or **“Vitals & Lifestyle”** in the main navigator.
- First load shows:
  - Title: “Vitals & Lifestyle”
  - Short explainer: “See how your recent vitals compare to your usual and get simple, affordable ideas for what to eat.”
  - **Primary button:** “Sync with Apple Health” (or “Load sample data” for non-iOS demo).
  - No charts displayed yet; just empty state.

### 4.2 One-tap sync (mock)

- When the user taps **Sync**:
  - We **do not** ask for real HealthKit permission.
  - We simulate a brief loading state (“Syncing your vitals…” with a small spinner).
  - We then load the mock dataset into state and reveal the metrics list.

### 4.3 Metrics list (single scroll)

After sync succeeds, the screen becomes a vertical **scroll** of **metric blocks** in a fixed order:

1. HRV  
2. Resting Heart Rate  
3. Sleep  
4. Steps  
5. Active Energy  
6. (Optional) SpO₂  

Each block contains:

1. **Header**
   - Metric name (“Heart rate variability (HRV)”).
   - Optional short subtitle (“How your nervous system is recovering”).

2. **Chart area (react-native-gifted-charts)**
   - X-axis: days (e.g. Mon–Sun).
   - Y-axis: units per metric (e.g. ms, bpm, hours, steps, kcal).
   - **Series 1 — Actual:** solid line or bars (slightly thicker, primary color).
   - **Series 2 — Baseline ghost:** thinner, lighter, or dashed line representing the user’s usual level.
   - Optional highlight on the latest day’s value.

3. **Insight line**
   - One sentence tied to that metric’s delta, e.g.:
     - HRV: “Your HRV this week is around 15% lower than your usual.”
     - RHR: “Your resting heart rate has been 5 bpm higher than normal for 3 days.”
     - Sleep: “You’ve slept about 2 hours less than your average over the last 2 nights.”
     - Steps: “You walked ~3,000 fewer steps than your weekly average yesterday.”
     - Active energy: “Your exercise minutes were lower than usual this week.”
   - All copy is generated from the mock values or stored directly with the mock data.

4. **Grocery suggestions**
   - Label: “Try these this week” or “Affordable ideas that can help.”
   - List of 2–3 **chips or small cards** showing:
     - Food name (e.g. “Oats”, “Leafy greens”, “Lentils”, “Turmeric”, “Frozen berries”).
     - Optional tiny subtext explaining why:
       - “High in fiber; supports blood sugar and energy.”
       - “Packed with antioxidants; supports recovery.”
   - These are **metric-specific**:
     - HRV / RHR: anti-inflammatory and cardiovascular-supportive items.
     - Sleep: foods that support sleep routine (e.g. chamomile, walnuts, kiwis).
     - Steps / energy: simple, slow-release carbs and protein.

The whole screen should feel like a **gentle, coach-like dashboard** rather than a medical report.

---

## 5. Visual style & UX notes

- **Charts:**
  - Use smooth curves for HRV, RHR, SpO₂.
  - Use bars or stacked bars for steps and active energy (per day).
  - Keep colors consistent (e.g. primary color for actual, muted version for baseline).
  - Use minimal axes and labels to avoid clutter; key details come from the text.

- **Ghost baseline:**
  - Must be visually distinct but subtle.
  - Examples: lighter stroke color, lower opacity, dotted/dashed style.
  - In copy, refer to it as “your usual” rather than “baseline” to keep language friendly.

- **Microcopy:**
  - Avoid clinical claims; keep it in the realm of **patterns and ideas**, not diagnoses.
  - Examples:
    - “Looks like your body has been under a bit more stress than usual.”
    - “You slept less than your usual over the last few nights.”
    - “Small changes in what’s in your basket can add up over time.”

- **Accessibility:**
  - Ensure color contrast between actual and baseline.
  - Text for deltas and suggestions should be readable without having to interpret the chart.

---

## 6. Data model (mock, app-side)

We can represent mock data in a single TS/JS object (conceptual shape here):

- `metrics`: array of metric objects with:
  - `id` (e.g. `"hrv"`, `"rhr"`, `"sleep"`, `"steps"`, `"active_energy"`, `"spo2"`).
  - `name`, `subtitle`.
  - `unit` (e.g. `"ms"`, `"bpm"`, `"hours"`, `"steps"`, `"kcal"`, `"%"`).
  - `actual`: array of `{ label: string, value: number }` (e.g. `[{ label: "Mon", value: 7.2 }, ...]`).
  - `baseline`: same shape or a single number.
  - `headlineDelta`: precomputed string (or enough info to compute one).
  - `grocerySuggestions`: array of `{ name: string, reason?: string }`.

This mock object is loaded when the user taps Sync and stays in memory for the rest of the session.

---

## 7. Summary table

| Item                     | Choice                                                      |
|--------------------------|-------------------------------------------------------------|
| Data source              | Fully mocked, local in app                                  |
| Sync behavior            | One-tap button → loads canned data, no real HealthKit       |
| Metrics shown            | HRV, RHR, sleep, steps, active energy, optional SpO₂        |
| Charts                   | `react-native-gifted-charts` with actual + ghost baseline   |
| Deltas                   | Simple percentage/absolute comparisons from mock vs baseline|
| Grocery suggestions      | Fixed 2–3 items per metric with short “why” text            |
| Backend                  | None required for this feature                              |
| Tone                     | Friendly, non-clinical, focused on patterns and ideas       |

