import { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { LogoBreathing } from "../components/LogoBreathing";
import { Fonts } from "../constants/Typography";
import { usePatientStore } from "../store/patientStore";

const SCREEN_BG = "#F6F8F6";
const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";

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
    <View style={styles.container}>
      <LogoBreathing watermark size={width * 0.7} style={{ top: "14%" }} />

      <View style={styles.logoHalo} />
      <LogoBreathing size={108} />

      <Animated.View style={[titleStyle, styles.titleWrap]}>
        <Text style={styles.title}>MyHealthPal</Text>
      </Animated.View>

      <Animated.View style={[subtitleStyle, styles.subtitleCard]}>
        <Text style={styles.subtitle}>
          Your biometrics, your story, your proof.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 24,
  },
  logoHalo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  titleWrap: {
    marginTop: 28,
  },
  title: {
    fontSize: 34,
    fontFamily: Fonts.bold,
    color: TEXT_PRIMARY,
    textAlign: "center",
    letterSpacing: -0.8,
  },
  subtitleCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 28,
    elevation: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
  },
});
