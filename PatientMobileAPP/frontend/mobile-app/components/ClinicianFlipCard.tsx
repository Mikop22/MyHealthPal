import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";

interface ClinicianFlipCardProps {
  /** Async gate called before the first flip to clinician view. */
  onBeforeFlip?: () => Promise<void>;
}

export function ClinicianFlipCard({ onBeforeFlip }: ClinicianFlipCardProps) {
  const flipProgress = useSharedValue(0);
  const spinRotation = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (isLoading) {
      spinRotation.value = 0;
      spinRotation.value = withRepeat(
        withTiming(1, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      spinRotation.value = withTiming(0, { duration: 200 });
    }
  }, [isLoading]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(spinRotation.value, [0, 1], [0, 360])}deg` },
    ],
  }));

  const executeFlip = useCallback(
    (next: boolean) => {
      setIsFlipped(next);
      flipProgress.value = withTiming(next ? 1 : 0, {
        duration: 500,
        easing: Easing.inOut(Easing.cubic),
      });
    },
    [flipProgress],
  );

  const handleFlip = useCallback(async () => {
    if (isLoading) return;

    const next = !isFlipped;

    if (next && !hasSubmitted && onBeforeFlip) {
      setIsLoading(true);
      try {
        await onBeforeFlip();
      } finally {
        setHasSubmitted(true);
        setIsLoading(false);
      }
      executeFlip(true);
      return;
    }

    executeFlip(next);
  }, [isFlipped, isLoading, hasSubmitted, onBeforeFlip, executeFlip]);

  const frontAnimStyle = useAnimatedStyle(() => {
    const deg = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${deg}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const backAnimStyle = useAnimatedStyle(() => {
    const deg = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${deg}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  return (
    <Pressable
      onPress={handleFlip}
      disabled={isLoading}
      style={[
        styles.wrapper,
        Platform.OS === "web" &&
          ({ transformStyle: "preserve-3d" } as Record<string, string>),
      ]}
    >
      {/* ─── Front: Patient Action Plan ─── */}
      <Animated.View style={[styles.face, styles.frontFace, frontAnimStyle]}>
        <View style={styles.faceHeader}>
          <Ionicons name="clipboard" size={24} color={Colors.accent} />
          <Text style={styles.frontTitle}>Your Action Plan</Text>
        </View>

        <ActionItem text="Book follow-up with OB/GYN within 14 days" />
        <ActionItem text="Request transvaginal ultrasound imaging" />
        <ActionItem text="Begin symptom diary — pain scale + triggers daily" />

        <Text style={styles.flipHintFront}>Tap to reveal clinician view</Text>
      </Animated.View>

      {/* ─── Back: Clinician Brief ─── */}
      <Animated.View style={[styles.face, styles.backFace, backAnimStyle]}>
        <View style={styles.faceHeader}>
          <Ionicons name="medical" size={24} color={Colors.accent} />
          <Text style={styles.backTitle}>Clinician Brief</Text>
        </View>

        <ClinicalRow label="PRIMARY DX" value="R/O Endometriosis, Stage II–III" />
        <ClinicalRow label="ONSET" value="Cyclical, worsening × 6 months" />
        <ClinicalRow label="SEVERITY" value="VAS 8/10 — functional impairment" />
        <ClinicalRow label="HRV DELTA" value="SDNN ↓54 % from baseline (autonomic stress)" />

        <Text style={styles.flipHintBack}>Tap to return to patient view</Text>
      </Animated.View>

      {/* ─── Loading overlay ─── */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Animated.View style={spinnerStyle}>
            <Ionicons name="sync" size={36} color={Colors.accent} />
          </Animated.View>
          <Text style={styles.loadingLabel}>Processing via RAG pipeline…</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ──── Sub-components ──── */

function ActionItem({ text }: { text: string }) {
  return (
    <View style={styles.actionRow}>
      <View style={styles.actionDot} />
      <Text style={styles.actionText}>{text}</Text>
    </View>
  );
}

function ClinicalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.clinicalRow}>
      <Text style={styles.clinicalLabel}>{label}</Text>
      <Text style={styles.clinicalValue}>{value}</Text>
    </View>
  );
}

/* ──── Styles ──── */

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    minHeight: 290,
  },

  face: {
    borderRadius: 24,
    padding: 24,
    minHeight: 290,
  },
  frontFace: {
    backgroundColor: Colors.forest[50],
    borderWidth: 1,
    borderColor: Colors.forest[200],
  },
  backFace: {
    backgroundColor: Colors.forest[950],
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  faceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  frontTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
  },
  backTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.forest[100],
  },

  /* Front content */
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginTop: 7,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.forest[800],
  },

  /* Back content */
  clinicalRow: {
    marginBottom: 16,
  },
  clinicalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.forest[400],
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  clinicalValue: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.forest[100],
  },

  /* Hints */
  flipHintFront: {
    textAlign: "center",
    fontSize: 13,
    color: Colors.forest[400],
    marginTop: 16,
  },
  flipHintBack: {
    textAlign: "center",
    fontSize: 13,
    color: Colors.forest[500],
    marginTop: 16,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    backgroundColor: "rgba(240, 253, 244, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    gap: 14,
  },
  loadingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.forest[700],
  },
});
