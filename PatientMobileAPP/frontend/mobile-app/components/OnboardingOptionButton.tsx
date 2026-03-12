import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { UniversalLiquidCard } from "./UniversalLiquidCard";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Typography";

interface OnboardingOptionButtonProps {
  label: string;
  subtitle?: string;
  selected?: boolean;
  onPress: () => void;
  // isLast removed — no longer needed
}

export function OnboardingOptionButton({
  label,
  subtitle,
  selected = false,
  onPress,
}: OnboardingOptionButtonProps) {
  const checkScale = useSharedValue(0);
  const cardScale = useSharedValue(1);

  useEffect(() => {
    checkScale.value = selected
      ? withSequence(
        withSpring(1.15, { damping: 10, stiffness: 280 }),
        withSpring(1, { damping: 12, stiffness: 300 })
      )
      : withSpring(0, { damping: 15, stiffness: 300 });
  }, [selected]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <Animated.View style={cardStyle}>
      <UniversalLiquidCard
        variant="default"
        style={selected ? { borderColor: Colors.accent, borderWidth: 1.5, backgroundColor: "rgba(34, 197, 94, 0.04)" } : undefined}
      >
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            cardScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          {/* Label */}
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: selected ? Fonts.bold : Fonts.semiBold,
                color: selected ? Colors.primary : "#1F2937",
              }}
            >
              {label}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: Fonts.regular,
                  color: Colors.forest[600],
                  marginTop: 2,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {/* Selection indicator */}
          <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
            {selected ? (
              <Animated.View style={checkStyle}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
              </Animated.View>
            ) : (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.40)",
                }}
              />
            )}
          </View>
        </Pressable>
      </UniversalLiquidCard>
    </Animated.View>
  );
}

export default OnboardingOptionButton;
