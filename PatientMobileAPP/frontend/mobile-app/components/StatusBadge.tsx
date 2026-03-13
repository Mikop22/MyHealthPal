import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/Colors";
import { AppIcon, type AppIconName } from "./AppIcon";
import { Typography } from "../constants/Typography";

type Tone = "success" | "warning" | "critical" | "info" | "neutral";

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  icon?: AppIconName;
}

const TONES: Record<
  Tone,
  { backgroundColor: string; borderColor: string; textColor: string; iconColor: string }
> = {
  success: {
    backgroundColor: Colors.semantic.successSoft,
    borderColor: "rgba(46,125,50,0.16)",
    textColor: Colors.semantic.success,
    iconColor: Colors.semantic.success,
  },
  warning: {
    backgroundColor: Colors.semantic.warningSoft,
    borderColor: "rgba(201,119,26,0.16)",
    textColor: Colors.semantic.warning,
    iconColor: Colors.semantic.warning,
  },
  critical: {
    backgroundColor: Colors.semantic.errorSoft,
    borderColor: "rgba(214,91,91,0.16)",
    textColor: Colors.semantic.error,
    iconColor: Colors.semantic.error,
  },
  info: {
    backgroundColor: Colors.semantic.infoSoft,
    borderColor: "rgba(49,120,198,0.16)",
    textColor: Colors.semantic.info,
    iconColor: Colors.semantic.info,
  },
  neutral: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: Colors.border.soft,
    textColor: Colors.text.secondary,
    iconColor: Colors.text.secondary,
  },
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon = "information-circle",
}: StatusBadgeProps) {
  const palette = TONES[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <AppIcon name={icon} size={14} color={palette.iconColor} />
      <Text style={[styles.label, { color: palette.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    ...Typography.micro,
  },
});

export default StatusBadge;
