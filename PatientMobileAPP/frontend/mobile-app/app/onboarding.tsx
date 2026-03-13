import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { AppIcon } from "../components/AppIcon";
import { OnboardingOptionButton } from "../components/OnboardingOptionButton";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Typography";
import {
  usePatientStore,
  type BiologicalSex,
} from "../store/patientStore";

const SCREEN_BG = "#F6F8F6";
const CARD_BG = "#FFFFFF";
const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";
const TEXT_TERTIARY = "#98A2B3";

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
      { label: "Francais", value: "fr" },
      { label: "Espanol", value: "es" },
      { label: "Arabic", value: "ar" },
      { label: "Chinese", value: "zh" },
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
const HEADER_BUTTON_WIDTH = 92;

type SelectionValue = string | number | (string | number)[];
type Selections = Record<string, SelectionValue>;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const pressScale = useSharedValue(1);
  const ctaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isInputStep = step.inputType === "email";

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

          const nextValues = existing.filter(
            (item) => item !== "prefer_not_to_say",
          );
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
    <View style={styles.container}>
      <View
        style={[
          styles.headerWrap,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleBack}
            pointerEvents={stepIndex === 0 ? "none" : "auto"}
            style={[
              styles.headerButton,
              stepIndex === 0 && styles.headerButtonHidden,
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={TEXT_PRIMARY} />
            <Text style={styles.headerButtonText}>Back</Text>
          </Pressable>

          <Text style={styles.headerStepLabel}>
            Step {stepIndex + 1} of {STEPS.length}
          </Text>

          <View style={{ width: HEADER_BUTTON_WIDTH }} />
        </View>
      </View>

      <View style={styles.contentViewport}>
        <Animated.View
          key={step.key}
          entering={FadeInDown.springify().damping(15).stiffness(150)}
          exiting={FadeOut.duration(150)}
          style={styles.stepShell}
        >
          <View style={styles.stepContent}>
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{step.question}</Text>
              <Text style={styles.descriptionText}>{step.description}</Text>
            </View>

            {isInputStep && (
              <Animated.View
                entering={FadeInDown.delay(100).springify().damping(12)}
                style={styles.inputWrap}
              >
                <View style={inputStyles.inputContainer}>
                  <View style={inputStyles.iconWrap}>
                    <AppIcon name="mail" size={18} color={Colors.accent} />
                  </View>
                  <TextInput
                    style={inputStyles.input}
                    placeholder={step.inputPlaceholder}
                    placeholderTextColor={TEXT_TERTIARY}
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
                  Your email is kept private and never shared.
                </Text>
              </Animated.View>
            )}

            {!isInputStep && step.multiSelect ? (
              <ScrollView
                style={styles.optionsScroll}
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.optionsScrollContent}
              >
                {optionsList}
              </ScrollView>
            ) : !isInputStep ? (
              <View style={styles.optionsList}>{optionsList}</View>
            ) : null}
          </View>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          ctaAnimStyle,
          styles.ctaWrap,
          { paddingBottom: Math.max(insets.bottom, 20) + 18 },
        ]}
      >
        <Pressable
          onPress={handleNext}
          disabled={!hasSelection}
          onPressIn={() => {
            if (hasSelection) {
              pressScale.value = withSpring(0.96, {
                damping: 12,
                stiffness: 300,
              });
            }
          }}
          onPressOut={() => {
            pressScale.value = withSpring(1, {
              damping: 12,
              stiffness: 300,
            });
          }}
          style={[
            ctaStyles.btn,
            hasSelection ? ctaStyles.btnActive : ctaStyles.btnDisabled,
          ]}
        >
          <Text
            style={[
              ctaStyles.text,
              hasSelection ? ctaStyles.textActive : ctaStyles.textDisabled,
            ]}
          >
            {isLastStep ? "Confirm" : "Continue"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 60,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F4F7F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 0.2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  headerWrap: {
    paddingHorizontal: 24,
  },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: HEADER_BUTTON_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  headerButtonHidden: {
    opacity: 0,
  },
  headerButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  headerStepLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: TEXT_SECONDARY,
    letterSpacing: 0.3,
  },
  contentViewport: {
    flex: 1,
    overflow: "hidden",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  stepShell: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingTop: 20,
  },
  stepContent: {
    width: "100%",
    maxWidth: 400,
  },
  questionCard: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 28,
    elevation: 4,
  },
  questionText: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 28,
    color: TEXT_PRIMARY,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  descriptionText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_SECONDARY,
    fontFamily: Fonts.regular,
  },
  inputWrap: {
    marginTop: 24,
  },
  optionsScroll: {
    marginTop: 24,
    maxHeight: 360,
  },
  optionsScrollContent: {
    gap: 10,
  },
  optionsList: {
    marginTop: 24,
    gap: 10,
  },
  ctaWrap: {
    width: "90%",
    maxWidth: 400,
    alignSelf: "center",
  },
});

const ctaStyles = StyleSheet.create({
  btn: {
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: "#D0D5DD",
  },
  text: {
    fontFamily: Fonts.bold,
    fontSize: 18,
  },
  textActive: {
    color: "#FFFFFF",
  },
  textDisabled: {
    color: "rgba(16, 24, 40, 0.45)",
  },
});
