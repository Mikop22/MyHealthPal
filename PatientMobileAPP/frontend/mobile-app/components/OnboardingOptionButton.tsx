import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Typography";

const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";

interface OnboardingOptionButtonProps {
  label: string;
  subtitle?: string;
  selected?: boolean;
  onPress: () => void;
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
          withSpring(1, { damping: 12, stiffness: 300 }),
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
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          cardScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        style={[styles.card, selected && styles.cardSelected]}
      >
        <View style={styles.contentWrap}>
          <View style={styles.textWrap}>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {label}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : null}
          </View>

          <View style={styles.iconWrap}>
            {selected ? (
              <Animated.View style={checkStyle}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={Colors.accent}
                />
              </Animated.View>
            ) : (
              <View style={styles.idleDot} />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  contentWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  textWrap: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  labelSelected: {
    fontFamily: Fonts.bold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    marginTop: 3,
    lineHeight: 18,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  idleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E4E7EC",
  },
});

export default OnboardingOptionButton;
