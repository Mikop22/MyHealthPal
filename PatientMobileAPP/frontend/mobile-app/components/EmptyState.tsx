import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { AppIcon, type AppIconName } from "./AppIcon";
import { Colors } from "../constants/Colors";
import { Fonts, TypeScale } from "../constants/Typography";

interface EmptyStateProps {
  /** Primary icon to display */
  icon: AppIconName;
  /** Heading text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action component (e.g. a PrimaryButton) */
  action?: React.ReactNode;
  /** Additional container style */
  style?: ViewStyle;
}

/**
 * Empty state placeholder — shown when a list or section has no data.
 * Matches DoctorAPP's loading/empty patterns with glass-tinted design.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <AppIcon name={icon} size={28} color={Colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.actionWrap}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(68, 173, 79, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(68, 173, 79, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    ...TypeScale.subheading,
    fontFamily: Fonts.semiBold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    ...TypeScale.body,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  actionWrap: {
    marginTop: 24,
  },
});
