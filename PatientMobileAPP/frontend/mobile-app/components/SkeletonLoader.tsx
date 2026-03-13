import React, { useEffect } from "react";
import { View, StyleSheet, type ViewStyle, type DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from "react-native-reanimated";

interface SkeletonLoaderProps {
  /** Width of the skeleton element */
  width?: number | string;
  /** Height of the skeleton element */
  height?: number;
  /** Border radius */
  radius?: number;
  /** Additional container style */
  style?: ViewStyle;
}

/**
 * Skeleton loading placeholder — matches DoctorAPP .skeleton-pulse style.
 * Provides a pulsing green-tinted gradient placeholder for loading states.
 */
export function SkeletonLoader({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: SkeletonLoaderProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as DimensionValue,
          height,
          borderRadius: radius,
        },
        animStyle,
        style,
      ]}
    />
  );
}

/** A group of skeleton lines to simulate a text block */
export function SkeletonTextBlock({
  lines = 3,
  style,
}: {
  lines?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.textBlock, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          height={14}
          width={i === lines - 1 ? "60%" : "100%"}
          style={{ marginBottom: i < lines - 1 ? 10 : 0 }}
        />
      ))}
    </View>
  );
}

/** A skeleton card placeholder matching glass card dimensions */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader width={120} height={12} radius={6} />
      <View style={{ height: 16 }} />
      <SkeletonLoader height={20} radius={8} />
      <View style={{ height: 10 }} />
      <SkeletonLoader width="75%" height={14} radius={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "rgba(200, 230, 210, 0.4)",
  },
  textBlock: {
    gap: 0,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(187, 247, 208, 0.35)",
  },
});
