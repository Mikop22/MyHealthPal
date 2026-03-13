import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../constants/Colors";
import { AppIcon, type AppIconName } from "./AppIcon";
import { Typography } from "../constants/Typography";

interface MetricPillProps {
  label: string;
  icon: AppIconName;
  active?: boolean;
  onPress?: () => void;
}

export function MetricPill({
  label,
  icon,
  active = false,
  onPress,
}: MetricPillProps) {
  return (
    <Pressable onPress={onPress} style={styles.outer}>
      {active ? (
        <LinearGradient
          colors={[Colors.brand[400], Colors.brand[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pill}
        >
          <AppIcon name={icon} size={14} color={Colors.text.inverse} />
          <Text style={[styles.label, styles.activeLabel]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.pill, styles.inactivePill]}>
          <AppIcon name={icon} size={14} color={Colors.text.secondary} />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
  },
  pill: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inactivePill: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: Colors.border.soft,
  },
  label: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  activeLabel: {
    color: Colors.text.inverse,
  },
});

export default MetricPill;
