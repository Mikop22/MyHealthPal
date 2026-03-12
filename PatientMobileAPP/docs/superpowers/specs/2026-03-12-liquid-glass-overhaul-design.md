# Liquid Glass Overhaul — Design Spec
**Date:** 2026-03-12
**Scope:** Mobile app (React Native / Expo Router)
**Status:** Approved

---

## Problem

Every screen uses `bg-white` as its base background. The glass cards exist but without a rich, colorful, animated canvas behind them they look flat and opaque. The background blobs are static, monochromatic (forest greens only), and invisible against white. The tab bar is solid white. The liquid glass aesthetic requires something vibrant to refract.

---

## Goal

Make the mobile app feel genuinely liquid glass: a single animated teal/lavender/gold canvas drifting behind the entire app, transparent screens that float above it, and enhanced glass cards with sharp specular edges and deep inner glow.

---

## Architecture

A `GlassCanvas` component is mounted once at the root `_layout.tsx` level, `position: absolute, inset: 0, zIndex: 0`. All screens and the tab navigator sit above it with transparent backgrounds. The canvas animates continuously — it does not reset on tab switch or screen transition, so blobs drift visibly through navigation changes.

```
_layout.tsx (Stack.Navigator)
├── <GlassCanvas />          ← absolute, full screen, z-index 0
└── Stack.Screen(s)          ← transparent backgrounds
    └── Tab navigator        ← transparent, BlurView tab bar
        └── Screen content   ← transparent, glass cards float on canvas
```

---

## Component: GlassCanvas

**File:** `mobile-app/components/GlassCanvas.tsx`

### Base Canvas
- `expo-linear-gradient` from `#EEF2FF` (icy lavender-white) → `#F0FAFA` (cool mint-white)
- Fills the entire screen behind all content

### Animated Blobs

Three blobs using Reanimated `withRepeat(withSequence([withTiming(posA), withTiming(posB)]), -1, true)`:

| Blob | Color | Size | Blur | Cycle | Zone |
|------|-------|------|------|-------|------|
| Teal | `rgba(0, 200, 180, 0.40)` | 520×520 | 130px | 26s | Top-right drift |
| Lavender | `rgba(130, 80, 220, 0.28)` | 420×420 | 110px | 20s | Center-left ellipse |
| Gold | `rgba(255, 180, 60, 0.22)` | 320×320 | 90px | 16s | Bottom small orbit |

- Web: `filter: blur(Npx)` via inline style
- Native: large `borderRadius` circles with opacity — expo-blur reserved for cards

---

## Component: UniversalLiquidCard (Enhanced)

**File:** `mobile-app/components/UniversalLiquidCard.tsx`

### Changes
- Backdrop blur: `32px`, saturate `180%`
- Fill: `rgba(255,255,255,0.10)` (default), `rgba(255,255,255,0.18)` (elevated)
- Specular top edge: `inset 0 1.5px 0 rgba(255,255,255,0.55)`
- Drop shadow: `0 8px 32px rgba(0,160,150,0.10), 0 2px 8px rgba(120,80,200,0.08)`
- Inner radial glow: `rgba(255,255,255,0.25)`, spreading to 60% height
- Depth shadow: `inset 0 -1px 0 rgba(0,0,0,0.04)`

---

## Tab Bar

**File:** `mobile-app/app/(tabs)/_layout.tsx`

- `backgroundColor: 'transparent'`
- `tabBarBackground`: `BlurView` (intensity 60, tint `light`) on native
- Web: `backdrop-filter: blur(28px) saturate(160%)`
- Top border: `rgba(255,255,255,0.30)`
- Active icon: `#22C55E` (brand green)

---

## Typography

- Screen titles: teal→lavender gradient (`#00C8B4` → `#8050DC`) via `expo-linear-gradient` + `@react-native-masked-view/masked-view`
- Body text: `#1F2937` (cool dark)
- Subtle text: `rgba(31,41,55,0.6)`

---

## Screen Changes

All screens:
- Remove `bg-white` → `bg-transparent`
- Remove per-screen static blob `View` elements (replaced by root `GlassCanvas`)
- Keep `LogoBreathing` watermarks and all content as-is

Affected screens:
- `app/index.tsx` (Splash)
- `app/onboarding.tsx`
- `app/(tabs)/scanner.tsx`
- `app/(tabs)/triage.tsx`
- `app/(tabs)/vitals.tsx`
- `app/(tabs)/funding.tsx`
- `app/(tabs)/community.tsx`

---

## Colors.ts Additions

```ts
canvas: {
  base: ['#EEF2FF', '#F0FAFA'],
  teal: 'rgba(0, 200, 180, 0.40)',
  lavender: 'rgba(130, 80, 220, 0.28)',
  gold: 'rgba(255, 180, 60, 0.22)',
},
gradient: {
  title: ['#00C8B4', '#8050DC'],
}
```

---

## Files to Create
- `mobile-app/components/GlassCanvas.tsx` (new)

## Files to Modify
- `mobile-app/components/UniversalLiquidCard.tsx`
- `mobile-app/constants/Colors.ts`
- `mobile-app/app/_layout.tsx`
- `mobile-app/app/(tabs)/_layout.tsx`
- `mobile-app/app/index.tsx`
- `mobile-app/app/onboarding.tsx`
- `mobile-app/app/(tabs)/scanner.tsx`
- `mobile-app/app/(tabs)/triage.tsx`
- `mobile-app/app/(tabs)/vitals.tsx`
- `mobile-app/app/(tabs)/funding.tsx`
- `mobile-app/app/(tabs)/community.tsx`
