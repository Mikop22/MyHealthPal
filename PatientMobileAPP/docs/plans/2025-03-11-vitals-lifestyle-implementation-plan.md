# Vitals & Lifestyle (Hardware Sync) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Vitals & Lifestyle tab in MyHealthPal: a mocked “Sync with Apple Health” action that loads canned biometric + baseline data, then displays smooth ghost charts and metric-specific grocery suggestions in a single scroll.

**Architecture:** Frontend-only feature in the React Native app. A new tab/screen hosts: (1) an empty state with a Sync button, and (2) after sync, a scrollable list of metric blocks. Each block renders one chart (actual vs ghost baseline) using `react-native-gifted-charts` plus an insight line and grocery chips, all powered by a static mock data module. No backend or HealthKit integration.

**Tech Stack:** React Native, TypeScript (if available), React Navigation (tabs), `react-native-gifted-charts`, basic state management (React hooks or existing store).

---

## Task 1: Create mock data module

**Files:**
- Create: `app/data/vitalsMockData.ts` (or similar under your app src root)

**Step 1: Define TypeScript types (or JS JSDoc)**

- Define `VitalsMetricPoint` (`label: string`, `value: number`).
- Define `GrocerySuggestion` (`name: string`, `reason?: string`).
- Define `VitalsMetric`:
  - `id: "hrv" | "rhr" | "sleep" | "steps" | "active_energy" | "spo2"` (or `string`).
  - `name: string`, `subtitle?: string`, `unit: string`.
  - `actual: VitalsMetricPoint[]`, `baseline: VitalsMetricPoint[] | number`.
  - `headlineDelta: string`.
  - `grocerySuggestions: GrocerySuggestion[]`.
- Export `vitalsMockData: VitalsMetric[]`.

**Step 2: Populate mock data**

- For each metric (HRV, RHR, sleep, steps, active energy, optional SpO₂), create 7 days of `actual` values and either:
  - a flat `baseline` number expanded into points in the UI, or
  - a `baseline` array at a slightly different level to show a meaningful delta.
- Design values so that:
  - HRV and sleep show a small dip vs baseline,
  - RHR is slightly higher,
  - steps/active energy are lower on a couple days,
  - SpO₂ is mostly stable.
- Fill `headlineDelta` with friendly strings (e.g. “HRV is about 15% lower than your usual this week”).
- Add 2–3 `grocerySuggestions` per metric with short reasons.

**Step 3: Export a helper**

- Optionally export a `getVitalsMockData()` function that returns the array; this allows future replacement with real data while preserving the same interface.

**Step 4: Commit**

```bash
git add app/data/vitalsMockData.ts
git commit -m "feat(vitals): add mock vitals and grocery data module"
```

---

## Task 2: Add Vitals & Lifestyle tab and screen shell

**Files:**
- Create: `app/screens/VitalsScreen.tsx`
- Modify: navigation (e.g. `app/navigation/BottomTabNavigator.tsx`)

**Step 1: Add tab route**

- In your tab navigator, add a new tab named “Vitals” or “Vitals & Lifestyle” pointing to `VitalsScreen`.
- Choose an icon consistent with the rest of the app (e.g. heart/graph).

**Step 2: Implement screen skeleton**

- `VitalsScreen` should:
  - Render a header/title (“Vitals & Lifestyle”).
  - Show a primary button labeled “Sync with Apple Health” (text only for now).
  - Show an empty-state message when not synced (“Tap Sync to see your vitals and suggestions.”).
- No charts yet; just layout.

**Step 3: Run app**

- Start the app (e.g. `npx expo start`) and navigate to the Vitals tab.
- Verify the tab appears and the empty state + Sync button are visible.

**Step 4: Commit**

```bash
git add app/screens/VitalsScreen.tsx app/navigation/*
git commit -m "feat(vitals): add Vitals & Lifestyle tab and screen shell"
```

---

## Task 3: Wire Sync button to load mock data

**Files:**
- Modify: `app/screens/VitalsScreen.tsx`

**Step 1: Add state and import mock data**

- Import `vitalsMockData` (or `getVitalsMockData`) from `app/data/vitalsMockData`.
- In `VitalsScreen`, add state:
  - `const [hasSynced, setHasSynced] = useState(false);`
  - `const [metrics, setMetrics] = useState<VitalsMetric[] | null>(null);`

**Step 2: Implement Sync handler**

- On button press:
  - Optionally show a short loading state (“Syncing your vitals…”).
  - After a small timeout (e.g. 500ms), set `metrics` to `vitalsMockData` and `hasSynced` to `true`.

**Step 3: Conditional rendering**

- When `!hasSynced`, show the empty state.
- When `hasSynced` and `metrics`, render a placeholder list of metric names (no charts yet).

**Step 4: Run app**

- Tap Sync, verify the empty state disappears and the metric list appears.

**Step 5: Commit**

```bash
git add app/screens/VitalsScreen.tsx
git commit -m "feat(vitals): load mock vitals data on sync"
```

---

## Task 4: Install and configure react-native-gifted-charts

**Files:**
- Modify: project dependencies (e.g. `package.json`)
- Create: `app/components/Vitals/VitalsChart.tsx`

**Step 1: Install library**

- Run: `npm install react-native-gifted-charts` (or `yarn add react-native-gifted-charts`).

**Step 2: Create VitalsChart component**

- `VitalsChart` props:
  - `points: VitalsMetricPoint[]` (actual),
  - `baseline: VitalsMetricPoint[]` (expanded baseline),
  - `unit: string`,
  - optional `color?: string`.
- Use `LineChart` (or `BarChart` for steps/active energy) from `react-native-gifted-charts`.
- Render:
  - **Actual**: main series (e.g. thicker stroke, primary color).
  - **Baseline ghost**: second series, lighter color / lower opacity / dashed.
- Keep axes minimal; show x-labels from `label` and tooltip/value labels as needed.

**Step 3: Test chart in isolation**

- Temporarily hardcode a small data set in `VitalsChart` story/demo or within VitalsScreen to ensure charts render correctly.

**Step 4: Commit**

```bash
git add package.json package-lock.json yarn.lock app/components/Vitals/VitalsChart.tsx
git commit -m "feat(vitals): add react-native-gifted-charts and VitalsChart component"
```

---

## Task 5: Metric block component (chart + insight + groceries)

**Files:**
- Create: `app/components/Vitals/VitalsMetricBlock.tsx`
- Modify: `app/screens/VitalsScreen.tsx`

**Step 1: Implement VitalsMetricBlock**

- Props: `metric: VitalsMetric`.
- Responsibilities:
  - Render metric name + subtitle.
  - Prepare `points` from `metric.actual`.
  - Expand `metric.baseline`:
    - If baseline is a number, map it into an array of `{ label, value: baseline }` matching `actual.length`.
    - If it’s already an array, pass through.
  - Use `VitalsChart` to render actual vs ghost baseline.
  - Render `headlineDelta` as the insight line.
  - Render `grocerySuggestions` as chips/cards (e.g. small pill components).

**Step 2: Integrate into VitalsScreen**

- When `hasSynced` and `metrics` is not null:
  - Replace the placeholder list with a `FlatList` or `ScrollView` of `VitalsMetricBlock` components.
  - Use the fixed order defined in the mock data (HRV → RHR → Sleep → Steps → Active Energy → SpO₂).

**Step 3: Run app**

- Sync and scroll:
  - Each metric block should show a chart with two series, insight text, and grocery chips.
  - Verify layout works on small and large devices (basic checks).

**Step 4: Commit**

```bash
git add app/components/Vitals/VitalsMetricBlock.tsx app/screens/VitalsScreen.tsx
git commit -m "feat(vitals): metric block with chart, insight, and grocery suggestions"
```

---

## Task 6: Visual polish and copy

**Files:**
- Modify: `app/components/Vitals/VitalsMetricBlock.tsx`
- Modify: `app/screens/VitalsScreen.tsx`
- Modify: `app/data/vitalsMockData.ts`

**Step 1: Align with design tone**

- Adjust text to match the design doc:
  - Use “your usual” instead of “baseline.”
  - Keep language non-clinical and gentle (patterns and ideas, not diagnoses).
- Ensure `headlineDelta` strings feel natural and aligned with the metric.

**Step 2: Style tweaks**

- Add padding, card-like backgrounds, and subtle dividers between metric blocks.
- Ensure colors for actual vs baseline meet accessibility contrast.
- Make grocery chips visually distinct (e.g. pill shape, background color).

**Step 3: Empty state and loading**

- Improve empty state copy before sync (“Tap Sync to see how your recent vitals compare to your usual and get simple ideas for what to eat.”).
- Optional: show a short loading shimmer or spinner while “syncing”.

**Step 4: Run app**

- Do an end-to-end visual pass:
  - Initial empty state.
  - Tap sync, brief loading, then full list of metric blocks.
  - Scroll through and ensure everything feels cohesive.

**Step 5: Commit**

```bash
git add app/components/Vitals/VitalsMetricBlock.tsx app/screens/VitalsScreen.tsx app/data/vitalsMockData.ts
git commit -m "chore(vitals): polish copy and layout for Vitals & Lifestyle tab"
```

---

## Task 7: Optional – Persist last sync in local storage

**Files:**
- Modify: `app/screens/VitalsScreen.tsx`
- Create (if not existing): `app/utils/storage.ts` for AsyncStorage helpers

**Step 1: Store last-sync state**

- When the user syncs, store:
  - `lastVitalsSyncAt` timestamp.
  - Optionally a flag like `hasSeenVitalsMockData`.
- Use React Native AsyncStorage (or existing storage util).

**Step 2: Restore on mount**

- On `VitalsScreen` mount:
  - Read `lastVitalsSyncAt`.
  - If present, you can:
    - Auto-load `vitalsMockData` and show a small “Last synced: X days ago (sample data)” label, or
    - Only show the timestamp without auto-loading metrics (depending on product choice).

**Step 3: Run app**

- Kill and restart app (or reload) and verify:
  - Last sync info appears.
  - Behavior matches your chosen approach (auto-load or just show timestamp).

**Step 4: Commit**

```bash
git add app/screens/VitalsScreen.tsx app/utils/storage.ts
git commit -m "feat(vitals): persist last sync timestamp for Vitals & Lifestyle tab"
```

---

## Execution handoff

Plan complete and saved to `docs/plans/2025-03-11-vitals-lifestyle-implementation-plan.md`.

**Two execution options:**

1. **Subagent-driven (this session)** — I dispatch a fresh subagent per task (or per group of tasks), review between tasks, and iterate quickly in this workspace.
2. **Parallel session (separate)** — You open a new session in the repo/worktree and use **superpowers:executing-plans** to implement the plan task-by-task with checkpoints.

Tell me which approach you prefer when you’re ready to build.

