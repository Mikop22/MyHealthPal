# Crowdfunding Support Tab (Mock) — Implementation Plan

> **For Claude:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a single "Support" tab to MyHealthPal that lists medical crowdfunding campaigns and lets users view a campaign and submit a contribution. All data is in-app mock matching the backend shapes in `2025-03-10-crowdfunding-design.md`; no backend calls.

**Architecture:** New tab "Support" → list screen (campaigns from mock) → detail screen (campaign + contributions). Contribution form appends to in-memory/AsyncStorage state and refreshes progress. Types and payload shapes align with the design doc (§3) so swapping to the real API later is a data-layer change only.

**Tech Stack:** React Native, TypeScript (or JS), React Navigation (tabs + stack for list/detail).

---

## Task 1: Mock data module (backend shapes)

**Files:** Create `app/data/crowdfundingMockData.ts` (or `.js`).

**Steps:**
1. Define types matching the design: `Campaign` (id, owner_identifier, title, description, goal_amount, status, deadline, created_at), `Contribution` (id, campaign_id, contributor_identifier, amount, message, created_at). For list/detail, campaign can include computed `total_raised`.
2. Export a seed: `campaigns: Campaign[]` (2–3 items, status `active`, with ids) and `contributions: Contribution[]` (a few contributions for at least one campaign).
3. Export a getter that returns campaigns with `total_raised` computed from contributions (same logic as GET /campaigns/{id}).

**Commit:** `feat(support): add crowdfunding mock data matching backend shapes`

---

## Task 2: Support tab and campaign list screen

**Files:** Create `app/screens/SupportScreen.tsx` (list). Modify tab navigator.

**Steps:**
1. Add "Support" tab (label and icon) to the app’s tab navigator; route to `SupportScreen`.
2. SupportScreen: load campaigns from the mock getter. Render a list (FlatList or ScrollView) of campaign cards: title, short description (truncated), goal_amount, total_raised, and a simple progress bar (total_raised / goal_amount). Tapping a card navigates to campaign detail (pass campaign id).

**Commit:** `feat(support): add Support tab and campaign list from mock`

---

## Task 3: Campaign detail and contributions list

**Files:** Create `app/screens/CampaignDetailScreen.tsx`. Add stack or modal navigation for list → detail.

**Steps:**
1. CampaignDetailScreen accepts campaign id (route param). Resolve campaign from mock (by id); show full title, description, goal_amount, total_raised, progress bar.
2. Below, list contributions for that campaign (from mock contributions filtered by campaign_id). Show contributor_identifier (or "Anonymous"), amount, message, created_at.
3. Add a "Contribute" button that navigates to a contribution form (or opens a bottom sheet).

**Commit:** `feat(support): campaign detail and contributions list from mock`

---

## Task 4: Contribute form and in-app update

**Files:** Create `app/components/Support/ContributeForm.tsx` (or inline in a screen). Optionally `app/utils/crowdfundingMockStore.ts` for mutable state.

**Steps:**
1. Form fields: contributor_identifier (or "Your name"), amount (number), message (optional). Submit button.
2. On submit: create a new contribution object (generate id and created_at), append to in-memory store (e.g. a module-level array or React state lifted to a small store) or to AsyncStorage-backed list keyed by campaign_id. Recompute total_raised for that campaign.
3. After append: go back to campaign detail (or refresh) so the new contribution and updated progress are visible. No API call.

**Commit:** `feat(support): contribute form updates mock state and refreshes detail`

---

## Task 5: Wire list to mutable data

**Files:** Modify `app/screens/SupportScreen.tsx` and `app/screens/CampaignDetailScreen.tsx` (and mock store if used).

**Steps:**
1. Ensure the campaign list and detail read from the same source (getter that uses seed + any in-memory/AsyncStorage contributions). List shows updated total_raised after a contribution from detail.
2. Optional: persist contributions to AsyncStorage so they survive app restart; on load, merge seed campaigns with stored contributions and recompute total_raised.

**Commit:** `feat(support): campaign list and detail use single mock source; optional persistence`

---

## Execution

Plan saved to `docs/plans/2025-03-11-crowdfunding-support-tab-mock-implementation-plan.md`. Execute task-by-task (subagent or separate session with executing-plans).
