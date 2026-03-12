import { useState, useCallback } from "react";
import {
  View,
  Text,
  useWindowDimensions,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { UniversalLiquidCard } from "../components/UniversalLiquidCard";
import { OnboardingOptionButton } from "../components/OnboardingOptionButton";
import { LogoBreathing } from "../components/LogoBreathing";
import {
  usePatientStore,
  type BiologicalSex,
} from "../store/patientStore";
import { Fonts } from "../constants/Typography";

/* ───────────── Step Definitions ───────────── */

interface StepOption {
  label: string;
  subtitle?: string;
  value: string | number;
}

interface StepDef {
  key: "age" | "sex" | "language" | "ethnicity";
  question: string;
  description: string;
  options: StepOption[];
  multiSelect?: boolean;
}

const STEPS: StepDef[] = [
  {
    key: "age",
    question: "What's your age range?",
    description: "This helps us calibrate biometric baselines to your cohort.",
    options: [
      { label: "18 – 24", value: 21 },
      { label: "25 – 34", value: 30 },
      { label: "35 – 44", value: 40 },
      { label: "45 – 54", value: 50 },
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
];

/* ───────────── Spring config ───────────── */
const CARD_SPRING = { damping: 20, stiffness: 200, mass: 1 };

type SelectionValue = string | number | (string | number)[];
type Selections = Record<string, SelectionValue>;

/* ───────────── Component ───────────── */

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { setAge, setSex, setLanguage, setEthnicity, completeDemographics } =
    usePatientStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const pressScale = useSharedValue(1);
  const ctaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const progress = (stepIndex + 1) / STEPS.length;

  const currentSelection: SelectionValue | null =
    selections[step.key] ?? (step.multiSelect ? [] : null);

  const hasSelection = step.multiSelect
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
    [step.multiSelect, currentSelection],
  );

  const handleSelect = useCallback(
    (value: string | number) => {
      if (isTransitioning) return;

      if (step.multiSelect) {
        setSelections((prev) => {
          const arr = Array.isArray(prev[step.key])
            ? [...(prev[step.key] as (string | number)[])]
            : [];

          if (value === "prefer_not_to_say") {
            return { ...prev, [step.key]: ["prefer_not_to_say"] };
          }

          const filtered = arr.filter((v) => v !== "prefer_not_to_say");
          const idx = filtered.indexOf(value);
          if (idx >= 0) {
            filtered.splice(idx, 1);
          } else {
            filtered.push(value);
          }
          return { ...prev, [step.key]: filtered };
        });
      } else {
        setSelections((prev) => ({ ...prev, [step.key]: value }));
      }
    },
    [isTransitioning, step.key, step.multiSelect],
  );

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
      }
    },
    [setAge, setSex, setLanguage, setEthnicity],
  );

  const handleBack = useCallback(() => {
    if (stepIndex === 0 || isTransitioning) return;
    setDirection(-1);
    setIsTransitioning(true);
    setTimeout(() => {
      setStepIndex((i) => i - 1);
      setIsTransitioning(false);
    }, 350);
  }, [stepIndex, isTransitioning]);

  const handleNext = useCallback(() => {
    if (!hasSelection || isTransitioning) return;

    const value = selections[step.key];
    commitStep(step.key, value);
    setDirection(1);
    setIsTransitioning(true);

    if (isLastStep) {
      completeDemographics();
      setTimeout(() => {
        router.replace("/(tabs)/scanner");
      }, 400);
    } else {
      setTimeout(() => {
        setStepIndex((i) => i + 1);
        setIsTransitioning(false);
      }, 350);
    }
  }, [
    hasSelection,
    isTransitioning,
    isLastStep,
    selections,
    step.key,
    commitStep,
    completeDemographics,
    router,
  ]);

  const entering =
    direction === 1
      ? SlideInRight.springify()
        .damping(CARD_SPRING.damping)
        .stiffness(CARD_SPRING.stiffness)
        .mass(CARD_SPRING.mass)
      : SlideInLeft.springify()
        .damping(CARD_SPRING.damping)
        .stiffness(CARD_SPRING.stiffness)
        .mass(CARD_SPRING.mass);

  const exiting =
    direction === 1
      ? SlideOutLeft.springify()
        .damping(CARD_SPRING.damping)
        .stiffness(CARD_SPRING.stiffness)
        .mass(CARD_SPRING.mass)
      : SlideOutRight.springify()
        .damping(CARD_SPRING.damping)
        .stiffness(CARD_SPRING.stiffness)
        .mass(CARD_SPRING.mass);

  const optionsList = step.options.map((opt, _idx) => (
    <OnboardingOptionButton
      key={String(opt.value)}
      label={opt.label}
      subtitle={opt.subtitle}
      selected={isOptionSelected(opt.value)}
      onPress={() => handleSelect(opt.value)}
    />
  ));

  return (
    <View className="flex-1 bg-white">
      {/* Watermark logo removed per user request */}

      {/* Top bar: Back button + step indicator */}
      <View className="flex-row items-center justify-between px-6 pt-16 pb-2">
        {stepIndex > 0 ? (
          <Pressable
            onPress={handleBack}
            className="flex-row items-center py-2 pr-4"
          >
            <Ionicons name="chevron-back" size={20} color="#166534" />
            <Text className="text-sm font-semibold text-primary ml-1">
              Back
            </Text>
          </Pressable>
        ) : (
          <View className="w-16" />
        )}
      </View>


      <View className="flex-1 w-full items-center">
        <Animated.View
          key={step.key}
          entering={entering}
          exiting={exiting}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            alignItems: 'center',
          }}
        >
          {/* Master width-lock + vertical anchor */}
          <View className="w-[90%] max-w-[400px] mt-16">
            {/* Top Card: Question & Description */}
            <UniversalLiquidCard
              variant="elevated"
              className="w-full rounded-3xl overflow-hidden"
            >
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
            </UniversalLiquidCard>

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
          </View>
        </Animated.View>
      </View>

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
            style={[StyleSheet.absoluteFill, { opacity: hasSelection ? 0.45 : 0.15 }]}
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
    </View>
  );
}

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
    // Removed glowing box-shadow per user request
  },
});
