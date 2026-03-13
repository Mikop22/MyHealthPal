import React, { useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { AppIcon } from "../../components/AppIcon";
import {
  UniversalCamera,
  type CameraHandle,
} from "../../components/UniversalCamera";
import { postTranslate, type TranslateResult } from "../../services/api";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";

const BRACKET_SIZE = 52;
const BRACKET_WEIGHT = 3.5;
const FRAME_RATIO = 0.72;

const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";
const DARK_OVERLAY = "rgba(4, 8, 15, 0.44)";

export default function ScannerScreen() {
  const cameraRef = useRef<CameraHandle>(null);
  const { width, height } = useWindowDimensions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shutterScale = useSharedValue(1);

  const frameW = Math.round(width * FRAME_RATIO);
  const frameH = Math.round(frameW * 1.35);
  const frameTop = Math.round((height - frameH) / 2 - 30);
  const frameLeft = Math.round((width - frameW) / 2);

  const handleCapture = useCallback(async (uri: string) => {
    setCapturedUri(uri);
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await postTranslate(uri);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleShutterPress = useCallback(() => {
    shutterScale.value = withSpring(0.82, { damping: 10, stiffness: 400 });
    setTimeout(() => {
      shutterScale.value = withSpring(1, { damping: 14, stiffness: 300 });
    }, 120);
    cameraRef.current?.capture();
  }, []);

  const handlePickImage = useCallback(async () => {
    try {
      const resultPicker = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (
        !resultPicker.canceled &&
        resultPicker.assets &&
        resultPicker.assets.length > 0
      ) {
        handleCapture(resultPicker.assets[0].uri);
      }
    } catch (e) {
      console.log("Image picker error:", e);
    }
  }, [handleCapture]);

  const handleDismiss = useCallback(() => {
    setCapturedUri(null);
    setResult(null);
    setError(null);
  }, []);

  const handleRetry = useCallback(() => {
    if (capturedUri) handleCapture(capturedUri);
  }, [capturedUri, handleCapture]);

  const shutterAnim = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  return (
    <View style={styles.container}>
      <UniversalCamera
        ref={cameraRef}
        onCapture={handleCapture}
        isActive={true}
      />

      {!capturedUri && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.instructionWrap}>
            <View style={styles.instructionPill}>
              <AppIcon name="scan-outline" size={16} color="#FFFFFF" />
              <Text style={styles.instructionText}>
                Align document within frame
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.bracket,
              styles.bracketTopLeft,
              {
                top: frameTop,
                left: frameLeft,
                borderTopWidth: BRACKET_WEIGHT,
                borderLeftWidth: BRACKET_WEIGHT,
              },
            ]}
          />
          <View
            style={[
              styles.bracket,
              styles.bracketTopRight,
              {
                top: frameTop,
                right: frameLeft,
                borderTopWidth: BRACKET_WEIGHT,
                borderRightWidth: BRACKET_WEIGHT,
              },
            ]}
          />
          <View
            style={[
              styles.bracket,
              styles.bracketBottomLeft,
              {
                top: frameTop + frameH - BRACKET_SIZE,
                left: frameLeft,
                borderBottomWidth: BRACKET_WEIGHT,
                borderLeftWidth: BRACKET_WEIGHT,
              },
            ]}
          />
          <View
            style={[
              styles.bracket,
              styles.bracketBottomRight,
              {
                top: frameTop + frameH - BRACKET_SIZE,
                right: frameLeft,
                borderBottomWidth: BRACKET_WEIGHT,
                borderRightWidth: BRACKET_WEIGHT,
              },
            ]}
          />
        </View>
      )}

      {!capturedUri && (
        <View style={styles.shutterWrap}>
          <Pressable onPress={handlePickImage} style={styles.galleryBtn}>
            <AppIcon name="images" size={22} color="#FFFFFF" />
          </Pressable>

          <Animated.View style={shutterAnim}>
            <Pressable onPress={handleShutterPress} style={styles.shutterRing}>
              <View style={styles.shutterDisc} />
            </Pressable>
          </Animated.View>

          <View style={styles.spacerBtn} />
        </View>
      )}

      {capturedUri && (
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          style={styles.modalWrap}
        >
          <View style={styles.modalCard}>
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <AppIcon
                name={error ? "alert-circle" : "checkmark-circle"}
                size={28}
                color={error ? Colors.text.secondary : Colors.brand}
              />
              <Text style={styles.headerTitle}>
                {loading ? "Analyzing..." : error ? "Scan Failed" : "Scan Complete"}
              </Text>
              <Pressable onPress={handleDismiss} style={styles.closeBtn}>
                <AppIcon name="close" size={20} color={Colors.text.secondary} />
              </Pressable>
            </View>

            {loading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.brand} />
                <Text style={styles.loadingText}>
                  MedGemma is reading your document...
                </Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.errorWrap}>
                <AppIcon name="alert-circle" size={40} color={Colors.text.muted} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={handleRetry} style={styles.retryBtn}>
                  <AppIcon name="refresh" size={16} color="#fff" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {result && !loading && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
              >
                <Text style={styles.sectionLabel}>AI SUMMARY</Text>

                {result.summaryBullets.map((bullet, i) => {
                  const icons = ["medical", "alert-circle", "fitness"] as const;
                  return (
                    <View key={i} style={styles.bulletRow}>
                      <AppIcon
                        name={icons[i % icons.length]}
                        size={20}
                        color={Colors.text.secondary}
                        style={styles.bulletIcon}
                      />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  );
                })}

                <View style={styles.swapCard}>
                  <View style={styles.swapHeader}>
                    <AppIcon name="nutrition" size={20} color="#fff" />
                    <Text style={styles.swapTitle}>Nutritional Swap</Text>
                  </View>
                  <Text style={styles.swapBody}>{result.nutritionalSwap}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  instructionWrap: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionPill: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DARK_OVERLAY,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  instructionText: {
    color: "rgba(255,255,255,0.96)",
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  bracket: {
    position: "absolute",
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  bracketTopLeft: {
    borderTopLeftRadius: 10,
  },
  bracketTopRight: {
    borderTopRightRadius: 10,
  },
  bracketBottomLeft: {
    borderBottomLeftRadius: 10,
  },
  bracketBottomRight: {
    borderBottomRightRadius: 10,
  },
  shutterWrap: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 40,
  },
  galleryBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: DARK_OVERLAY,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  spacerBtn: {
    width: 54,
    height: 54,
  },
  shutterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  shutterDisc: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
  },
  modalWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "86%",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(200, 230, 210, 0.5)",
    alignSelf: "center",
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(200, 230, 210, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text.secondary,
  },
  errorWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 14,
  },
  errorText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
  scroll: {
    flexGrow: 0,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  bulletIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F4F7F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.primary,
  },
  swapCard: {
    backgroundColor: Colors.brand,
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  swapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  swapTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  swapBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.94)",
    fontFamily: Fonts.regular,
  },
});
