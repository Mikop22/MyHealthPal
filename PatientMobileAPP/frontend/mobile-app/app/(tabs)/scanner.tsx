import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  SlideInDown,
} from "react-native-reanimated";
import { AppIcon } from "../../components/AppIcon";
import {
  UniversalCamera,
  type CameraHandle,
} from "../../components/UniversalCamera";
import { UniversalLiquidCard } from "../../components/UniversalLiquidCard";
import { Colors } from "../../constants/Colors";
import { postTranslate, type TranslateResult } from "../../services/api";
import * as ImagePicker from "expo-image-picker";

const BRACKET_SIZE = 52;
const BRACKET_WEIGHT = 3.5;
const FRAME_RATIO = 0.72;

export default function ScannerScreen() {
  const cameraRef = useRef<CameraHandle>(null);
  const { width, height } = useWindowDimensions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  // API state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shutterScale = useSharedValue(1);

  const frameW = width * FRAME_RATIO;
  const frameH = frameW * 1.35;
  const frameTop = (height - frameH) / 2 - 30;
  const frameLeft = (width - frameW) / 2;

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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleCapture(result.assets[0].uri);
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
      {/* ─── Live Camera Feed ─── */}
      <UniversalCamera
        ref={cameraRef}
        onCapture={handleCapture}
        isActive={true}
      />

      {/* ─── Viewfinder Overlay ─── */}
      {!capturedUri && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Instruction */}
          <View style={styles.instructionWrap}>
            <View style={styles.instructionPill}>
              <AppIcon name="scan-outline" size={16} color="#fff" />
              <Text style={styles.instructionText}>
                Align document within frame
              </Text>
            </View>
          </View>

          {/* Bracket: Top-Left */}
          <View
            style={[
              styles.bracket,
              {
                top: frameTop,
                left: frameLeft,
                borderTopWidth: BRACKET_WEIGHT,
                borderLeftWidth: BRACKET_WEIGHT,
              },
            ]}
          />
          {/* Bracket: Top-Right */}
          <View
            style={[
              styles.bracket,
              {
                top: frameTop,
                right: frameLeft,
                borderTopWidth: BRACKET_WEIGHT,
                borderRightWidth: BRACKET_WEIGHT,
              },
            ]}
          />
          {/* Bracket: Bottom-Left */}
          <View
            style={[
              styles.bracket,
              {
                top: frameTop + frameH - BRACKET_SIZE,
                left: frameLeft,
                borderBottomWidth: BRACKET_WEIGHT,
                borderLeftWidth: BRACKET_WEIGHT,
              },
            ]}
          />
          {/* Bracket: Bottom-Right */}
          <View
            style={[
              styles.bracket,
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

      {/* ─── Shutter Button ─── */}
      {!capturedUri && (
        <View style={styles.shutterWrap}>
          {/* Gallery Button */}
          <Pressable onPress={handlePickImage} style={styles.galleryBtn}>
            <AppIcon name="images" size={24} color="#fff" />
          </Pressable>

          <Animated.View style={shutterAnim}>
            <Pressable onPress={handleShutterPress} style={styles.shutterRing}>
              <View style={styles.shutterDisc} />
            </Pressable>
          </Animated.View>

          {/* Spacer to balance the gallery button */}
          <View style={styles.spacerBtn} />
        </View>
      )}

      {/* ─── Results Modal ─── */}
      {capturedUri && (
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          style={styles.modalWrap}
        >
          <UniversalLiquidCard
            variant="elevated"
            style={styles.modalCard}
          >
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* Header row */}
            <View style={styles.headerRow}>
              <AppIcon
                name={error ? "alert-circle" : "checkmark-circle"}
                size={28}
                color={error ? Colors.forest[600] : Colors.accent}
              />
              <Text style={styles.headerTitle}>
                {loading ? "Analyzing…" : error ? "Scan Failed" : "Scan Complete"}
              </Text>
              <Pressable onPress={handleDismiss} style={styles.closeBtn}>
                <AppIcon name="close" size={20} color={Colors.forest[700]} />
              </Pressable>
            </View>

            {/* ─── Loading State ─── */}
            {loading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.loadingText}>
                  MedGemma is reading your document…
                </Text>
              </View>
            )}

            {/* ─── Error State ─── */}
            {error && !loading && (
              <View style={styles.errorWrap}>
                <AppIcon name="alert-circle" size={40} color={Colors.forest[400]} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={handleRetry} style={styles.retryBtn}>
                  <AppIcon name="checkmark" size={18} color="#fff" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* ─── Success State ─── */}
            {result && !loading && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
              >
                {/* Section label */}
                <Text style={styles.sectionLabel}>AI Summary</Text>

                {/* Dynamic bullets */}
                {result.summaryBullets.map((bullet, i) => {
                  const icons = ["medical", "alert-circle", "fitness"] as const;
                  return (
                    <View key={i} style={styles.bulletRow}>
                      <AppIcon
                        name={icons[i % icons.length]}
                        size={20}
                        color={Colors.forest[600]}
                        style={styles.bulletIcon}
                      />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  );
                })}

                {/* ─── Nutritional Swap Accent ─── */}
                <View style={styles.swapCard}>
                  <View style={styles.swapHeader}>
                    <AppIcon name="nutrition" size={22} color="#fff" />
                    <Text style={styles.swapTitle}>Nutritional Swap</Text>
                  </View>
                  <Text style={styles.swapBody}>
                    {result.nutritionalSwap}
                  </Text>
                </View>
              </ScrollView>
            )}
          </UniversalLiquidCard>
        </Animated.View>
      )}
    </View>
  );
}

/* ────────────────────── Styles ────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  /* Instruction pill */
  instructionWrap: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  instructionText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Alignment brackets */
  bracket: {
    position: "absolute",
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: "#FFFFFF",
    borderRadius: 6,
  },

  /* Shutter */
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  spacerBtn: {
    width: 52,
    height: 52,
  },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDisc: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
  },

  /* Results modal */
  modalWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "85%",
  },
  modalCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.forest[300],
    alignSelf: "center",
    marginBottom: 16,
  },

  /* Header */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.primary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.forest[100],
    alignItems: "center",
    justifyContent: "center",
  },

  /* Loading */
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.forest[600],
  },

  /* Error */
  errorWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: Colors.forest[700],
    textAlign: "center",
    paddingHorizontal: 16,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 4,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  /* Scroll */
  scroll: {
    flexGrow: 0,
  },

  /* Bullets */
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.forest[600],
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  bulletIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.forest[800],
  },

  /* Nutritional swap accent */
  swapCard: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
  },
  swapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  swapTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  swapBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.92)",
  },
});
