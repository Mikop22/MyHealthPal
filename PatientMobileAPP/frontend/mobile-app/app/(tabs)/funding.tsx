import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  View,
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
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { usePatientStore } from "../../store/patientStore";

const GOAL = 2000;
const INITIAL_RAISED = 1240;

const SCREEN_BG = "#F6F8F6";
const CARD_BG = "#FFFFFF";
const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";
const TEXT_TERTIARY = "#98A2B3";
const DIVIDER = "rgba(15, 23, 42, 0.08)";

const MOCK_DONORS = [
  { id: "d1", initials: "AK", amount: 50, timeAgo: "2 h ago" },
  { id: "d2", initials: "RS", amount: 25, timeAgo: "5 h ago" },
  { id: "d3", initials: "JM", amount: 100, timeAgo: "1 d ago" },
  { id: "d4", initials: "LP", amount: 15, timeAgo: "2 d ago" },
  { id: "d5", initials: "NK", amount: 75, timeAgo: "3 d ago" },
];

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
    for (let r = 0; r < QR_N; r++) {
      for (let c = 0; c < QR_N; c++) {
        if (qrModule(r, c)) out.push({ x: c * mod, y: r * mod });
      }
    }
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
          fill={TEXT_PRIMARY}
        />
      ))}
    </Svg>
  );
}

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
    anim.value = withTiming(value, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
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

  return (
    <Text style={style}>
      {prefix}
      {display.toLocaleString()}
    </Text>
  );
}

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
    opacity:
      shimmer.value < 0.85 ? shimmer.value * 0.35 : (1 - shimmer.value) * 3,
  }));

  return (
    <View
      style={[s.barTrack, { height, borderRadius: height / 2 }]}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          fillStyle,
          { overflow: "hidden", borderRadius: height / 2 },
        ]}
      >
        <LinearGradient
          colors={["#22C55E", "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[s.shimmer, shimmerStyle]} />
      </Animated.View>
    </View>
  );
}

function ProfileAvatar({ size = 72 }: { size?: number }) {
  return (
    <View
      style={[
        s.avatarOuter,
        { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 },
      ]}
    >
      <LinearGradient
        colors={["rgba(134,239,172,0.38)", "rgba(22,163,74,0.12)"]}
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

function DonorBadge({ initials }: { initials: string }) {
  return (
    <View style={s.donorAvatar}>
      <Text style={s.donorInitials}>{initials}</Text>
    </View>
  );
}

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

        <Animated.View entering={getFirstTouchEntering(1)}>
          <View style={s.surfaceCard}>
            <View style={s.profileRow}>
              <ProfileAvatar size={68} />
              <View style={s.profileInfo}>
                <Text style={s.profileName}>Your Campaign Profile</Text>
                <Text style={s.profileHint}>
                  Help donors connect with your story
                </Text>
              </View>
            </View>

            <View style={s.sectionBlock}>
              <View style={s.sectionLabelRow}>
                <AppIcon name="person" size={14} color={Colors.text.muted} />
                <Text style={s.sectionLabel}>ABOUT ME</Text>
              </View>
              <TextInput
                style={s.bioInput}
                placeholder="Share a brief introduction about yourself..."
                placeholderTextColor={TEXT_TERTIARY}
                multiline
                value={fundingProfile.aboutMe}
                onChangeText={setAboutMe}
                textAlignVertical="top"
              />
            </View>

            <View style={s.sectionBlockLast}>
              <View style={s.sectionLabelRow}>
                <AppIcon name="medical" size={14} color={Colors.text.muted} />
                <Text style={s.sectionLabel}>CASE DESCRIPTION</Text>
              </View>
              <TextInput
                style={[s.bioInput, s.caseInput]}
                placeholder="Describe your medical situation and why you need funding support..."
                placeholderTextColor={TEXT_TERTIARY}
                multiline
                value={fundingProfile.caseDescription}
                onChangeText={setCaseDescription}
                textAlignVertical="top"
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={getFirstTouchEntering(2)}>
          <View style={s.surfaceCard}>
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
                  Pelvic MRI | Suspected endometriosis
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
                <Text style={[s.statValue, s.statValueAccent]}>{pct}%</Text>
                <Text style={s.statCaption}>funded</Text>
              </View>
            </View>

            <ShimmerBar
              progress={progress}
              barWidth={barWidth}
              onLayout={setBarWidth}
              height={6}
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
          </View>
        </Animated.View>

        <Animated.View entering={getFirstTouchEntering(3)}>
          <View style={s.surfaceCard}>
            <View style={s.sectionLabelRow}>
              <AppIcon name="heart" size={13} color={Colors.text.muted} />
              <Text style={s.sectionLabel}>RECENT SUPPORTERS</Text>
            </View>
            {MOCK_DONORS.map((d, idx) => (
              <View
                key={d.id}
                style={[
                  s.donorRow,
                  idx === MOCK_DONORS.length - 1 && s.donorRowLast,
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
          </View>
        </Animated.View>

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
            <View style={[s.surfaceCard, s.qrCard]}>
              <View style={s.qrTitleRow}>
                <View style={s.qrBadge}>
                  <AppIcon name="shield-checkmark" size={18} color="#fff" />
                </View>
                <Text style={s.qrTitle}>Fully Funded</Text>
              </View>
              <Text style={s.qrSub}>
                Present this QR code at the imaging centre to redeem your funded
                diagnostic.
              </Text>
              <View style={s.qrFrame}>
                <MockQRCode size={170} />
              </View>
              <Text style={s.qrRef}>REF: MHP-2026-4821-ENDO</Text>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
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
  surfaceCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  pageHeaderTitle: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  pageHeaderSub: {
    fontSize: 15,
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
    borderRadius: 999,
    gap: 6,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  createCampaignBtnText: {
    color: "#fff",
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 19,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  profileHint: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 3,
    letterSpacing: 0.1,
  },
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
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionBlockLast: {
    marginBottom: 0,
  },
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
    backgroundColor: "#F8FAFB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.text.primary,
    lineHeight: 22,
    minHeight: 76,
  },
  caseInput: {
    minHeight: 108,
  },
  campaignHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  campaignIconCapsule: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.10)",
  },
  campaignTitle: {
    fontSize: 18,
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
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 21,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  statValueAccent: {
    color: Colors.accent,
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
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: DIVIDER,
  },
  barTrack: {
    backgroundColor: "#E7ECE8",
    overflow: "hidden",
    marginBottom: 22,
    position: "relative",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  donateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
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
    borderRadius: 16,
    backgroundColor: "#F2F4F7",
    justifyContent: "center",
  },
  fillBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.text.secondary,
    letterSpacing: 0.1,
  },
  donorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  donorRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  donorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F7F5",
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
  qrCard: {
    alignItems: "center",
  },
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  qrRef: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.text.muted,
    letterSpacing: 2,
  },
});
