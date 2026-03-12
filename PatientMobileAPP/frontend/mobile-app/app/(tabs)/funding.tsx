import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Rect } from "react-native-svg";
import { AppIcon } from "../../components/AppIcon";
import { UniversalLiquidCard } from "../../components/UniversalLiquidCard";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";

const GOAL = 2000;
const INITIAL_RAISED = 1240;

const MOCK_DONORS = [
  { id: "d1", amount: 50, timeAgo: "2 h ago" },
  { id: "d2", amount: 25, timeAgo: "5 h ago" },
  { id: "d3", amount: 100, timeAgo: "1 d ago" },
  { id: "d4", amount: 15, timeAgo: "2 d ago" },
  { id: "d5", amount: 75, timeAgo: "3 d ago" },
];

/* ───────── Deterministic QR Code ───────── */

const QR_N = 21;

function qrModule(r: number, c: number): boolean {
  const inBox = (br: number, bc: number) => {
    const lr = r - br;
    const lc = c - bc;
    if (lr < 0 || lr > 6 || lc < 0 || lc > 6) return null;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };
  const tl = inBox(0, 0);
  if (tl !== null) return tl;
  const tr = inBox(0, QR_N - 7);
  if (tr !== null) return tr;
  const bl = inBox(QR_N - 7, 0);
  if (bl !== null) return bl;
  if (r === 7 || c === 7) return false;
  return Math.sin(r * 31 + c * 37 + 7) > -0.15;
}

function MockQRCode({ size = 160 }: { size?: number }) {
  const mod = size / QR_N;
  const cells = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let r = 0; r < QR_N; r++)
      for (let c = 0; c < QR_N; c++)
        if (qrModule(r, c)) out.push({ x: c * mod, y: r * mod });
    return out;
  }, [mod]);

  return (
    <Svg width={size} height={size}>
      {cells.map((p, i) => (
        <Rect
          key={i}
          x={p.x}
          y={p.y}
          width={mod}
          height={mod}
          fill={Colors.primary}
        />
      ))}
    </Svg>
  );
}

/* ── Animated count-up text ── */
function CountUpText({
  value,
  prefix = "",
  style,
}: {
  value: number;
  prefix?: string;
  style?: object;
}) {
  const anim = useSharedValue(0);
  const prevRef = useRef(0);

  useEffect(() => {
    anim.value = prevRef.current;
    anim.value = withTiming(value, { duration: 700, easing: Easing.out(Easing.cubic) });
    prevRef.current = value;
  }, [value]);

  // Use derived value + JS state for display
  const [display, setDisplay] = useState(value);
  const derived = useDerivedValue(() => Math.round(anim.value));

  useEffect(() => {
    const id = setInterval(() => {
      setDisplay(derived.value);
    }, 16);
    return () => clearInterval(id);
  }, []);

  return <Text style={style}>{prefix}{display.toLocaleString()}</Text>;
}

/* ── Gradient shimmer progress bar ── */
function ShimmerBar({
  progress,
  height = 14,
  onLayout,
  barWidth,
}: {
  progress: SharedValue<number>;
  height?: number;
  onLayout?: (w: number) => void;
  barWidth: number;
}) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    width: progress.value * barWidth,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    left: shimmer.value * (barWidth * (progress.value || 0) - 60),
    opacity: shimmer.value < 0.85 ? shimmer.value * 0.5 : (1 - shimmer.value) * 4,
  }));

  return (
    <View
      style={[styles.barTrack, { height }]}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[StyleSheet.absoluteFill, fillStyle, { overflow: "hidden" }]}>
        <LinearGradient
          colors={["#4ADE80", "#22C55E", "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Shimmer strip */}
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
      </Animated.View>

      {/* 50% milestone marker */}
      <View style={[styles.milestone, { left: `50%` as any }]}>
        <View style={styles.milestoneTick} />
      </View>
    </View>
  );
}

/* ───────── Screen ───────── */

export default function FundingScreen() {
  const [raised, setRaised] = useState(INITIAL_RAISED);
  const [barWidth, setBarWidth] = useState(0);
  const progress = useSharedValue(INITIAL_RAISED / GOAL);
  const isFunded = raised >= GOAL;

  useEffect(() => {
    progress.value = withTiming(Math.min(raised / GOAL, 1), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [raised]);

  const simulateDonation = useCallback(() => {
    const amounts = [25, 50, 75, 100, 150, 200];
    const add = amounts[Math.floor(Math.random() * amounts.length)];
    setRaised((prev) => Math.min(prev + add, GOAL));
  }, []);

  const fillToGoal = useCallback(() => setRaised(GOAL), []);

  const pct = Math.min(Math.round((raised / GOAL) * 100), 100);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeaderRow}>
          <Text style={styles.pageHeaderTitle}>Active Campaigns</Text>
          <Pressable style={styles.createCampaignBtn}>
            <AppIcon name="add" size={14} color="#fff" />
            <Text style={styles.createCampaignBtnText}>Create</Text>
          </Pressable>
        </View>

        {/* ── Campaign Card ── */}
        <UniversalLiquidCard variant="elevated" style={styles.campaignCard}>
          {/* Gradient capsule icon */}
          <View style={styles.campaignHeader}>
            <LinearGradient
              colors={["rgba(74,222,128,0.3)", "rgba(22,163,74,0.2)"]}
              style={styles.campaignIconCapsule}
            >
              <AppIcon name="medical" size={24} color={Colors.accent} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.campaignTitle}>MRI Diagnostic Imaging</Text>
              <Text style={styles.campaignSub}>
                Pelvic MRI to evaluate suspected endometriosis
              </Text>
            </View>
          </View>

          {/* Gradient shimmer progress bar */}
          <ShimmerBar
            progress={progress}
            barWidth={barWidth}
            onLayout={setBarWidth}
            height={14}
          />

          <View style={styles.barMeta}>
            <Text style={styles.barAmount}>
              <CountUpText
                value={raised}
                prefix="$"
                style={styles.barRaised}
              />{" "}
              of ${GOAL.toLocaleString()}
            </Text>
            <Text style={styles.barPct}>{pct}%</Text>
          </View>

          {!isFunded && (
            <View style={styles.btnRow}>
              <Pressable onPress={simulateDonation} style={styles.donateBtn}>
                <AppIcon name="heart" size={18} color="#fff" />
                <Text style={styles.donateBtnText}>Simulate Donation</Text>
              </Pressable>
              <Pressable onPress={fillToGoal} style={styles.fillBtn}>
                <Text style={styles.fillBtnText}>Fill to 100%</Text>
              </Pressable>
            </View>
          )}
        </UniversalLiquidCard>

        {/* ── Recent Donors ── */}
        <UniversalLiquidCard variant="default" style={styles.donorsCard}>
          <Text style={styles.sectionLabel}>RECENT DONORS</Text>
          {MOCK_DONORS.map((d) => (
            <View key={d.id} style={styles.donorRow}>
              <View style={styles.donorAvatar}>
                <AppIcon name="person" size={16} color={Colors.forest[500]} />
              </View>
              <Text style={styles.donorName}>Anonymous</Text>
              <Text style={styles.donorAmount}>${d.amount}</Text>
              <Text style={styles.donorTime}>{d.timeAgo}</Text>
            </View>
          ))}
        </UniversalLiquidCard>

        {/* ── QR Code (visible when fully funded) ── */}
        {isFunded && (
          <Animated.View entering={FadeIn.duration(600)}>
            <UniversalLiquidCard variant="active" style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <AppIcon name="shield-checkmark" size={22} color={Colors.accent} />
                <Text style={styles.qrTitle}>Secure Payment Code</Text>
              </View>
              <Text style={styles.qrSub}>
                Present this QR code at the imaging centre to redeem your funded
                diagnostic.
              </Text>

              <View style={styles.qrFrame}>
                <MockQRCode size={180} />
              </View>

              <Text style={styles.qrRef}>REF: MHP-2026-4821-ENDO</Text>
            </UniversalLiquidCard>
          </Animated.View>
        )}
      </ScrollView>
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },

  /* Header */
  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 8,
  },
  pageHeaderTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  createCampaignBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  createCampaignBtnText: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 13,
  },

  /* Campaign */
  campaignCard: { padding: 24, marginBottom: 14 },
  campaignHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  campaignIconCapsule: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  campaignTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.primary },
  campaignSub: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.forest[600], marginTop: 2 },

  /* Progress bar */
  barTrack: {
    borderRadius: 7,
    backgroundColor: Colors.forest[50],
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 4,
  },
  milestone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    width: 2,
    marginLeft: -1,
  },
  milestoneTick: {
    width: 2,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 1,
  },

  barMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  barAmount: { fontSize: 14, color: Colors.forest[600] },
  barRaised: { fontWeight: "700", color: Colors.primary },
  barPct: { fontSize: 14, fontWeight: "700", color: Colors.accent },

  /* Buttons */
  btnRow: { flexDirection: "row", gap: 10 },
  donateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 16,
  },
  donateBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  fillBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.forest[100],
    justifyContent: "center",
  },
  fillBtnText: { fontSize: 14, fontWeight: "600", color: Colors.forest[700] },

  /* Donors */
  donorsCard: { padding: 20, marginBottom: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.forest[600],
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  donorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  donorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.forest[50],
    alignItems: "center",
    justifyContent: "center",
  },
  donorName: { flex: 1, fontSize: 14, fontWeight: "500", color: Colors.forest[800] },
  donorAmount: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  donorTime: { fontSize: 12, color: Colors.forest[500], width: 52, textAlign: "right" },

  /* QR Code */
  qrCard: { padding: 24, alignItems: "center" },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
    width: "100%",
  },
  qrTitle: { fontSize: 18, fontWeight: "700", color: Colors.primary },
  qrSub: {
    fontSize: 14,
    color: Colors.forest[600],
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    width: "100%",
  },
  qrFrame: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.forest[200],
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qrRef: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.forest[400],
    letterSpacing: 1.5,
  },
});
