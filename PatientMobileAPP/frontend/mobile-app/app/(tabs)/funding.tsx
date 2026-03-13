import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
  useDerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Rect } from "react-native-svg";
import { AppIcon } from "../../components/AppIcon";
import { UniversalLiquidCard } from "../../components/UniversalLiquidCard";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { usePatientStore } from "../../store/patientStore";

const GOAL = 2000;
const INITIAL_RAISED = 1240;

const MOCK_DONORS = [
  { id: "d1", initials: "AK", amount: 50, timeAgo: "2 h ago" },
  { id: "d2", initials: "RS", amount: 25, timeAgo: "5 h ago" },
  { id: "d3", initials: "JM", amount: 100, timeAgo: "1 d ago" },
  { id: "d4", initials: "LP", amount: 15, timeAgo: "2 d ago" },
  { id: "d5", initials: "NK", amount: 75, timeAgo: "3 d ago" },
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
  height = 10,
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
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
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
    opacity: shimmer.value < 0.85 ? shimmer.value * 0.35 : (1 - shimmer.value) * 3,
  }));

  return (
    <View
      style={[s.barTrack, { height, borderRadius: height / 2 }]}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[StyleSheet.absoluteFill, fillStyle, { overflow: "hidden", borderRadius: height / 2 }]}>
        <LinearGradient
          colors={["#86EFAC", "#22C55E", "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[s.shimmer, shimmerStyle]} />
      </Animated.View>
    </View>
  );
}

/* ── Profile Avatar ── */
function ProfileAvatar({ size = 72 }: { size?: number }) {
  return (
    <View
      style={[
        s.avatarOuter,
        { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 },
      ]}
    >
      <LinearGradient
        colors={["rgba(134,239,172,0.4)", "rgba(22,163,74,0.15)"]}
        style={[
          s.avatarGradientRing,
          { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 },
        ]}
      />
      <View
        style={[
          s.avatarInner,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <AppIcon name="person" size={size * 0.45} color={Colors.text.muted} />
      </View>
    </View>
  );
}

/* ── Donor avatar with initials ── */
function DonorBadge({ initials }: { initials: string }) {
  return (
    <View style={s.donorAvatar}>
      <Text style={s.donorInitials}>{initials}</Text>
    </View>
  );
}

/* ───────── Screen ───────── */

export default function FundingScreen() {
  const [raised, setRaised] = useState(INITIAL_RAISED);
  const [barWidth, setBarWidth] = useState(0);
  const progress = useSharedValue(INITIAL_RAISED / GOAL);
  const isFunded = raised >= GOAL;
  const hasAnimated = useRef(false);

  const { fundingProfile, setAboutMe, setCaseDescription } = usePatientStore();

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

  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const getFirstTouchEntering = useCallback(
    (index: number) =>
      !hasAnimated.current
        ? FadeInDown.delay((index + 1) * 150)
            .springify()
            .damping(18)
            .stiffness(120)
        : undefined,
    [],
  );

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page Header ── */}
        <Animated.View entering={getFirstTouchEntering(0)} style={s.pageHeaderRow}>
          <View>
            <Text style={s.pageHeaderTitle}>Funding</Text>
            <Text style={s.pageHeaderSub}>Your active campaigns</Text>
          </View>
          <Pressable style={s.createCampaignBtn}>
            <AppIcon name="add" size={14} color="#fff" />
            <Text style={s.createCampaignBtnText}>New</Text>
          </Pressable>
        </Animated.View>

        {/* ── Patient Profile Card ── */}
        <Animated.View entering={getFirstTouchEntering(1)}>
          <UniversalLiquidCard variant="elevated" style={s.profileCard}>
            <View style={s.profileRow}>
              <ProfileAvatar size={68} />
              <View style={s.profileInfo}>
                <Text style={s.profileName}>Your Campaign Profile</Text>
                <Text style={s.profileHint}>
                  Help donors connect with your story
                </Text>
              </View>
            </View>

            {/* About Me */}
            <View style={s.sectionBlock}>
              <View style={s.sectionLabelRow}>
                <AppIcon name="person" size={14} color={Colors.text.muted} />
                <Text style={s.sectionLabel}>ABOUT ME</Text>
              </View>
              <TextInput
                style={s.bioInput}
                placeholder="Share a brief introduction about yourself..."
                placeholderTextColor={Colors.forest[400]}
                multiline
                value={fundingProfile.aboutMe}
                onChangeText={setAboutMe}
                textAlignVertical="top"
              />
            </View>

            {/* Case Description */}
            <View style={s.sectionBlock}>
              <View style={s.sectionLabelRow}>
                <AppIcon name="medical" size={14} color={Colors.text.muted} />
                <Text style={s.sectionLabel}>CASE DESCRIPTION</Text>
              </View>
              <TextInput
                style={[s.bioInput, { minHeight: 100 }]}
                placeholder="Describe your medical situation and why you need funding support..."
                placeholderTextColor={Colors.forest[400]}
                multiline
                value={fundingProfile.caseDescription}
                onChangeText={setCaseDescription}
                textAlignVertical="top"
              />
            </View>
          </UniversalLiquidCard>
        </Animated.View>

        {/* ── Campaign Progress Card ── */}
        <Animated.View entering={getFirstTouchEntering(2)}>
          <UniversalLiquidCard variant="elevated" style={s.campaignCard}>
            <View style={s.campaignHeader}>
              <LinearGradient
                colors={["rgba(134,239,172,0.25)", "rgba(22,163,74,0.12)"]}
                style={s.campaignIconCapsule}
              >
                <AppIcon name="medical" size={22} color={Colors.brand} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.campaignTitle}>MRI Diagnostic Imaging</Text>
                <Text style={s.campaignSub}>
                  Pelvic MRI · Suspected endometriosis
                </Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statItem}>
                <CountUpText value={raised} prefix="$" style={s.statValue} />
                <Text style={s.statCaption}>raised</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>${GOAL.toLocaleString()}</Text>
                <Text style={s.statCaption}>goal</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{pct}%</Text>
                <Text style={s.statCaption}>funded</Text>
              </View>
            </View>

            <ShimmerBar
              progress={progress}
              barWidth={barWidth}
              onLayout={setBarWidth}
              height={10}
            />

            {!isFunded && (
              <View style={s.btnRow}>
                <Pressable onPress={simulateDonation} style={s.donateBtn}>
                  <AppIcon name="heart" size={16} color="#fff" />
                  <Text style={s.donateBtnText}>Simulate Donation</Text>
                </Pressable>
                <Pressable onPress={fillToGoal} style={s.fillBtn}>
                  <Text style={s.fillBtnText}>Fill 100%</Text>
                </Pressable>
              </View>
            )}
          </UniversalLiquidCard>
        </Animated.View>

        {/* ── Recent Donors ── */}
        <Animated.View entering={getFirstTouchEntering(3)}>
          <UniversalLiquidCard variant="default" style={s.donorsCard}>
            <View style={s.sectionLabelRow}>
              <AppIcon name="heart" size={13} color={Colors.text.muted} />
              <Text style={s.sectionLabel}>RECENT SUPPORTERS</Text>
            </View>
            {MOCK_DONORS.map((d, idx) => (
              <View
                key={d.id}
                style={[
                  s.donorRow,
                  idx === MOCK_DONORS.length - 1 && { marginBottom: 0 },
                ]}
              >
                <DonorBadge initials={d.initials} />
                <View style={{ flex: 1 }}>
                  <Text style={s.donorName}>Anonymous Supporter</Text>
                  <Text style={s.donorTime}>{d.timeAgo}</Text>
                </View>
                <Text style={s.donorAmount}>+${d.amount}</Text>
              </View>
            ))}
          </UniversalLiquidCard>
        </Animated.View>

        {/* ── QR Code (visible when fully funded) ── */}
        {isFunded && (
          <Animated.View
            entering={
              !hasAnimated.current
                ? FadeInDown.delay(750)
                    .springify()
                    .damping(18)
                    .stiffness(120)
                : undefined
            }
          >
            <UniversalLiquidCard variant="active" style={s.qrCard}>
              <View style={s.qrTitleRow}>
                <View style={s.qrBadge}>
                  <AppIcon name="shield-checkmark" size={18} color="#fff" />
                </View>
                <Text style={s.qrTitle}>Fully Funded</Text>
              </View>
              <Text style={s.qrSub}>
                Present this QR code at the imaging centre to redeem your funded diagnostic.
              </Text>
              <View style={s.qrFrame}>
                <MockQRCode size={170} />
              </View>
              <Text style={s.qrRef}>REF: MHP-2026-4821-ENDO</Text>
            </UniversalLiquidCard>
          </Animated.View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },

  /* ── Header ── */
  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 4,
  },
  pageHeaderTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  pageHeaderSub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  createCampaignBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  createCampaignBtnText: {
    color: "#fff",
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },

  /* ── Profile Card ── */
  profileCard: { padding: 28, marginBottom: 16 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 24,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  profileHint: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 3,
    letterSpacing: 0.1,
  },

  /* ── Avatar ── */
  avatarOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGradientRing: {
    position: "absolute",
  },
  avatarInner: {
    backgroundColor: "rgba(68, 173, 79, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
  },

  /* ── Sections ── */
  sectionBlock: { marginBottom: 20 },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.text.muted,
    letterSpacing: 1.4,
  },
  bioInput: {
    backgroundColor: "rgba(240, 253, 244, 0.5)",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(187, 247, 208, 0.4)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.text.primary,
    lineHeight: 22,
    minHeight: 72,
  },

  /* ── Campaign ── */
  campaignCard: { padding: 28, marginBottom: 16 },
  campaignHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  campaignIconCapsule: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(134,239,172,0.3)",
  },
  campaignTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  campaignSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 3,
    letterSpacing: 0.1,
  },

  /* ── Stats Row ── */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(240, 253, 244, 0.35)",
    borderRadius: 16,
  },
  statItem: { alignItems: "center" },
  statValue: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  statCaption: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.text.muted,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 32,
    backgroundColor: "rgba(187, 247, 208, 0.5)",
  },

  /* ── Progress bar ── */
  barTrack: {
    backgroundColor: "rgba(240, 253, 244, 0.6)",
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 4,
  },

  /* ── Buttons ── */
  btnRow: { flexDirection: "row", gap: 10 },
  donateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  donateBtnText: {
    color: "#fff",
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
  fillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "rgba(240, 253, 244, 0.6)",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(187, 247, 208, 0.5)",
    justifyContent: "center",
  },
  fillBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.text.secondary,
    letterSpacing: 0.1,
  },

  /* ── Donors ── */
  donorsCard: { padding: 28, marginBottom: 16 },
  donorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(187, 247, 208, 0.3)",
  },
  donorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(240, 253, 244, 0.7)",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(187, 247, 208, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  donorInitials: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.text.secondary,
    letterSpacing: 0.5,
  },
  donorName: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.text.primary,
    letterSpacing: 0.1,
  },
  donorAmount: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.brand,
    letterSpacing: -0.2,
  },
  donorTime: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 1,
    letterSpacing: 0.2,
  },

  /* ── QR Code ── */
  qrCard: { padding: 32, alignItems: "center" },
  qrTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 10,
    marginBottom: 10,
  },
  qrBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  qrTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  qrSub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 8,
    letterSpacing: 0.1,
  },
  qrFrame: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(187, 247, 208, 0.35)",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(22, 101, 52, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  qrRef: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.text.muted,
    letterSpacing: 2,
  },
});
