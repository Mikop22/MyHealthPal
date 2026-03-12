# Premium Onboarding Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply DM Sans typography, individual floating glass pill option buttons, and a glass gradient CTA button to make onboarding feel crafted rather than generated.

**Architecture:** Three independent upgrades applied in sequence: (1) install font + expose constants + wire into root layout, (2) redesign `OnboardingOptionButton` into standalone glass pills and remove the shared wrapper card in `onboarding.tsx`, (3) replace the flat CTA button with a glass gradient version and apply DM Sans to tab section titles.

**Tech Stack:** React Native 0.83, Expo 55, Reanimated 4, NativeWind, expo-linear-gradient (already installed), @expo-google-fonts/dm-sans (new)

**Spec:** `docs/superpowers/specs/2026-03-12-premium-onboarding-design.md`

---

## Chunk 1: Typography Foundation

### Task 1: Install DM Sans and create Typography constants

**Files:**
- Create: `mobile-app/constants/Typography.ts`
- (Shell): install `@expo-google-fonts/dm-sans` and `expo-font`

- [ ] **Step 1: Install the font packages**

```bash
cd "/Users/user/Desktop/MyHealthPath Features/frontend/mobile-app"
npx expo install @expo-google-fonts/dm-sans expo-font
```

Expected: packages added to `package.json`, no errors.

- [ ] **Step 2: Create Typography constants file**

Create `mobile-app/constants/Typography.ts`:

```ts
/**
 * DM Sans font family constants.
 * Keys match the expo-google-fonts export names exactly.
 */
export const Fonts = {
  regular:  "DMSans_400Regular",
  medium:   "DMSans_500Medium",
  semiBold: "DMSans_600SemiBold",
  bold:     "DMSans_700Bold",
} as const;
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/user/Desktop/MyHealthPath Features/mobile-app"
npx tsc --noEmit 2>&1 | grep "Typography" | head -5
```

Expected: no output (no errors).

- [ ] **Step 4: Commit**

```bash
cd "/Users/user/Desktop/MyHealthPath Features"
git add frontend/mobile-app/constants/Typography.ts frontend/mobile-app/package.json frontend/mobile-app/package-lock.json
git commit -m "feat(typography): install DM Sans and add Typography constants"
```

---

### Task 2: Wire DM Sans into root layout — defer splash until fonts ready

**Files:**
- Modify: `mobile-app/app/_layout.tsx`

Current `_layout.tsx` calls `SplashScreen.hideAsync()` in a `useEffect` immediately on mount. It needs to wait for fonts to load first.

- [ ] **Step 1: Add font imports**

At the top of `mobile-app/app/_layout.tsx`, add after the existing imports:

```ts
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
```

- [ ] **Step 2: Replace the component body**

Replace the full `RootLayout` function with:

```tsx
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
}
```

> Note: `useEffect` now depends on `[fontsLoaded]` — splash hides only when fonts are ready.

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/user/Desktop/MyHealthPath Features/mobile-app"
npx tsc --noEmit 2>&1 | grep "_layout" | head -5
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "/Users/user/Desktop/MyHealthPath Features"
git add frontend/mobile-app/app/_layout.tsx
git commit -m "feat(typography): load DM Sans in root layout, defer splash hide until fonts ready"
```

---

## Chunk 2: Option Button Redesign

### Task 3: Rewrite OnboardingOptionButton as standalone glass pill

**Files:**
- Modify: `mobile-app/components/OnboardingOptionButton.tsx`

Full rewrite. Remove `isLast` prop, remove divider logic, remove shared-card assumptions. Each button is now a self-contained `UniversalLiquidCard`.

- [ ] **Step 1: Replace the entire file content**

```tsx
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { UniversalLiquidCard } from "./UniversalLiquidCard";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Typography";

interface OnboardingOptionButtonProps {
  label: string;
  subtitle?: string;
  selected?: boolean;
  onPress: () => void;
  // isLast removed — no longer needed
}

export function OnboardingOptionButton({
  label,
  subtitle,
  selected = false,
  onPress,
}: OnboardingOptionButtonProps) {
  const checkScale = useSharedValue(0);

  useEffect(() => {
    checkScale.value = selected
      ? withSpring(1, { damping: 10, stiffness: 280 })
      : withSpring(0, { damping: 15, stiffness: 300 });
  }, [selected]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <UniversalLiquidCard variant={selected ? "active" : "default"} pressable>
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        {/* Label */}
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: 16,
              fontFamily: selected ? Fonts.bold : Fonts.semiBold,
              color: selected ? Colors.primary : "#1F2937",
            }}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              style={{
                fontSize: 12,
                fontFamily: Fonts.regular,
                color: Colors.forest[600],
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Selection indicator */}
        <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
          {selected ? (
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
            </Animated.View>
          ) : (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.40)",
              }}
            />
          )}
        </View>
      </Pressable>
    </UniversalLiquidCard>
  );
}

export default OnboardingOptionButton;
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/user/Desktop/MyHealthPath Features/mobile-app"
npx tsc --noEmit 2>&1 | grep "OnboardingOptionButton" | head -5
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "/Users/user/Desktop/MyHealthPath Features"
git add frontend/mobile-app/components/OnboardingOptionButton.tsx
git commit -m "feat(onboarding): rewrite option button as individual glass pill with spring checkmark"
```

---

### Task 4: Update onboarding.tsx — remove wrapper card, apply DM Sans to question text

**Files:**
- Modify: `mobile-app/app/onboarding.tsx`

Two changes in this task:
1. Remove the `UniversalLiquidCard` wrapper around the options list → replace with a plain `View` with `gap: 8`
2. Apply DM Sans to the question and description text
3. Remove `isLast` from the `optionsList` map (prop no longer exists)

- [ ] **Step 1: Add Typography import**

In `mobile-app/app/onboarding.tsx`, add after the existing imports:

```ts
import { Fonts } from "../constants/Typography";
```

- [ ] **Step 2: Remove `isLast` from optionsList map**

Find this in the file (around line 258):
```tsx
const optionsList = step.options.map((opt, idx) => (
  <OnboardingOptionButton
    key={String(opt.value)}
    label={opt.label}
    subtitle={opt.subtitle}
    selected={isOptionSelected(opt.value)}
    isLast={idx === step.options.length - 1}
    onPress={() => handleSelect(opt.value)}
  />
));
```

Replace with:
```tsx
const optionsList = step.options.map((opt) => (
  <OnboardingOptionButton
    key={String(opt.value)}
    label={opt.label}
    subtitle={opt.subtitle}
    selected={isOptionSelected(opt.value)}
    onPress={() => handleSelect(opt.value)}
  />
));
```

- [ ] **Step 3: Apply DM Sans to question and description text**

Find the question card (around line 320):
```tsx
<View className="w-full justify-center items-center py-8 px-4">
  <Text className="text-2xl font-bold text-primary mb-2 text-center">
    {step.question}
  </Text>
  <Text className="text-sm text-forest-600 leading-5 text-center">
    {step.description}
  </Text>
</View>
```

Replace with:
```tsx
<View className="w-full justify-center items-center py-8 px-4">
  <Text
    className="text-2xl text-primary mb-2 text-center"
    style={{ fontFamily: Fonts.bold }}
  >
    {step.question}
  </Text>
  <Text
    className="text-sm text-forest-600 leading-5 text-center"
    style={{ fontFamily: Fonts.regular }}
  >
    {step.description}
  </Text>
</View>
```

- [ ] **Step 4: Replace the options wrapper card**

Find the bottom card (around line 335):
```tsx
{/* Bottom Card: Options List */}
<UniversalLiquidCard
  variant="elevated"
  className="w-full border border-green-200 rounded-3xl overflow-hidden p-0"
  style={{ borderColor: '#BBF7D0', marginTop: 24 }}
>
  {step.multiSelect ? (
    <ScrollView
      className="w-full"
      style={{ maxHeight: 320 }}
      showsVerticalScrollIndicator={true}
      bounces={false}
    >
      {optionsList}
    </ScrollView>
  ) : (
    optionsList
  )}
</UniversalLiquidCard>
```

Replace with:
```tsx
{/* Options List — individual glass pills */}
{step.multiSelect ? (
  <ScrollView
    style={{ marginTop: 24, maxHeight: 360 }}
    showsVerticalScrollIndicator={false}
    bounces={false}
    contentContainerStyle={{ gap: 8 }}
  >
    {optionsList}
  </ScrollView>
) : (
  <View style={{ marginTop: 24, gap: 8 }}>
    {optionsList}
  </View>
)}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd "/Users/user/Desktop/MyHealthPath Features/mobile-app"
npx tsc --noEmit 2>&1 | grep "onboarding" | head -5
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd "/Users/user/Desktop/MyHealthPath Features"
git add frontend/mobile-app/app/onboarding.tsx
git commit -m "feat(onboarding): replace option wrapper card with individual glass pills, apply DM Sans"
```

---

## Chunk 3: CTA Button + Tab Font Application

### Task 5: Replace CTA button with glass gradient version

**Files:**
- Modify: `mobile-app/app/onboarding.tsx`

- [ ] **Step 1: Add missing imports**

In `mobile-app/app/onboarding.tsx`, update the react-native import to include `Platform`:

```ts
// BEFORE
import {
  View,
  Text,
  useWindowDimensions,
  Pressable,
  ScrollView,
} from "react-native";
```

```ts
// AFTER
import {
  View,
  Text,
  useWindowDimensions,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
```

Add `LinearGradient` import:
```ts
import { LinearGradient } from "expo-linear-gradient";
```

Update Reanimated import to include animation hooks:
```ts
// BEFORE
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from "react-native-reanimated";
```

```ts
// AFTER
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
```

- [ ] **Step 2: Add pressScale shared value inside the component**

Inside `OnboardingScreen`, after the existing `useState` hooks and before the `step` constant, add:

```ts
const pressScale = useSharedValue(1);
const ctaAnimStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pressScale.value }],
}));
```

- [ ] **Step 3: Replace the CTA button JSX**

Find the action button section (around line 358):
```tsx
{/* Action button */}
<View className="w-[90%] max-w-[400px] self-center pb-10">
  <Pressable
    onPress={handleNext}
    disabled={!hasSelection}
    className={`w-full h-14 rounded-2xl items-center justify-center ${
      hasSelection ? "bg-accent" : "bg-forest-100"
    }`}
  >
    <Text
      className={`text-lg font-bold ${
        hasSelection ? "text-white" : "text-forest-300"
      }`}
    >
      {isLastStep ? "Confirm" : "Continue"}
    </Text>
  </Pressable>
</View>
```

Replace with:
```tsx
{/* Action button — glass gradient */}
<Animated.View
  style={[
    ctaAnimStyle,
    { width: "90%", maxWidth: 400, alignSelf: "center", paddingBottom: 40 },
  ]}
>
  <Pressable
    onPress={handleNext}
    disabled={!hasSelection}
    onPressIn={() => {
      if (hasSelection)
        pressScale.value = withSpring(0.96, { damping: 12, stiffness: 300 });
    }}
    onPressOut={() => {
      pressScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    }}
    style={[
      ctaStyles.btn,
      Platform.OS === "web" && (ctaStyles.btnWeb as object),
      hasSelection && Platform.OS === "web" && (ctaStyles.btnWebActive as object),
    ]}
  >
    {/* Gradient fill */}
    <LinearGradient
      colors={["#00C8B4", "#22C55E"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[StyleSheet.absoluteFill, { opacity: hasSelection ? 0.45 : 0.12 }]}
    />
    {/* Label */}
    <Text
      style={{
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: hasSelection ? "#1F2937" : "rgba(31,41,55,0.35)",
        zIndex: 1,
      }}
    >
      {isLastStep ? "Confirm" : "Continue"}
    </Text>
  </Pressable>
</Animated.View>
```

- [ ] **Step 4: Add `ctaStyles` StyleSheet at bottom of file**

At the very end of `onboarding.tsx`, after the closing brace of the component, add:

```ts
const ctaStyles = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Web-only properties applied via Platform check
  btnWeb: {
    // @ts-expect-error web-only
    backdropFilter: "blur(24px) saturate(160%)",
    WebkitBackdropFilter: "blur(24px) saturate(160%)",
  },
  btnWebActive: {
    // @ts-expect-error web-only
    boxShadow: "0 8px 24px rgba(0,200,180,0.20), inset 0 1.5px 0 rgba(255,255,255,0.50)",
  },
});
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd "/Users/user/Desktop/MyHealthPath Features/mobile-app"
npx tsc --noEmit 2>&1 | grep "onboarding" | head -5
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd "/Users/user/Desktop/MyHealthPath Features"
git add frontend/mobile-app/app/onboarding.tsx
git commit -m "feat(onboarding): replace flat CTA button with glass gradient version"
```

---

### Task 6: Apply DM Sans to tab section titles

**Files:**
- Modify: `mobile-app/app/(tabs)/triage.tsx`
- Modify: `mobile-app/app/(tabs)/vitals.tsx`
- Modify: `mobile-app/app/(tabs)/funding.tsx`
- Modify: `mobile-app/app/(tabs)/community.tsx`

Add `fontFamily: Fonts.bold` to the section title / header title styles in each tab screen's `StyleSheet.create`.

- [ ] **Step 1: Update triage.tsx**

Add import:
```ts
import { Fonts } from "../../constants/Typography";
```

In `StyleSheet.create`, find `sectionTitle`:
```ts
sectionTitle: {
  fontSize: 22,
  fontWeight: "700",
  color: Colors.primary,
  marginBottom: 4,
},
```

Add `fontFamily`:
```ts
sectionTitle: {
  fontSize: 22,
  fontWeight: "700",
  fontFamily: Fonts.bold,
  color: Colors.primary,
  marginBottom: 4,
},
```

- [ ] **Step 2: Update vitals.tsx**

Add import:
```ts
import { Fonts } from "../../constants/Typography";
```

In `StyleSheet.create`, find `chartTitle`:
```ts
chartTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: Colors.primary,
  marginBottom: 16,
},
```

Add `fontFamily`:
```ts
chartTitle: {
  fontSize: 16,
  fontWeight: "700",
  fontFamily: Fonts.bold,
  color: Colors.primary,
  marginBottom: 16,
},
```

- [ ] **Step 3: Update funding.tsx**

Add import:
```ts
import { Fonts } from "../../constants/Typography";
```

In `StyleSheet.create`, find `campaignTitle`:
```ts
campaignTitle: { fontSize: 18, fontWeight: "700", color: Colors.primary },
```

Add `fontFamily`:
```ts
campaignTitle: { fontSize: 18, fontWeight: "700", fontFamily: Fonts.bold, color: Colors.primary },
```

- [ ] **Step 4: Update community.tsx**

Add import:
```ts
import { Fonts } from "../../constants/Typography";
```

In `StyleSheet.create`, find `headerTitle`:
```ts
headerTitle: { fontSize: 24, fontWeight: "700", color: Colors.primary },
```

Add `fontFamily`:
```ts
headerTitle: { fontSize: 24, fontWeight: "700", fontFamily: Fonts.bold, color: Colors.primary },
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd "/Users/user/Desktop/MyHealthPath Features/mobile-app"
npx tsc --noEmit 2>&1 | head -10
```

Expected: only the pre-existing FlashList error in community.tsx (unrelated), no new errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/user/Desktop/MyHealthPath Features"
git add \
  "frontend/mobile-app/app/(tabs)/triage.tsx" \
  "frontend/mobile-app/app/(tabs)/vitals.tsx" \
  "frontend/mobile-app/app/(tabs)/funding.tsx" \
  "frontend/mobile-app/app/(tabs)/community.tsx"
git commit -m "feat(typography): apply DM Sans Bold to section titles across tab screens"
```

---

## Verification

After all tasks, test visually:

```bash
cd "/Users/user/Desktop/MyHealthPath Features/frontend/mobile-app"
npx expo start --web
```

Open `http://localhost:8081` and check:

1. **Fonts loaded** — text throughout the app should use DM Sans (rounder, warmer letterforms than system font)
2. **Onboarding options** — each option renders as its own floating glass pill with space between items; selecting one shows a spring-in checkmark and green tint
3. **CTA button** — teal→green gradient tint visible through the glass; dark text; scales on press; faded when no selection
4. **Tab titles** — "Voice Triage", chart titles, campaign titles use DM Sans Bold

## Troubleshooting

**Fonts not applying:**
- Ensure `useFonts` is called in `_layout.tsx` and returns `true` before rendering
- On web, fonts load via CSS `@font-face` injected by expo-google-fonts — may require hard refresh

**`gap` not working in ScrollView contentContainerStyle:**
- `gap` is supported in React Native 0.71+ via Yoga. The project uses RN 0.83 — this should work. If not, replace with `marginBottom: 8` on each `OnboardingOptionButton` wrapper.

**CTA button gradient invisible on native:**
- Ensure `LinearGradient` from `expo-linear-gradient` is used (not `react-native-linear-gradient`). expo-linear-gradient is already in the project.
