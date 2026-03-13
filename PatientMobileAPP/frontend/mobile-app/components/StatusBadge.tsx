import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Typography";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface StatusBadgeProps {
  /** Badge label text */
  label: string;
  /** Semantic variant controlling color */
  variant?: BadgeVariant;
  /** Additional container style */
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<
  BadgeVariant,
  { bg: string; text: string }
> = {
  success: {
    bg: Colors.semantic.successBg,
    text: Colors.semantic.success,
  },
  warning: {
    bg: Colors.semantic.warningBg,
    text: Colors.semantic.warning,
  },
  error: {
    bg: Colors.semantic.errorBg,
    text: Colors.semantic.error,
  },
  info: {
    bg: Colors.semantic.infoBg,
    text: Colors.semantic.info,
  },
  neutral: {
    bg: "rgba(107, 126, 107, 0.08)",
    text: Colors.text.muted,
  },
};

/**
 * Semantic status badge pill — matches DoctorAPP priority/status badge pattern.
 * Renders a small rounded pill with tinted background and colored text.
 */
export function StatusBadge({ label, variant = "neutral", style }: StatusBadgeProps) {
  const colors = VARIANT_STYLES[variant];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.3,
  },
});
