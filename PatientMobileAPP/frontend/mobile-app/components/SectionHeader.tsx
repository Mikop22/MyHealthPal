import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppIcon, type AppIconName } from "./AppIcon";
import { Colors } from "../constants/Colors";
import { Fonts, TypeScale } from "../constants/Typography";

interface SectionHeaderProps {
  /** Section title (e.g. "DEMOGRAPHICS") */
  title: string;
  /** Optional icon shown before the title */
  icon?: AppIconName;
  /** Optional subtitle below the title */
  subtitle?: string;
}

/**
 * Section header with optional icon and overline label style.
 * Mirrors DoctorAPP's card section headers.
 */
export function SectionHeader({ title, icon, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        {icon && (
          <View style={styles.iconWrap}>
            <AppIcon name={icon} size={14} color={Colors.brand} />
          </View>
        )}
        <Text style={styles.label}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(68, 173, 79, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...TypeScale.overline,
    fontFamily: Fonts.bold,
    color: Colors.text.secondary,
    textTransform: "uppercase",
  },
  subtitle: {
    ...TypeScale.caption,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 4,
  },
});
