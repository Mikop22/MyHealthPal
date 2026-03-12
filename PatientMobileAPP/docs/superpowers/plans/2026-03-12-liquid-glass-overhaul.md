# Liquid Glass Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount a single animated teal/lavender/gold `GlassCanvas` at the app root so the entire mobile app floats on a living glass surface — replacing flat white backgrounds, static green blobs, and an opaque tab bar.

**Architecture:** A `GlassCanvas` component is mounted once in `app/_layout.tsx` as an absolute full-screen layer behind all navigation. All screens become transparent, the tab bar gets a `BlurView` background, and `UniversalLiquidCard` gets stronger specular/glow properties.

**Tech Stack:** React Native 0.83, Expo Router 55, Reanimated 4, expo-blur, expo-linear-gradient, NativeWind

**Spec:** `docs/superpowers/specs/2026-03-12-liquid-glass-overhaul-design.md`

---

## Chunk 1: Foundation — Colors, GlassCanvas, Root Layout

### Task 1: Update `Colors.ts` with canvas palette

**Files:**
- Modify: `mobile-app/constants/Colors.ts`

- [ ] **Step 1: Add canvas and gradient tokens**

Open `mobile-app/constants/Colors.ts` and add these two new top-level entries inside the `Colors` object, after the `tabBar` block:

```ts
  canvas: {
    baseStart: "#EEF2FF",   // icy lavender-white
    baseEnd:   "#F0FAFA",   // cool mint-white
    teal:      "rgba(0, 200, 180, 0.40)",
    lavender:  "rgba(130, 80, 220, 0.28)",
    gold:      "rgba(255, 180, 60, 0.22)",
  },

  gradient: {
    titleStart: "#00C8B4",
    titleEnd:   "#8050DC",
  },
```

- [ ] **Step 2: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add mobile-app/constants/Colors.ts
git commit -m "feat(design): add canvas and gradient tokens to Colors"
```

> **Note on token shape:** `baseStart`/`baseEnd` are separate scalars (rather than an array) because `GlassCanvas` passes them directly to `expo-linear-gradient`'s `colors` prop as `[Colors.canvas.baseStart, Colors.canvas.baseEnd]`. This is more explicit than an array token at the call site.

---

### Task 2: Create `GlassCanvas` component

**Files:**
- Create: `mobile-app/components/GlassCanvas.tsx`

This component renders:
1. A `LinearGradient` base covering the whole screen
2. Three `Animated.View` circle blobs that drift using Reanimated `withRepeat`

- [ ] **Step 1: Create the file**

```tsx
// mobile-app/components/GlassCanvas.tsx
import { useEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Colors } from "../constants/Colors";

const EASE = Easing.inOut(Easing.sine);

export function GlassCanvas() {
  const { width, height } = useWindowDimensions();

  // ── Blob 1: Teal, 520×520, 26s, top-right drift ──
  const b1x = useSharedValue(width * 0.35);
  const b1y = useSharedValue(-height * 0.1);

  // ── Blob 2: Lavender, 420×420, 20s, center-left ellipse ──
  const b2x = useSharedValue(-width * 0.15);
  const b2y = useSharedValue(height * 0.25);

  // ── Blob 3: Gold, 320×320, 16s, bottom orbit ──
  const b3x = useSharedValue(width * 0.2);
  const b3y = useSharedValue(height * 0.6);

  useEffect(() => {
    const dur = (ms: number) => ({ duration: ms, easing: EASE });

    // reverse: true makes Reanimated auto-reverse the sequence — no position snap between cycles
    b1x.value = withRepeat(
      withSequence(withTiming(width * 0.55, dur(13000)), withTiming(width * 0.35, dur(13000))),
      -1, true,
    );
    b1y.value = withRepeat(
      withSequence(withTiming(height * 0.05, dur(13000)), withTiming(-height * 0.1, dur(13000))),
      -1, true,
    );

    b2x.value = withRepeat(
      withSequence(withTiming(width * 0.1, dur(10000)), withTiming(-width * 0.15, dur(10000))),
      -1, true,
    );
    b2y.value = withRepeat(
      withSequence(withTiming(height * 0.45, dur(10000)), withTiming(height * 0.25, dur(10000))),
      -1, true,
    );

    b3x.value = withRepeat(
      withSequence(withTiming(width * 0.5, dur(8000)), withTiming(width * 0.2, dur(8000))),
      -1, true,
    );
    b3y.value = withRepeat(
      withSequence(withTiming(height * 0.72, dur(8000)), withTiming(height * 0.6, dur(8000))),
      -1, true,
    );
  }, [width, height]);

  const b1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: b1x.value }, { translateY: b1y.value }],
  }));
  const b2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: b2x.value }, { translateY: b2y.value }],
  }));
  const b3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: b3x.value }, { translateY: b3y.value }],
  }));

  // Web uses CSS filter:blur; native uses large borderRadius + opacity
  const blurStyle = Platform.OS === "web"
    ? (blurPx: number): Record<string, unknown> => ({
        // @ts-expect-error web-only
        filter: `blur(${blurPx}px)`,
      })
    : () => ({});

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[Colors.canvas.baseStart, Colors.canvas.baseEnd]}
        style={StyleSheet.absoluteFill}
      />

      {/* Teal blob */}
      <Animated.View
        style={[
          styles.blob,
          { width: 520, height: 520, borderRadius: 260, backgroundColor: Colors.canvas.teal },
          blurStyle(130),
          b1Style,
        ]}
      />

      {/* Lavender blob */}
      <Animated.View
        style={[
          styles.blob,
          { width: 420, height: 420, borderRadius: 210, backgroundColor: Colors.canvas.lavender },
          blurStyle(110),
          b2Style,
        ]}
      />

      {/* Gold blob */}
      <Animated.View
        style={[
          styles.blob,
          { width: 320, height: 320, borderRadius: 160, backgroundColor: Colors.canvas.gold },
          blurStyle(90),
          b3Style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
```

- [ ] **Step 2: Verify the file compiles (no TypeScript errors)**

```bash
cd mobile-app && npx tsc --noEmit 2>&1 | grep GlassCanvas
```
Expected: no output (no errors for this file).

- [ ] **Step 3: Commit**

```bash
git add mobile-app/components/GlassCanvas.tsx
git commit -m "feat(design): add GlassCanvas animated blob background component"
```

---

### Task 3: Update root `_layout.tsx` to mount GlassCanvas

**Files:**
- Modify: `mobile-app/app/_layout.tsx`

Current file has `<View className="flex-1 bg-white">` as the root and `contentStyle: { backgroundColor: Colors.white }` on screens. Both need to change.

- [ ] **Step 1: Import GlassCanvas**

In `mobile-app/app/_layout.tsx`, add the import after the existing imports:

```ts
import { GlassCanvas } from "../components/GlassCanvas";
```

- [ ] **Step 2: Replace the root View and contentStyle**

Replace the entire return statement:

```tsx
// BEFORE
return (
  <View className="flex-1 bg-white">
    <StatusBar style="dark" />
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor:
            Platform.OS === "web"
              ? "rgba(255, 255, 255, 0.85)"
              : Colors.white,
        },
        headerTintColor: Colors.primary,
        headerTitleStyle: {
          fontWeight: "700",
          color: Colors.primary,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.white },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  </View>
);
```

```tsx
// AFTER
return (
  <View style={{ flex: 1 }}>
    <GlassCanvas />
    <StatusBar style="dark" />
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor:
            Platform.OS === "web"
              ? "rgba(255, 255, 255, 0.08)"
              : "transparent",
        },
        headerTintColor: Colors.primary,
        headerTitleStyle: {
          fontWeight: "700",
          color: Colors.primary,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "transparent" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  </View>
);
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd mobile-app && npx tsc --noEmit 2>&1 | grep "_layout"
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add mobile-app/app/_layout.tsx
git commit -m "feat(design): mount GlassCanvas at root, remove white backgrounds from Stack"
```

---

## Chunk 2: Tab Bar & UniversalLiquidCard

### Task 4: Glassy tab bar with BlurView background

**Files:**
- Modify: `mobile-app/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add BlurView import**

Add to the imports at the top of `mobile-app/app/(tabs)/_layout.tsx`:

```ts
import { BlurView } from "expo-blur";
```

- [ ] **Step 2: Replace tabBarStyle, add tabBarBackground, and update headerStyle**

In the `screenOptions` object, make the following replacements:

**2a. Replace `tabBarStyle`** (keep `tabBarLabelStyle` where it is — it stays after `tabBarStyle`):

```tsx
// BEFORE
tabBarStyle: {
  backgroundColor: Colors.tabBar.background,
  borderTopColor: Colors.tabBar.border,
  borderTopWidth: 1,
  ...(Platform.OS === "web"
    ? ({
        backdropFilter: "blur(20px) saturate(150%)",
        WebkitBackdropFilter: "blur(20px) saturate(150%)",
      } as Record<string, string>)
    : {}),
  height: Platform.OS === "web" ? 64 : undefined,
  paddingBottom: Platform.OS === "web" ? 8 : undefined,
},
```

```tsx
// AFTER
tabBarStyle: {
  backgroundColor: Platform.OS === "web" ? "rgba(255,255,255,0.08)" : "transparent",
  borderTopColor: "rgba(255,255,255,0.30)",
  borderTopWidth: 1,
  ...(Platform.OS === "web"
    ? ({
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
      } as Record<string, string>)
    : {}),
  height: Platform.OS === "web" ? 64 : undefined,
  paddingBottom: Platform.OS === "web" ? 8 : undefined,
},
```

**2b. Add `tabBarBackground` immediately after `tabBarLabelStyle`:**

```tsx
tabBarBackground: () =>
  Platform.OS !== "web" ? (
    <BlurView
      intensity={60}
      tint="light"
      style={{ position: "absolute", inset: 0 } as never}
    />
  ) : (null as unknown as React.ReactElement),
```

> The `as unknown as React.ReactElement` cast prevents a TypeScript error since React Navigation's `tabBarBackground` type expects a ReactElement, not null.

**2c. Update `headerStyle` backgroundColor (currently opaque white):**

```tsx
// BEFORE
headerStyle: {
  backgroundColor:
    Platform.OS === "web"
      ? "rgba(255, 255, 255, 0.88)"
      : Colors.white,
},
```

```tsx
// AFTER
headerStyle: {
  backgroundColor:
    Platform.OS === "web"
      ? "rgba(255, 255, 255, 0.08)"
      : "transparent",
},
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd mobile-app && npx tsc --noEmit 2>&1 | grep "tabs"
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "mobile-app/app/(tabs)/_layout.tsx"
git commit -m "feat(design): transparent glassy tab bar with BlurView background"
```

---

### Task 5: Enhance `UniversalLiquidCard`

**Files:**
- Modify: `mobile-app/components/UniversalLiquidCard.tsx`

Changes: stronger backdrop blur/saturation, sharper specular highlight, richer dual-tint shadow, stronger inner glow.

- [ ] **Step 1: Update `WEB_SHADOW` constants**

Replace the `WEB_SHADOW` object:

```ts
// BEFORE
const WEB_SHADOW: Record<GlassVariant, string> = {
  default:
    "0 8px 32px rgba(22,101,52,0.12), inset 0 1px 0 rgba(255,255,255,0.35)",
  elevated:
    "0 12px 40px rgba(22,101,52,0.18), inset 0 1px 0 rgba(255,255,255,0.45)",
  active:
    "0 4px 20px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.3)",
  subtle:
    "0 4px 16px rgba(22,101,52,0.06), inset 0 1px 0 rgba(255,255,255,0.15)",
};
```

```ts
// AFTER
const WEB_SHADOW: Record<GlassVariant, string> = {
  default:
    "0 8px 32px rgba(0,160,150,0.10), 0 2px 8px rgba(120,80,200,0.08), inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.04)",
  elevated:
    "0 12px 40px rgba(0,160,150,0.15), 0 4px 12px rgba(120,80,200,0.12), inset 0 1.5px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.04)",
  active:
    "0 4px 20px rgba(34,197,94,0.25), 0 2px 8px rgba(0,160,150,0.10), inset 0 1.5px 0 rgba(255,255,255,0.50), inset 0 -1px 0 rgba(0,0,0,0.04)",
  subtle:
    "0 4px 16px rgba(0,160,150,0.06), inset 0 1px 0 rgba(255,255,255,0.30)",
};
```

- [ ] **Step 2: Update web backdrop blur and inner glow**

In the web branch, change:
```ts
// BEFORE
backdropFilter: "blur(24px) saturate(140%)",
WebkitBackdropFilter: "blur(24px) saturate(140%)",
```
```ts
// AFTER
backdropFilter: "blur(32px) saturate(180%)",
WebkitBackdropFilter: "blur(32px) saturate(180%)",
```

And update the inner glow div's background:
```ts
// BEFORE
background:
  "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.18) 0%, transparent 55%)",
```
```ts
// AFTER
background:
  "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 60%)",
```

- [ ] **Step 3: Update native BlurView intensity and inner glow**

In the native branch, change `BlurView` intensity from `60` to `80`:
```tsx
// BEFORE
<BlurView intensity={60} tint="light" style={[StyleSheet.absoluteFill, { borderRadius }]} />
```
```tsx
// AFTER
<BlurView intensity={80} tint="light" style={[StyleSheet.absoluteFill, { borderRadius }]} />
```

Update `nativeStyles.innerGlow`:
```ts
// BEFORE
innerGlow: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255, 255, 255, 0.08)",
},
```
```ts
// AFTER
innerGlow: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: "40%",  // glow concentrates at top 60% of card
  backgroundColor: "rgba(255, 255, 255, 0.14)",
},
```

- [ ] **Step 4: Update `VARIANT_FILL` with new tinted fills**

Replace the `VARIANT_FILL` object:

```ts
// BEFORE
const VARIANT_FILL: Record<GlassVariant, ViewStyle> = {
  default: {
    backgroundColor: Colors.glass.fill12,
    borderColor: Colors.glass.border,
    borderWidth: 1,
  },
  elevated: {
    backgroundColor: Colors.glass.fill20,
    borderColor: Colors.glass.borderStrong,
    borderWidth: 1,
  },
  active: {
    backgroundColor: Colors.glass.green20,
    borderColor: Colors.forest[400],
    borderWidth: 1.5,
  },
  subtle: {
    backgroundColor: Colors.glass.fill,
    borderColor: "transparent",
    borderWidth: 0,
  },
};
```

```ts
// AFTER
const VARIANT_FILL: Record<GlassVariant, ViewStyle> = {
  default: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderColor: "rgba(255, 255, 255, 0.28)",
    borderWidth: 1,
  },
  elevated: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.40)",
    borderWidth: 1,
  },
  active: {
    backgroundColor: "rgba(220, 252, 231, 0.20)",
    borderColor: Colors.forest[400],
    borderWidth: 1.5,
  },
  subtle: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "transparent",
    borderWidth: 0,
  },
};
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd mobile-app && npx tsc --noEmit 2>&1 | grep "UniversalLiquidCard"
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add mobile-app/components/UniversalLiquidCard.tsx
git commit -m "feat(design): enhance UniversalLiquidCard specular highlights and inner glow"
```

---

## Chunk 3: Screen Cleanups

All seven screens need two changes:
1. Remove `backgroundColor: Colors.white` (or `bg-white`) from container styles
2. Remove static blob `View` elements — `GlassCanvas` replaces them all

### Task 6: Clean up Splash screen (`app/index.tsx`)

**Files:**
- Modify: `mobile-app/app/index.tsx`

- [ ] **Step 1: Remove `bg-white` and blob Views**

Replace the return statement's root View:
```tsx
// BEFORE
<View className="flex-1 bg-white items-center justify-center">
  {/* Background mesh blobs */}
  <View className="absolute w-[500px] h-[500px] rounded-full bg-forest-100 opacity-30 blur-3xl -top-40 -right-20" />
  <View className="absolute w-[400px] h-[400px] rounded-full bg-forest-200 opacity-20 blur-3xl bottom-0 -left-32" />
```

```tsx
// AFTER
<View className="flex-1 items-center justify-center">
```

- [ ] **Step 2: Commit**

```bash
git add mobile-app/app/index.tsx
git commit -m "feat(design): remove white bg and static blobs from splash screen"
```

---

### Task 7: Clean up Onboarding screen (`app/onboarding.tsx`)

**Files:**
- Modify: `mobile-app/app/onboarding.tsx`

- [ ] **Step 1: Remove `bg-white` and blob Views**

Replace the root View className:
```tsx
// BEFORE
<View className="flex-1 bg-white">
  {/* Background mesh */}
  <View className="absolute w-[450px] h-[450px] rounded-full bg-forest-100 opacity-30 blur-3xl -top-32 -right-16" />
  <View className="absolute w-[350px] h-[350px] rounded-full bg-forest-200 opacity-20 blur-3xl bottom-20 -left-20" />
```

```tsx
// AFTER
<View className="flex-1">
```

- [ ] **Step 2: Commit**

```bash
git add mobile-app/app/onboarding.tsx
git commit -m "feat(design): remove white bg and static blobs from onboarding screen"
```

---

### Task 8: Clean up Scanner screen (`app/(tabs)/scanner.tsx`)

**Files:**
- Modify: `mobile-app/app/(tabs)/scanner.tsx`

The scanner screen has `backgroundColor: "#000"` in its container style (appropriate — camera feed is black). Leave this unchanged; the GlassCanvas is behind the black camera view. **No changes needed to scanner.tsx.**

- [ ] **Step 1: Verify scanner container style is intentionally black**

Read `scanner.tsx` lines 246–249:
```ts
container: {
  flex: 1,
  backgroundColor: "#000",
},
```
This is correct — the camera feed should stay black. Skip.

- [ ] **Step 2: Commit note**

No commit needed for this file.

---

### Task 9: Clean up Triage screen (`app/(tabs)/triage.tsx`)

**Files:**
- Modify: `mobile-app/app/(tabs)/triage.tsx`

- [ ] **Step 1: Remove static blobs from styles**

In `StyleSheet.create`, remove the `blob1` and `blob2` entries:
```ts
// REMOVE these two entries:
blob1: {
  position: "absolute",
  width: 380,
  height: 380,
  borderRadius: 190,
  backgroundColor: Colors.forest[100],
  opacity: 0.35,
  top: -80,
  right: -60,
},
blob2: {
  position: "absolute",
  width: 280,
  height: 280,
  borderRadius: 140,
  backgroundColor: Colors.forest[200],
  opacity: 0.2,
  bottom: 120,
  left: -50,
},
```

- [ ] **Step 2: Remove blob View elements from JSX**

Remove these two lines from the JSX inside the `ScrollView`:
```tsx
{/* Background blobs */}
<View style={styles.blob1} />
<View style={styles.blob2} />
```

- [ ] **Step 3: Update container backgroundColor**

```ts
// BEFORE
container: { flex: 1, backgroundColor: Colors.white },
```
```ts
// AFTER
container: { flex: 1, backgroundColor: "transparent" },
```

- [ ] **Step 4: Commit**

```bash
git add "mobile-app/app/(tabs)/triage.tsx"
git commit -m "feat(design): remove white bg and static blobs from triage screen"
```

---

### Task 10: Clean up Vitals screen (`app/(tabs)/vitals.tsx`)

**Files:**
- Modify: `mobile-app/app/(tabs)/vitals.tsx`

- [ ] **Step 1: Remove static blobs from styles**

In `StyleSheet.create`, remove `blob1` and `blob2`:
```ts
// REMOVE:
blob1: {
  position: "absolute",
  width: 380,
  height: 380,
  borderRadius: 190,
  backgroundColor: Colors.forest[50],
  opacity: 0.45,
  top: -100,
  left: -40,
},
blob2: {
  position: "absolute",
  width: 260,
  height: 260,
  borderRadius: 130,
  backgroundColor: Colors.forest[200],
  opacity: 0.2,
  bottom: 80,
  right: -60,
},
```

- [ ] **Step 2: Remove blob View elements from JSX**

Remove from inside the `ScrollView`:
```tsx
{/* Background blobs */}
<View style={styles.blob1} />
<View style={styles.blob2} />
```

- [ ] **Step 3: Update container backgroundColor**

```ts
// BEFORE
container: { flex: 1, backgroundColor: Colors.white },
```
```ts
// AFTER
container: { flex: 1, backgroundColor: "transparent" },
```

- [ ] **Step 4: Commit**

```bash
git add "mobile-app/app/(tabs)/vitals.tsx"
git commit -m "feat(design): remove white bg and static blobs from vitals screen"
```

---

### Task 11: Clean up Funding screen (`app/(tabs)/funding.tsx`)

**Files:**
- Modify: `mobile-app/app/(tabs)/funding.tsx`

- [ ] **Step 1: Remove static blobs from styles**

In `StyleSheet.create`, remove `blob1` and `blob2`:
```ts
// REMOVE:
blob1: {
  position: "absolute",
  width: 340,
  height: 340,
  borderRadius: 170,
  backgroundColor: Colors.forest[100],
  opacity: 0.3,
  top: -60,
  right: -40,
},
blob2: {
  position: "absolute",
  width: 240,
  height: 240,
  borderRadius: 120,
  backgroundColor: Colors.forest[200],
  opacity: 0.2,
  bottom: 100,
  left: -50,
},
```

- [ ] **Step 2: Remove blob View elements from JSX**

Remove these two lines inside the `ScrollView`:
```tsx
<View style={styles.blob1} />
<View style={styles.blob2} />
```

- [ ] **Step 3: Update container backgroundColor**

```ts
// BEFORE
container: { flex: 1, backgroundColor: Colors.white },
```
```ts
// AFTER
container: { flex: 1, backgroundColor: "transparent" },
```

- [ ] **Step 4: Commit**

```bash
git add "mobile-app/app/(tabs)/funding.tsx"
git commit -m "feat(design): remove white bg and static blobs from funding screen"
```

---

### Task 12: Clean up Community screen (`app/(tabs)/community.tsx`)

**Files:**
- Modify: `mobile-app/app/(tabs)/community.tsx`

- [ ] **Step 1: Remove static blob from styles**

In `StyleSheet.create`, remove the `blob` entry:
```ts
// REMOVE:
blob: {
  position: "absolute",
  width: 320,
  height: 320,
  borderRadius: 160,
  backgroundColor: Colors.forest[100],
  opacity: 0.25,
  top: -40,
  left: -40,
},
```

- [ ] **Step 2: Remove blob View from JSX**

Remove from inside the screen root `View`:
```tsx
<View style={styles.blob} />
```

- [ ] **Step 3: Update container backgroundColor**

```ts
// BEFORE
container: { flex: 1, backgroundColor: Colors.white },
```
```ts
// AFTER
container: { flex: 1, backgroundColor: "transparent" },
```

- [ ] **Step 4: Update `statBox` to glass-style background**

The Community screen's stats row uses `backgroundColor: Colors.forest[50]` (opaque) which will look flat against the glass canvas. Update it:

```ts
// BEFORE
statBox: {
  flex: 1,
  backgroundColor: Colors.forest[50],
  borderRadius: 16,
  padding: 14,
  alignItems: "center",
},
```

```ts
// AFTER
statBox: {
  flex: 1,
  backgroundColor: "rgba(255, 255, 255, 0.14)",
  borderRadius: 16,
  padding: 14,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.25)",
},
```

- [ ] **Step 5: Commit**

```bash
git add "mobile-app/app/(tabs)/community.tsx"
git commit -m "feat(design): remove white bg, static blob, and glass-ify stat boxes in community screen"
```

---

## Chunk 4: Verification

### Task 13: Run the app and verify visual output

- [ ] **Step 1: Start the Expo dev server**

```bash
cd mobile-app && npx expo start --web
```

Open `http://localhost:8081` in a browser.

- [ ] **Step 2: Check splash screen**

Expected: Animated teal/lavender/gold blobs visible drifting behind the breathing logo. No white background. Blobs should be visible and softly blurred.

- [ ] **Step 3: Check onboarding**

Expected: Glass cards float transparently over the animated canvas. The question card and options card show the refraction of the coloured blobs behind them.

- [ ] **Step 4: Check each tab**

Navigate to Scanner → Triage → Vitals → Funding → Community.

Expected per tab:
- **Scanner**: Black camera view (blobs hidden — correct)
- **Triage**: Glass cards over animated canvas, no white bg
- **Vitals**: Chart cards over canvas, pills with glass tint
- **Funding**: Campaign and donor cards over canvas
- **Community**: Flash list over canvas, cards show blur effect

- [ ] **Step 5: Check tab bar**

Expected: Tab bar is frosted/blurred glass, not solid white. The teal/lavender blobs should be visible through the tab bar.

- [ ] **Step 6: Verify blobs animate continuously across tab switches**

Switch between tabs rapidly. The blobs should continue drifting without resetting position — confirming the root-level canvas is working.

- [ ] **Step 7: Final commit (if any unstaged changes remain)**

```bash
git status
# Stage only mobile-app files that were intentionally modified
git add mobile-app/constants/Colors.ts \
        mobile-app/components/GlassCanvas.tsx \
        mobile-app/components/UniversalLiquidCard.tsx \
        mobile-app/app/_layout.tsx \
        "mobile-app/app/(tabs)/_layout.tsx" \
        mobile-app/app/index.tsx \
        mobile-app/app/onboarding.tsx \
        "mobile-app/app/(tabs)/triage.tsx" \
        "mobile-app/app/(tabs)/vitals.tsx" \
        "mobile-app/app/(tabs)/funding.tsx" \
        "mobile-app/app/(tabs)/community.tsx"
git commit -m "feat(design): complete liquid glass overhaul — animated canvas, enhanced cards, glassy tab bar"
```

---

## Troubleshooting

**Blobs not visible on native (no blur):**
Native doesn't support CSS `filter: blur()`. The blobs will appear as soft circles without blur. This is acceptable on native — the `BlurView` on cards provides the glass effect. For native blur on blobs, you would need a third-party library like `@react-native-community/blur` which adds significant bundle size.

**Tab bar appears fully transparent (no blur on native):**
Ensure `expo-blur` is installed: `npx expo install expo-blur`. The `BlurView` component from expo-blur handles native blur.

**TypeScript error on `tabBarBackground`:**
If `tabBarBackground` shows a type error, cast the return type: `tabBarBackground: () => Platform.OS !== "web" ? (<BlurView ... />) as any : null`

**White flash on screen transitions:**
If a white flash appears during navigation, check that `contentStyle: { backgroundColor: 'transparent' }` is set in `_layout.tsx` Stack screenOptions.

**`GlassCanvas` blobs jump on window resize (web):**
The `useWindowDimensions()` hook triggers a re-render on resize which resets blob positions. This is acceptable. For production, blob positions could be stored in refs, but this is YAGNI for now.
