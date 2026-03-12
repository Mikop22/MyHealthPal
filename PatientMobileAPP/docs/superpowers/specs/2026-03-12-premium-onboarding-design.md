# Premium Onboarding — Design Spec
**Date:** 2026-03-12
**Scope:** Mobile app — Typography, OnboardingOptionButton, CTA button
**Status:** Approved

---

## Problem

Three elements make the onboarding feel AI-generated/templated:
1. System fonts everywhere — identical to every default Expo app
2. Option buttons render as an iOS-settings list (stacked rows with dividers inside a shared card)
3. CTA button is a flat solid green rectangle with no depth or glass language

---

## Goal

Apply three targeted premium upgrades to onboarding without touching any other screens or business logic.

---

## Section 1: Typography — DM Sans

### Installation
- Package: `@expo-google-fonts/dm-sans`
- Weights to load: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold)

### Loading
- `useFonts` hook called in `app/_layout.tsx`
- While loading: `SplashScreen.preventAutoHideAsync()` keeps native splash visible (already in place)
- `SplashScreen.hideAsync()` only called after fonts are ready

### Typography Constants
New file: `mobile-app/constants/Typography.ts`

```ts
export const Fonts = {
  regular:  "DMSans_400Regular",
  medium:   "DMSans_500Medium",
  semiBold: "DMSans_600SemiBold",
  bold:     "DMSans_700Bold",
} as const;
```

### Application Scope
Applied only to key text elements — not a global override:

| Element | Weight |
|---------|--------|
| Onboarding question (`step.question`) | Bold (700) |
| Onboarding description (`step.description`) | Regular (400) |
| Option button label | SemiBold (600) |
| CTA button label ("Continue" / "Confirm") | Bold (700) |
| Section titles in tabs (triage, vitals, funding, community) | Bold (700) |
| Section subtitles | Regular (400) |

**Files modified:** `_layout.tsx`, `constants/Typography.ts` (new), `onboarding.tsx`, `components/OnboardingOptionButton.tsx`, `app/(tabs)/triage.tsx`, `app/(tabs)/vitals.tsx`, `app/(tabs)/funding.tsx`, `app/(tabs)/community.tsx`

---

## Section 2: Option Buttons — Individual Floating Glass Pills

### Layout Change
- Remove the shared `UniversalLiquidCard` wrapper that groups all options
- Each option becomes its own `UniversalLiquidCard` with `8px` gap between cards
- `isLast` prop on `OnboardingOptionButton` becomes unused — remove it

### States

**Default:** `variant="default"` — `rgba(255,255,255,0.10)` fill, `rgba(255,255,255,0.28)` border.
- Label: `#1F2937`, DM Sans SemiBold
- Radio: empty circle, `border-2 border-white/40`

**Selected:** `variant="active"` — `rgba(220,252,231,0.20)` fill, `Colors.forest[400]` border.
- Label: `Colors.primary`, DM Sans Bold
- Checkmark: Ionicons `checkmark-circle` springs in with `scale(0 → 1.15 → 1)`, `damping: 10, stiffness: 280`

**Press:** Card compresses to `scale(0.97)` via `UniversalLiquidCard pressable` prop.

### Component Changes (`OnboardingOptionButton.tsx`)
- Wrap entire button in `UniversalLiquidCard` with `pressable` prop
- Remove inner `Pressable` + `View` wrapper
- Remove `border-b` divider and `isLast` logic
- Remove `bg-white/60` and `bg-accent/10` NativeWind classes
- Replace `<Text>✓</Text>` with `<Animated.View>` + `<Ionicons name="checkmark-circle" size={22} color={Colors.accent} />` with spring scale animation
- Empty state: `<View className="w-6 h-6 rounded-full border-2 border-white/40" />`

### Onboarding Screen Changes (`onboarding.tsx`)
- Remove the `UniversalLiquidCard` wrapper around `optionsList`
- Remove `variant="elevated"` card wrapping options
- Options render directly in the card area with `gap-2` between them

---

## Section 3: CTA Button — Glass Gradient

### Structure
Replace flat `Pressable` in `onboarding.tsx` with an `Animated.View` (for press scale) wrapping a `Pressable`:

### Visual Properties
- **Base fill:** `rgba(255,255,255,0.15)`
- **Backdrop blur:** `blur(24px) saturate(160%)` on web
- **Gradient overlay:** `LinearGradient` (`#00C8B4 → #22C55E`, left→right) at `opacity: 0.45`, absolutely positioned behind text
- **Specular edge:** `inset 0 1.5px 0 rgba(255,255,255,0.50)`
- **Border:** `rgba(255,255,255,0.35)`
- **Shadow:** `0 8px 24px rgba(0,200,180,0.20)`
- **Border radius:** `30px`
- **Height:** `56px` (same as before)

### Interactions
- `onPressIn`: `scale(0.96)`, spring `{ damping: 12, stiffness: 300 }`
- `onPressOut`: spring back to `scale(1)`
- **Disabled** (no selection): gradient opacity `0.15`, text `rgba(31,41,55,0.35)`, no shadow

### Label
- Text: "Continue" / "Confirm"
- Font: DM Sans Bold (700)
- Color: `#1F2937` (dark — glass fills read better with dark text)

### Implementation
- Inline in `onboarding.tsx` (no new component — button is unique to this screen)
- Uses `expo-linear-gradient` (already installed)
- Platform-aware: on native, `backdropFilter` omitted; on web, applied via inline style

---

## Files Summary

### New Files
- `mobile-app/constants/Typography.ts`

### Modified Files
- `mobile-app/app/_layout.tsx` — add `useFonts`, defer `SplashScreen.hideAsync`
- `mobile-app/app/onboarding.tsx` — remove option card wrapper, replace CTA button
- `mobile-app/components/OnboardingOptionButton.tsx` — full redesign to glass pills
- `mobile-app/app/(tabs)/triage.tsx` — DM Sans on section titles
- `mobile-app/app/(tabs)/vitals.tsx` — DM Sans on section titles
- `mobile-app/app/(tabs)/funding.tsx` — DM Sans on section titles
- `mobile-app/app/(tabs)/community.tsx` — DM Sans on header title

### Dependencies to Install
```bash
npx expo install @expo-google-fonts/dm-sans expo-font
```
