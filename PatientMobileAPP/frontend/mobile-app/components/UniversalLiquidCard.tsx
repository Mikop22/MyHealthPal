import React, { useCallback } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Colors, GlassRadius } from "../constants/Colors";

const SPRING_IN = { damping: 18, stiffness: 350, mass: 0.8 };
const SPRING_OUT = { damping: 14, stiffness: 280, mass: 0.6 };

type GlassVariant = "default" | "elevated" | "active" | "subtle";

interface UniversalLiquidCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  className?: string;
  pressable?: boolean;
  radius?: keyof typeof GlassRadius;
  style?: ViewStyle;
}

const VARIANT_FILL: Record<GlassVariant, ViewStyle> = {
  default: {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    borderColor: "rgba(187, 247, 208, 0.35)",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  elevated: {
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderColor: "rgba(187, 247, 208, 0.40)",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  active: {
    backgroundColor: "rgba(240, 253, 244, 0.50)",
    borderColor: "rgba(74, 222, 128, 0.35)",
    borderWidth: StyleSheet.hairlineWidth * 3,
  },
  subtle: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderColor: "transparent",
    borderWidth: 0,
  },
};

const WEB_SHADOW: Record<GlassVariant, string> = {
  default:
    "0 1px 2px rgba(22,101,52,0.03), 0 4px 12px rgba(22,101,52,0.04), 0 12px 36px rgba(22,101,52,0.05)",
  elevated:
    "0 1px 3px rgba(22,101,52,0.04), 0 6px 16px rgba(22,101,52,0.05), 0 16px 48px rgba(22,101,52,0.06), inset 0 0.5px 0 rgba(255,255,255,0.6)",
  active:
    "0 1px 2px rgba(34,197,94,0.06), 0 4px 14px rgba(34,197,94,0.08), 0 14px 40px rgba(34,197,94,0.06), inset 0 0.5px 0 rgba(255,255,255,0.5)",
  subtle:
    "0 2px 8px rgba(22,101,52,0.03), 0 8px 24px rgba(22,101,52,0.03)",
};

export function UniversalLiquidCard({
  children,
  variant = "default",
  className = "",
  pressable = false,
  radius = "md",
  style,
}: UniversalLiquidCardProps) {
  const pressed = useSharedValue(0);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pressed.value, [0, 1], [1, 0.975]) },
    ],
  }));

  const onPressIn = useCallback(() => {
    if (pressable) pressed.value = withSpring(1, SPRING_IN);
  }, [pressable]);

  const onPressOut = useCallback(() => {
    if (pressable) pressed.value = withSpring(0, SPRING_OUT);
  }, [pressable]);

  const borderRadius = GlassRadius[radius];
  const variantFill = VARIANT_FILL[variant];

  if (Platform.OS === "web") {
    return (
      <Animated.View
        onPointerDown={onPressIn}
        onPointerUp={onPressOut}
        onPointerLeave={onPressOut}
        style={[
          scaleStyle,
          variantFill,
          {
            borderRadius,
            overflow: "hidden" as const,
            // @ts-expect-error — web-only CSS properties
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            boxShadow: WEB_SHADOW[variant],
            transition: "box-shadow 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.2s ease",
          },
          style,
        ]}
        className={`relative ${className}`}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 50%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
        <View className="relative z-10">{children}</View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
      onTouchCancel={onPressOut}
      style={[
        scaleStyle,
        nativeStyles.wrapper,
        variantFill,
        { borderRadius },
        style,
      ]}
      className={`relative overflow-hidden ${className}`}
    >
      <BlurView
        intensity={90}
        tint="light"
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      <View
        style={[nativeStyles.innerGlow, { borderRadius }]}
        className="absolute inset-0 pointer-events-none"
      />
      <View className="relative z-10">{children}</View>
    </Animated.View>
  );
}

const nativeStyles = StyleSheet.create({
  wrapper: {
    shadowColor: "rgba(22, 101, 52, 0.12)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  innerGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "35%",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
});

export default UniversalLiquidCard;
