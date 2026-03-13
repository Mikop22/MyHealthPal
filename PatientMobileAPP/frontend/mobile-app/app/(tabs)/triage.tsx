import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { AppIcon } from "../../components/AppIcon";
import { ClinicMapView, type ClinicPin } from "../../components/MapView";
import { usePatientStore } from "../../store/patientStore";
import { postTriageExtract, type TriageSymptomCard } from "../../services/api";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";

const SCREEN_BG = "#F6F8F6";
const CARD_BG = "#FFFFFF";
const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";
const TEXT_TERTIARY = "#98A2B3";
const SURFACE_LINE = "rgba(15, 23, 42, 0.08)";

const LONDON_CLINICS: ClinicPin[] = [
  {
    name: "London Health Sciences Centre",
    address: "339 Windermere Rd, London, ON",
    latitude: 42.993,
    longitude: -81.271,
    distance: "1.2 km",
  },
  {
    name: "St. Joseph's Health Care",
    address: "268 Grosvenor St, London, ON",
    latitude: 42.988,
    longitude: -81.256,
    distance: "2.8 km",
  },
  {
    name: "Victoria Hospital",
    address: "800 Commissioners Rd E, London, ON",
    latitude: 42.967,
    longitude: -81.222,
    distance: "3.5 km",
  },
];

const PLACEHOLDER_TEXT =
  "e.g. I've been having bad headaches for the past week, especially behind my eyes. I also feel dizzy when I stand up and I'm more tired than usual...";

function SeverityCapsule({
  severity,
  animate,
}: {
  severity: number;
  animate: boolean;
}) {
  const dots = [1, 2, 3, 4, 5];
  const op0 = useSharedValue(0);
  const op1 = useSharedValue(0);
  const op2 = useSharedValue(0);
  const op3 = useSharedValue(0);
  const op4 = useSharedValue(0);
  const opacities = [op0, op1, op2, op3, op4];

  useEffect(() => {
    if (!animate) return;
    opacities.forEach((op, i) => {
      if (i < severity) {
        op.value = withDelay(i * 65, withTiming(1, { duration: 180 }));
      }
    });
  }, [animate]);

  return (
    <View style={styles.capsuleWrap}>
      {dots.map((n, i) => {
        const animStyle = useAnimatedStyle(() => ({
          opacity: n <= severity ? opacities[i].value : 1,
        }));
        return (
          <Animated.View key={n} style={[styles.capsuleSegment, animStyle]}>
            {n <= severity ? (
              <LinearGradient
                colors={["#4ADE80", "#22C55E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View
              style={[
                styles.capsuleSegmentInner,
                n > severity && styles.capsuleSegmentEmpty,
              ]}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

function SurfaceCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.surfaceCard, style]}>{children}</View>;
}

export default function TriageScreen() {
  const { width } = useWindowDimensions();
  const addSymptom = usePatientStore((s) => s.addSymptom);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<TriageSymptomCard[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const translateX = useSharedValue(0);
  const cardIdxRef = useRef(0);
  cardIdxRef.current = cardIdx;

  const handleAnalyze = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;

    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setSymptoms([]);
    setCardIdx(0);

    try {
      const result = await postTriageExtract(trimmed);
      setSymptoms(result.symptoms);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [inputText, loading]);

  const handleReset = useCallback(() => {
    setSymptoms([]);
    setCardIdx(0);
    setError(null);
    setInputText("");
  }, []);

  const triggerHaptic = useCallback(() => {
    try {
      const { Vibration } = require("react-native");
      Vibration.vibrate(40);
    } catch {
      // noop on web
    }
  }, []);

  const onSwipe = useCallback(
    (confirmed: boolean) => {
      const idx = cardIdxRef.current;
      if (idx >= symptoms.length) return;
      const sym = symptoms[idx];
      addSymptom({
        id: sym.id,
        label: sym.label,
        severity: sym.severity,
        confirmed,
      });
      setCardIdx(idx + 1);
      translateX.value = 0;
    },
    [addSymptom, symptoms],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const threshold = width * 0.22;
      if (e.translationX > threshold) {
        translateX.value = withTiming(width, { duration: 250 }, (done) => {
          if (done) {
            runOnJS(triggerHaptic)();
            runOnJS(onSwipe)(true);
          }
        });
      } else if (e.translationX < -threshold) {
        translateX.value = withTiming(-width, { duration: 250 }, (done) => {
          if (done) {
            runOnJS(triggerHaptic)();
            runOnJS(onSwipe)(false);
          }
        });
      } else {
        translateX.value = withSpring(0, { damping: 16, stiffness: 200 });
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-width, 0, width],
          [-12, 0, 12],
        )}deg`,
      },
    ],
  }));

  const confirmLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, width * 0.22],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const dismissLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-width * 0.22, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const visibleSymptoms = symptoms.slice(cardIdx, cardIdx + 3);
  const allReviewed = symptoms.length > 0 && cardIdx >= symptoms.length;
  const hasCards = symptoms.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.heroTitle}>Describe Your Symptoms</Text>
          <Text style={styles.heroSub}>
            Tell us how you're feeling in your own words
          </Text>

          <SurfaceCard style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              placeholder={PLACEHOLDER_TEXT}
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={inputText}
              onChangeText={setInputText}
              editable={!loading && !hasCards}
            />
          </SurfaceCard>

          {!hasCards && !loading && (
            <Pressable
              onPress={handleAnalyze}
              style={[
                styles.primaryBtn,
                !inputText.trim() && styles.primaryBtnDisabled,
              ]}
              disabled={!inputText.trim()}
            >
              <LinearGradient
                colors={inputText.trim() ? [Colors.brandLight, Colors.brand] : ["rgba(200, 230, 210, 0.4)", "rgba(200, 230, 210, 0.4)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.analyzeBtnGradient}
              >
                <AppIcon name="sparkles" size={20} color={inputText.trim() ? "#fff" : Colors.text.muted} />
                <Text style={[styles.analyzeBtnText, !inputText.trim() && styles.analyzeBtnTextDisabled]}>
                  Analyze with MedGemma
                </Text>
              </LinearGradient>
            </Pressable>
          )}

          {hasCards && (
            <Pressable onPress={handleReset} style={styles.resetBtn}>
              <AppIcon name="refresh" size={16} color={Colors.text.secondary} />
              <Text style={styles.resetBtnText}>Start over</Text>
            </Pressable>
          )}

          {loading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.brand} />
              <Text style={styles.loadingText}>MedGemma is analyzing your symptoms…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.errorWrap}>
              <AppIcon name="alert-circle" size={32} color={Colors.semantic.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={handleAnalyze} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </SurfaceCard>
          )}
        </View>

        {hasCards && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Symptom Confirmation</Text>
            <Text style={styles.sectionSub}>
              Swipe right to confirm | left to dismiss
            </Text>

            <View style={styles.deckWrap}>
              {!allReviewed ? (
                visibleSymptoms.map((sym, i) => {
                  const isTop = i === 0;
                  const stackOffset = i;

                  const cardEl = (
                    <Animated.View
                      key={sym.id}
                      style={[
                        styles.deckCard,
                        {
                          zIndex: visibleSymptoms.length - i,
                          transform: isTop
                            ? undefined
                            : [
                                { scale: 1 - stackOffset * 0.045 },
                                { translateY: stackOffset * 10 },
                              ],
                        },
                        isTop && cardAnimStyle,
                      ]}
                    >
                      {isTop && (
                        <>
                          <Animated.View
                            style={[
                              styles.swipeBadge,
                              styles.confirmBadge,
                              confirmLabelStyle,
                            ]}
                          >
                            <AppIcon
                              name="checkmark-circle"
                              size={18}
                              color="#fff"
                            />
                            <Text style={styles.swipeBadgeText}>CONFIRM</Text>
                          </Animated.View>
                          <Animated.View
                            style={[
                              styles.swipeBadge,
                              styles.dismissBadge,
                              dismissLabelStyle,
                            ]}
                          >
                            <AppIcon
                              name="close-circle"
                              size={18}
                              color="#fff"
                            />
                            <Text style={styles.swipeBadgeText}>DISMISS</Text>
                          </Animated.View>
                        </>
                      )}

                      <SurfaceCard
                        style={[styles.symptomCard, isTop && styles.topSymptomCard]}
                      >
                        <View style={styles.symptomInner}>
                          <View style={styles.symptomTopRow}>
                            <View style={styles.severityBadge}>
                              <Text style={styles.severityNum}>{sym.severity}</Text>
                            </View>
                            <Text style={styles.severityLabel}>
                              Severity {sym.severity}/5
                            </Text>
                          </View>
                          <Text style={styles.symptomLabel}>{sym.label}</Text>
                          {sym.explanation ? (
                            <Text style={styles.symptomExplanation}>
                              {sym.explanation}
                            </Text>
                          ) : null}
                          <SeverityCapsule
                            severity={sym.severity}
                            animate={isTop}
                          />
                        </View>
                      </SurfaceCard>
                    </Animated.View>
                  );

                  if (isTop) {
                    return (
                      <GestureDetector key={sym.id} gesture={panGesture}>
                        {cardEl}
                      </GestureDetector>
                    );
                  }
                  return cardEl;
                })
              ) : (
                <SurfaceCard style={styles.doneCard}>
                  <View style={styles.doneInner}>
                    <AppIcon name="checkmark-done-circle" size={44} color={Colors.semantic.success} />
                    <Text style={styles.doneTitle}>All Symptoms Reviewed</Text>
                    <Text style={styles.doneSub}>
                      {symptoms.length} symptoms processed and saved
                    </Text>
                  </View>
                </SurfaceCard>
              )}
            </View>

            {!allReviewed && (
              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    onSwipe(false);
                  }}
                  style={[styles.secondaryBtn, styles.actionBtn]}
                >
                  <LinearGradient
                    colors={["rgba(240, 253, 244, 0.4)", "rgba(220, 252, 231, 0.2)"]}
                    style={[styles.actionBtnGradient, styles.dismissBtnBorder]}
                  >
                    <AppIcon name="close" size={20} color={Colors.text.secondary} />
                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    onSwipe(true);
                  }}
                  style={[styles.primaryBtn, styles.actionBtn]}
                >
                  <AppIcon name="checkmark" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Confirm</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearest Clinics</Text>
          <Text style={styles.sectionSub}>London, Ontario</Text>

          <View style={styles.mapShell}>
            <View style={styles.mapContainer}>
              <ClinicMapView clinics={LONDON_CLINICS} height={220} />
            </View>
          </View>

          {LONDON_CLINICS.map((clinic) => (
            <Pressable key={clinic.name} style={styles.clinicCard}>
              <View style={styles.clinicRow}>
                <LinearGradient
                  colors={["rgba(74,222,128,0.25)", "rgba(34,197,94,0.12)"]}
                  style={styles.clinicIconPill}
                >
                  <AppIcon name="location" size={20} color={Colors.brand} />
                </LinearGradient>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  <Text style={styles.clinicAddr}>{clinic.address}</Text>
                </View>
                <View style={styles.distBadge}>
                  <Text style={styles.distText}>{clinic.distance}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 96,
  },
  section: {
    marginBottom: 36,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginBottom: 18,
  },
  surfaceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  inputCard: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text.primary,
    padding: 12,
    minHeight: 120,
    fontFamily: Fonts.regular,
  },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: TEXT_PRIMARY,
  },
  analyzeBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  analyzeBtnTextDisabled: { color: Colors.text.muted },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  resetBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: TEXT_SECONDARY,
  },
  feedbackCard: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 26,
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: TEXT_SECONDARY,
    textAlign: "center",
  },
  errorIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontFamily: Fonts.regular,
    textAlign: "center",
    lineHeight: 21,
  },
  resetBtnText: { fontSize: 14, fontWeight: "600", color: Colors.text.secondary },

  /* ── Loading ── */
  loadingWrap: { alignItems: "center", paddingVertical: 32, gap: 14 },
  loadingText: { fontSize: 15, fontWeight: "500", color: Colors.text.muted },

  /* ── Error ── */
  errorWrap: { alignItems: "center", paddingVertical: 24, gap: 10 },
  errorText: { fontSize: 14, color: Colors.text.body, textAlign: "center", paddingHorizontal: 16 },
  retryBtn: {
    backgroundColor: Colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  deckWrap: {
    height: 236,
    marginBottom: 14,
  },
  deckCard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  symptomCard: {
    minHeight: 210,
  },
  topSymptomCard: {
    shadowOpacity: 0.07,
  },
  symptomInner: {
    padding: 22,
  },
  symptomTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  severityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  severityNum: { color: "#fff", fontWeight: "800", fontSize: 15 },
  severityLabel: { fontSize: 13, fontWeight: "600", color: Colors.text.muted },
  symptomLabel: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  symptomExplanation: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  capsuleSegment: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(200, 230, 210, 0.4)",
  },
  capsuleSegmentInner: { flex: 1 },
  capsuleSegmentEmpty: { backgroundColor: "rgba(200, 230, 210, 0.4)" },

  /* Swipe overlays */
  swipeBadge: {
    position: "absolute",
    top: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  confirmBadge: { right: 16, backgroundColor: Colors.brand },
  dismissBadge: { left: 16, backgroundColor: Colors.text.secondary },
  swipeBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },

  /* Button fallbacks */
  btnRow: { flexDirection: "row", gap: 12, justifyContent: "center" },
  actionBtn: { flex: 1, borderRadius: 16, overflow: "hidden" },
  actionBtnGradient: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  actionBtn: {
    flex: 1,
  },
  doneCard: {
    minHeight: 212,
    justifyContent: "center",
  },
  doneInner: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  doneIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  doneTitle: {
    fontSize: 19,
    fontFamily: Fonts.bold,
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  doneSub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    textAlign: "center",
  },
  mapShell: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 8,
    marginBottom: 14,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  mapContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  clinicCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  dismissBtnBorder: { borderWidth: 1.5, borderColor: "rgba(0,0,0,0.1)" },
  dismissBtnText: { fontSize: 15, fontWeight: "700", color: Colors.text.secondary },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  /* Done state */
  doneCard: { padding: 0 },
  doneCardAccent: { borderWidth: 1.5, borderColor: "rgba(0, 0, 0, 0.15)" },
  doneInner: { alignItems: "center", padding: 32 },
  doneTitle: { fontSize: 18, fontWeight: "700", color: Colors.text.primary, marginTop: 12 },
  doneSub: { fontSize: 14, color: Colors.text.muted, marginTop: 4 },

  /* ── Clinics ── */
  mapContainer: { marginBottom: 14, borderRadius: 20, overflow: "hidden" },
  clinicCard: { marginBottom: 10, padding: 0 },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  clinicIconPill: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(68, 173, 79, 0.2)",
  },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: 15, fontWeight: "600", color: Colors.text.primary },
  clinicAddr: { fontSize: 13, color: Colors.text.muted, marginTop: 2 },
  distBadge: {
    backgroundColor: "rgba(68, 173, 79, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  distText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.accent,
  },
  distText: { fontSize: 12, fontWeight: "700", color: Colors.brand },
});
