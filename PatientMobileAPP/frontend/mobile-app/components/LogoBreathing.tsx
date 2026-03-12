import { useEffect } from "react";
import { Image, type ImageSourcePropType, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const DEFAULT_LOGO = require("../assets/icon.png");

interface LogoBreathingProps {
  source?: ImageSourcePropType;
  size?: number;
  /** If true, renders at very low opacity as a background watermark */
  watermark?: boolean;
  style?: ViewStyle;
}

/**
 * Continuously-breathing logo using Reanimated withTiming + withRepeat.
 * Scales between 1.0 ↔ 1.08 on a 4-second ease-in-out loop.
 */
export function LogoBreathing({
  source = DEFAULT_LOGO,
  size = 120,
  watermark = false,
  style,
}: LogoBreathingProps) {
  const breath = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.08 }],
    opacity: watermark ? 0.05 + breath.value * 0.03 : 1,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        watermark && {
          position: "absolute",
          zIndex: 0,
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export default LogoBreathing;
