import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { AppIcon, type AppIconName } from "./AppIcon";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Typography";

interface MetricPillProps {
  /** Metric label (e.g. "HRV", "Steps") */
  label: string;
  /** Metric value */
  value: string;
  /** Unit suffix */
  unit?: string;
  /** Optional icon */
  icon?: AppIconName;
  /** Whether this metric is active/selected */
  active?: boolean;
  /** Additional container style */
  style?: ViewStyle;
}

/**
 * Compact metric pill for displaying a single data point.
 * Used in dashboard cards and vitals overview.
 * Matches the DoctorAPP DeltaPill / badge pattern.
 */
export function MetricPill({
  label,
  value,
  unit,
  icon,
  active = false,
  style,
}: MetricPillProps) {
  return (
    <View
      style={[
        styles.container,
        active ? styles.containerActive : styles.containerDefault,
        style,
      ]}
    >
      {icon && (
        <AppIcon
          name={icon}
          size={14}
          color={active ? "#FFFFFF" : Colors.brand}
        />
      )}
      <View style={styles.textWrap}>
        <Text style={[styles.value, active && styles.valueActive]}>
          {value}
          {unit && <Text style={[styles.unit, active && styles.unitActive]}> {unit}</Text>}
        </Text>
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  containerDefault: {
    backgroundColor: "rgba(68, 173, 79, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(68, 173, 79, 0.12)",
  },
  containerActive: {
    backgroundColor: Colors.brand,
    shadowColor: "rgba(68, 173, 79, 0.35)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  textWrap: {
    gap: 1,
  },
  value: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  valueActive: {
    color: "#FFFFFF",
  },
  unit: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.text.muted,
  },
  unitActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.text.muted,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
});
