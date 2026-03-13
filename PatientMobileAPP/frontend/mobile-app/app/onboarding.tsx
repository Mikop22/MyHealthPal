import { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";

import { AppIcon } from "../components/AppIcon";
import { OnboardingOptionButton } from "../components/OnboardingOptionButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { UniversalLiquidCard } from "../components/UniversalLiquidCard";
import { Colors } from "../constants/Colors";
import { Fonts, Typography } from "../constants/Typography";
import {
  usePatientStore,
  type BiologicalSex,
} from "../store/patientStore";

interface StepOption {
  label: string;
  subtitle?: string;
  value: string | number;
}

interface StepDef {
  key: "age" | "sex" | "language" | "ethnicity" | "email";
  question: string;
  description: string;
  options?: StepOption[];
  multiSelect?: boolean;
  inputType?: "email";
  inputPlaceholder?: string;
}

const STEPS: StepDef[] = [
  {
    key: "age",
    question: "What's your age range?",
    description: "This helps us calibrate biometric baselines to your cohort.",
    options: [
      { label: "18 - 24", value: 21 },
      { label: "25 - 34", value: 30 },
      { label: "35 - 44", value: 40 },
      { label: "45 - 54", value: 50 },
      { label: "55+", value: 60 },
    ],
  },
  {
    key: "sex",
    question: "Biological sex at birth?",
    description:
      "Physiological baselines differ by sex. This is never shared externally.",
    options: [
      { label: "Female", value: "female" },
      { label: "Male", value: "male" },
      { label: "Intersex", value: "intersex" },
      { label: "Prefer not to say", value: "prefer_not_to_say" },
    ],
  },
  {
    key: "language",
    question: "Primary language?",
    description:
      "We'll match you with clinicians and resources in your language.",
    options: [
      { label: "English", value: "en" },
      { label: "Français", value: "fr" },
      { label: "Español", value: "es" },
      { label: "العربية", value: "ar" },
      { label: "中文", value: "zh" },
      { label: "Other", value: "other" },
    ],
  },
  {
    key: "ethnicity",
    question: "Choose your ethnicity",
    description: "Select all that apply.",
    multiSelect: true,
    options: [
      { label: "White", value: "white" },
      { label: "Black / African American", value: "black_african_american" },
      { label: "Black / Caribbean", value: "black_caribbean" },
      { label: "Black / African", value: "black_african" },
      { label: "East Asian", value: "east_asian" },
      { label: "South Asian", value: "south_asian" },
      { label: "Southeast Asian", value: "southeast_asian" },
      { label: "Hispanic / Latino", value: "hispanic_latino" },
      { label: "Middle Eastern / North African", value: "mena" },
      { label: "Indigenous / First Nations", value: "indigenous" },
      { label: "Pacific Islander", value: "pacific_islander" },
      { label: "Other", value: "other" },
      { label: "Prefer not to say", value: "prefer_not_to_say" },
    ],
  },
  {
    key: "email",
    question: "What's your email?",
    description:
      "We'll use this to send you appointment reminders and health updates.",
    inputType: "email",
    inputPlaceholder: "your.name@email.com",
  },
];

const TRANSITION_LOCK_MS = 180;
const HEADER_BUTTON_WIDTH = 84;

type SelectionValue = string | number | (string | number)[];
type Selections = Record<string, SelectionValue>;

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    setAge,
    setSex,
    setLanguage,
    setEthnicity,
    setEmail,
    completeDemographics,
  } = usePatientStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isInputStep = step.inputType === "email";
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

  const currentSelection: SelectionValue | null =
    selections[step.key] ?? (step.multiSelect ? [] : null);

  const hasSelection = isInputStep
    ? typeof currentSelection === "string" && currentSelection.trim().length > 0
    : step.multiSelect
      ? Array.isArray(currentSelection) && currentSelection.length > 0
      : currentSelection != null;

  const isOptionSelected = useCallback(
    (value: string | number): boolean => {
      if (step.multiSelect) {
        return (
          Array.isArray(currentSelection) &&
          (currentSelection as (string | number)[]).includes(value)
        );
      }

      return currentSelection === value;
    },
    [currentSelection, step.multiSelect],
  );

  const handleSelect = useCallback(
    (value: string | number) => {
      if (isTransitioning) return;

      if (step.multiSelect) {
        setSelections((prev) => {
          const existing = Array.isArray(prev[step.key])
            ? [...(prev[step.key] as (string | number)[])]
            : [];

          if (value === "prefer_not_to_say") {
            return { ...prev, [step.key]: ["prefer_not_to_say"] };
          }

          const nextValues = existing.filter((item) => item !== "prefer_not_to_say");
          const optionIndex = nextValues.indexOf(value);

          if (optionIndex >= 0) {
            nextValues.splice(optionIndex, 1);
          } else {
            nextValues.push(value);
          }

          return { ...prev, [step.key]: nextValues };
        });

        return;
      }

      setSelections((prev) => ({ ...prev, [step.key]: value }));
    },
    [isTransitioning, step.key, step.multiSelect],
  );

  const handleEmailChange = useCallback((text: string) => {
    setSelections((prev) => ({ ...prev, email: text }));
  }, []);

  const commitStep = useCallback(
    (stepKey: string, value: SelectionValue) => {
      switch (stepKey) {
        case "age":
          setAge(value as number);
          break;
        case "sex":
          setSex(value as BiologicalSex);
          break;
        case "language":
          setLanguage(value as string);
          break;
        case "ethnicity":
          setEthnicity(value as string[]);
          break;
        case "email":
          setEmail(value as string);
          break;
      }
    },
    [setAge, setEmail, setEthnicity, setLanguage, setSex],
  );

  const unlockTransition = useCallback(() => {
    setTimeout(() => {
      setIsTransitioning(false);
    }, TRANSITION_LOCK_MS);
  }, []);

  const handleBack = useCallback(() => {
    if (stepIndex === 0 || isTransitioning) return;

    setIsTransitioning(true);
    setStepIndex((current) => current - 1);
    unlockTransition();
  }, [isTransitioning, stepIndex, unlockTransition]);

  const handleNext = useCallback(() => {
    if (!hasSelection || isTransitioning) return;

    const value = selections[step.key];
    commitStep(step.key, value);
    setIsTransitioning(true);

    if (isLastStep) {
      completeDemographics();
      setTimeout(() => {
        router.replace("/(tabs)/scanner");
      }, TRANSITION_LOCK_MS);
      return;
    }

    setStepIndex((current) => current + 1);
    unlockTransition();
  }, [
    commitStep,
    completeDemographics,
    hasSelection,
    isLastStep,
    isTransitioning,
    router,
    selections,
    step.key,
    unlockTransition,
  ]);

  const optionsList = step.options?.map((option, index) => (
    <Animated.View
      key={`${step.key}-${String(option.value)}`}
      entering={FadeInDown.delay((index + 1) * 100).springify().damping(12)}
    >
      <OnboardingOptionButton
        label={option.label}
        subtitle={option.subtitle}
        selected={isOptionSelected(option.value)}
        onPress={() => handleSelect(option.value)}
      />
    </Animated.View>
  ));

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.background, Colors.surfaceStrong]}
        style={StyleSheet.absoluteFill}
      />

      <View className="px-6 pt-16">
        <View className="h-16 flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            pointerEvents={stepIndex === 0 ? "none" : "auto"}
            style={[
              styles.headerButton,
              stepIndex === 0 && styles.headerButtonHidden,
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          <UniversalLiquidCard variant="subtle" style={styles.headerPill}>
            <Text style={styles.headerStepLabel}>
              Step {stepIndex + 1} of {STEPS.length}
            </Text>
          </UniversalLiquidCard>

          <View style={{ width: HEADER_BUTTON_WIDTH }} />
        </View>
      </View>

      <View className="flex-1 w-full items-center px-5" style={styles.contentViewport}>
        <Animated.View
          key={step.key}
          entering={FadeInDown.springify().damping(15).stiffness(150)}
          exiting={FadeOut.duration(150)}
          style={styles.stepShell}
        >
          <View className="w-full max-w-[400px]">
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>

            <UniversalLiquidCard
              variant="elevated"
              className="w-full overflow-hidden rounded-3xl"
              style={styles.heroCard}
            >
              <View style={styles.heroGlow} />
              <View className="w-full px-5 py-8">
                <View style={styles.heroMetaRow}>
                  <StatusBadge
                    tone="info"
                    icon={isInputStep ? "mail" : "shield-checkmark"}
                    label={isInputStep ? "Private contact" : "Personalized setup"}
                  />
                </View>

                <SectionHeader
                  eyebrow="Onboarding"
                  title={step.question}
                  subtitle={step.description}
                />
              </View>
            </UniversalLiquidCard>

            {isInputStep && (
              <Animated.View
                entering={FadeInDown.delay(100).springify().damping(12)}
                style={{ marginTop: 24 }}
              >
                <View style={inputStyles.inputContainer}>
                  <View style={inputStyles.iconWrap}>
                    <AppIcon name="mail" size={20} color={Colors.forest[500]} />
                  </View>
                  <TextInput
                    style={inputStyles.input}
                    placeholder={step.inputPlaceholder}
                    placeholderTextColor={Colors.forest[400]}
                    value={(selections.email as string) ?? ""}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                  />
                </View>
                <Text style={inputStyles.hint}>
                  Your email is kept private and only used for care updates.
                </Text>
              </Animated.View>
            )}

            {!isInputStep && step.multiSelect ? (
              <ScrollView
                style={{ marginTop: 24, maxHeight: 360 }}
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {optionsList}
              </ScrollView>
            ) : !isInputStep ? (
              <View style={{ marginTop: 24, gap: 8 }}>{optionsList}</View>
            ) : null}
          </View>
        </Animated.View>
      </View>

      <View
        style={{
          width: "90%",
          maxWidth: 400,
          alignSelf: "center",
          paddingBottom: 40,
        }}
      >
        <PrimaryButton
          onPress={handleNext}
          disabled={!hasSelection}
          icon={isLastStep ? "checkmark" : "chevron-forward"}
          label={isLastStep ? "Confirm" : "Continue"}
          style={[
            ctaStyles.btn,
            Platform.OS === "web" && (ctaStyles.btnWeb as object),
            hasSelection &&
              Platform.OS === "web" &&
              (ctaStyles.btnWebActive as object),
          ]}
        />
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(187, 247, 208, 0.45)",
    paddingHorizontal: 18,
    height: 60,
    shadowColor: "rgba(22, 101, 52, 0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(240, 253, 244, 0.7)",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(187, 247, 208, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: Fonts.medium,
    color: Colors.forest[800],
    letterSpacing: -0.1,
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.forest[400],
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 0.2,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentViewport: {
    overflow: "hidden",
  },
  stepShell: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingTop: 16,
  },
  headerButton: {
    width: HEADER_BUTTON_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  backLabel: {
    marginLeft: 4,
    ...Typography.caption,
    color: Colors.text.primary,
  },
  headerButtonHidden: {
    opacity: 0,
  },
  headerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerStepLabel: {
    ...Typography.micro,
    color: Colors.text.secondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(197, 221, 203, 0.55)",
    overflow: "hidden",
    marginBottom: 18,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.brand[500],
  },
  heroCard: {
    borderColor: Colors.border.glass,
  },
  heroGlow: {
    position: "absolute",
    top: -30,
    right: -10,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(109, 201, 79, 0.16)",
  },
  heroMetaRow: {
    marginBottom: 18,
  },
});

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
  btnWeb: {
    // @ts-expect-error web-only
    backdropFilter: "blur(24px) saturate(160%)",
    WebkitBackdropFilter: "blur(24px) saturate(160%)",
  },
  btnWebActive: {},
});
