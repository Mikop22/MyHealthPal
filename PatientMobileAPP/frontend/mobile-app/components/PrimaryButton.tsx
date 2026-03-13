import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../constants/Colors";
import { Typography } from "../constants/Typography";
import { AppIcon, type AppIconName } from "./AppIcon";

interface PrimaryButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  icon?: AppIconName;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  icon,
  disabled,
  variant = "primary",
  style,
  ...props
}: PrimaryButtonProps) {
  const isSecondary = variant === "secondary";
  const iconColor = disabled
    ? Colors.text.tertiary
    : isSecondary
      ? Colors.brand[700]
      : Colors.text.inverse;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...props}
    >
      {isSecondary ? (
        <View style={styles.secondaryFill}>
          {icon ? <AppIcon name={icon} size={18} color={iconColor} /> : null}
          <Text
            style={[
              styles.label,
              styles.secondaryLabel,
              disabled && styles.disabledSecondaryLabel,
            ]}
          >
            {label}
          </Text>
        </View>
      ) : (
        <LinearGradient
          colors={
            disabled
              ? ["#DCE7DF", "#DCE7DF"]
              : [Colors.brand[400], Colors.brand[600]]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {icon ? <AppIcon name={icon} size={18} color={iconColor} /> : null}
          <Text style={[styles.label, disabled && styles.disabledLabel]}>
            {label}
          </Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 22,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  gradient: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.border.soft,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  secondaryFill: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 1,
  },
  label: {
    ...Typography.button,
    color: Colors.text.inverse,
  },
  secondaryLabel: {
    color: Colors.brand[700],
  },
  disabledLabel: {
    color: Colors.text.tertiary,
  },
  disabledSecondaryLabel: {
    color: Colors.text.tertiary,
  },
});

export default PrimaryButton;
