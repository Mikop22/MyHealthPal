import React, { useCallback } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { AppIcon, type AppIconName } from "./AppIcon";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Typography";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface PrimaryButtonProps {
  /** Button label */
  label: string;
  /** Called on press */
  onPress?: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Optional leading icon */
  icon?: AppIconName;
  /** Show loading spinner instead of label */
  loading?: boolean;
  /** Disable interactions */
  disabled?: boolean;
  /** Additional container style */
  style?: ViewStyle;
}

const SPRING_IN = { damping: 18, stiffness: 380, mass: 0.7 };
const SPRING_OUT = { damping: 14, stiffness: 300, mass: 0.6 };

const SIZE_STYLES: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
    text: { fontSize: 13, lineHeight: 18 },
  },
  md: {
    container: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16 },
    text: { fontSize: 15, lineHeight: 20 },
  },
  lg: {
    container: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: 20 },
    text: { fontSize: 16, lineHeight: 22 },
  },
};

/**
 * Primary action button with glass-morphism styling.
 * Matches DoctorAPP .glass-purple CTA pattern with spring press animation.
 */
export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.965]) }],
  }));

  const onPressIn = useCallback(() => {
    if (!disabled) pressed.value = withSpring(1, SPRING_IN);
  }, [disabled]);

  const onPressOut = useCallback(() => {
    pressed.value = withSpring(0, SPRING_OUT);
  }, []);

  const sizeStyle = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  if (variant === "primary") {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[animStyle, { opacity: isDisabled ? 0.5 : 1 }, style]}
      >
        <LinearGradient
          colors={[Colors.gradient.ctaStart, Colors.gradient.ctaEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.primaryContainer, sizeStyle.container]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.row}>
              {icon && <AppIcon name={icon} size={18} color="#fff" />}
              <Text style={[styles.primaryText, sizeStyle.text]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  const isGhost = variant === "ghost";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      style={[
        animStyle,
        isGhost ? styles.ghostContainer : styles.secondaryContainer,
        sizeStyle.container,
        { opacity: isDisabled ? 0.5 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.brand} />
      ) : (
        <View style={styles.row}>
          {icon && <AppIcon name={icon} size={18} color={Colors.brand} />}
          <Text
            style={[
              isGhost ? styles.ghostText : styles.secondaryText,
              sizeStyle.text,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryContainer: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(68, 173, 79, 0.35)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryText: {
    fontFamily: Fonts.semiBold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  secondaryContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(68, 173, 79, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(68, 173, 79, 0.2)",
  },
  secondaryText: {
    fontFamily: Fonts.semiBold,
    color: Colors.brand,
    letterSpacing: 0.3,
  },
  ghostContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  ghostText: {
    fontFamily: Fonts.semiBold,
    color: Colors.brand,
    letterSpacing: 0.3,
  },
});
