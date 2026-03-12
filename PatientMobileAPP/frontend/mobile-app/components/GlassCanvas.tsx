// mobile-app/components/GlassCanvas.tsx
import { useEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Colors } from "../constants/Colors";

const EASE = Easing.inOut(Easing.sin);

export function GlassCanvas() {
  const { width, height } = useWindowDimensions();

  // ── Blob 1: Teal, 520×520, 26s, top-right drift ──
  const b1x = useSharedValue(width * 0.35);
  const b1y = useSharedValue(-height * 0.1);

  // ── Blob 2: Lavender, 420×420, 20s, center-left ellipse ──
  const b2x = useSharedValue(-width * 0.15);
  const b2y = useSharedValue(height * 0.25);

  // ── Blob 3: Gold, 320×320, 16s, bottom orbit ──
  const b3x = useSharedValue(width * 0.2);
  const b3y = useSharedValue(height * 0.6);

  useEffect(() => {
    const dur = (ms: number) => ({ duration: ms, easing: EASE });

    // reverse: true makes Reanimated auto-reverse the sequence — no position snap between cycles
    b1x.value = withRepeat(
      withSequence(withTiming(width * 0.55, dur(13000)), withTiming(width * 0.35, dur(13000))),
      -1, true,
    );
    b1y.value = withRepeat(
      withSequence(withTiming(height * 0.05, dur(13000)), withTiming(-height * 0.1, dur(13000))),
      -1, true,
    );

    b2x.value = withRepeat(
      withSequence(withTiming(width * 0.1, dur(10000)), withTiming(-width * 0.15, dur(10000))),
      -1, true,
    );
    b2y.value = withRepeat(
      withSequence(withTiming(height * 0.45, dur(10000)), withTiming(height * 0.25, dur(10000))),
      -1, true,
    );

    b3x.value = withRepeat(
      withSequence(withTiming(width * 0.5, dur(8000)), withTiming(width * 0.2, dur(8000))),
      -1, true,
    );
    b3y.value = withRepeat(
      withSequence(withTiming(height * 0.72, dur(8000)), withTiming(height * 0.6, dur(8000))),
      -1, true,
    );

    return () => {
      cancelAnimation(b1x); cancelAnimation(b1y);
      cancelAnimation(b2x); cancelAnimation(b2y);
      cancelAnimation(b3x); cancelAnimation(b3y);
    };
  }, [width, height]);

  const b1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: b1x.value }, { translateY: b1y.value }],
  }));
  const b2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: b2x.value }, { translateY: b2y.value }],
  }));
  const b3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: b3x.value }, { translateY: b3y.value }],
  }));

  // Web uses CSS filter:blur; native uses large borderRadius + opacity
  const blurStyle = Platform.OS === "web"
    ? (blurPx: number): Record<string, unknown> => ({
        filter: `blur(${blurPx}px)`,
      })
    : () => ({});

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[Colors.canvas.baseStart, Colors.canvas.baseEnd]}
        style={StyleSheet.absoluteFill}
      />

      {/* Teal blob */}
      <Animated.View
        style={[
          styles.blob,
          { width: 520, height: 520, borderRadius: 260, backgroundColor: Colors.canvas.teal },
          blurStyle(130),
          b1Style,
        ]}
      />

      {/* Lavender blob */}
      <Animated.View
        style={[
          styles.blob,
          { width: 420, height: 420, borderRadius: 210, backgroundColor: Colors.canvas.lavender },
          blurStyle(110),
          b2Style,
        ]}
      />

      {/* Gold blob */}
      <Animated.View
        style={[
          styles.blob,
          { width: 320, height: 320, borderRadius: 160, backgroundColor: Colors.canvas.gold },
          blurStyle(90),
          b3Style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
