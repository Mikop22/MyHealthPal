import { useEffect } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { LogoBreathing } from "../components/LogoBreathing";
import { usePatientStore } from "../store/patientStore";

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const hasCompletedOnboarding = usePatientStore(
    (s) => s.demographics.completedAt !== null,
  );

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    titleY.value = withDelay(
      600,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    subtitleOpacity.value = withDelay(
      1200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
    );

    const navigateAway = () => {
      if (hasCompletedOnboarding) {
        router.replace("/(tabs)/scanner");
      } else {
        router.replace("/onboarding");
      }
    };

    const timeout = setTimeout(navigateAway, 2800);
    return () => clearTimeout(timeout);
  }, [hasCompletedOnboarding]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View className="flex-1 items-center justify-center">
      {/* Watermark behind everything */}
      <LogoBreathing watermark size={width * 0.7} style={{ top: "15%" }} />

      {/* Centered breathing logo */}
      <LogoBreathing size={100} />

      <Animated.View style={titleStyle} className="mt-6">
        <Text className="text-3xl font-bold text-primary text-center">
          MyHealthPal
        </Text>
      </Animated.View>

      <Animated.View style={subtitleStyle} className="mt-2 px-10">
        <Text className="text-base text-forest-600 text-center leading-6">
          Your biometrics, your story, your proof.
        </Text>
      </Animated.View>
    </View>
  );
}
