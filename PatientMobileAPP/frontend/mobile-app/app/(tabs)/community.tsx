import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { AppIcon } from "../../components/AppIcon";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import {
  listCampaigns,
  createContribution,
  type CampaignResponse,
} from "../../services/api";

const SCREEN_BG = "#F6F8F6";
const CARD_BG = "#FFFFFF";
const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";
const TEXT_TERTIARY = "#98A2B3";
const DIVIDER = "rgba(15, 23, 42, 0.08)";
const TRACK_BG = "#E7ECE8";

interface CommunityRequest {
  id: string;
  title: string;
  description: string;
  aboutMe: string;
  category: string;
  requester: string;
  initials: string;
  amount: number;
  raised: number;
  daysAgo: number;
}

function campaignToRequest(c: CampaignResponse & { total_raised?: number }): CommunityRequest {
  const created = new Date(c.created_at);
  const now = new Date();
  const daysAgo = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86400000));
  const initials = c.owner_identifier
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    aboutMe: c.about_me ?? "",
    category: c.category ?? "Other",
    requester: c.owner_identifier,
    initials,
    amount: c.goal_amount,
    raised: (c as { total_raised?: number }).total_raised ?? 0,
    daysAgo,
  };
}

type CategoryIconName = Parameters<typeof AppIcon>[0]["name"];

const CATEGORY_ICONS: Record<string, CategoryIconName> = {
  Supplements: "nutrition",
  "Pain Mgmt": "bandage",
  Monitoring: "pulse",
  Recovery: "fitness",
};

const MOCK_CAMPAIGNS: CommunityRequest[] = [
  {
    id: "mock-1",
    title: "Help Me Afford Monthly Insulin Supplies",
    description:
      "I was recently diagnosed with Type 1 diabetes and need help covering the cost of insulin and testing supplies while I wait for insurance approval.",
    aboutMe:
      "Hi, I'm Sarah, a 28-year-old teacher. I love hiking and volunteering at my local animal shelter.",
    category: "Supplements",
    requester: "Sarah Mitchell",
    initials: "SM",
    amount: 500,
    raised: 315,
    daysAgo: 3,
  },
  {
    id: "mock-2",
    title: "Post-Surgery Physical Therapy Sessions",
    description:
      "After my knee surgery, I need 12 weeks of physiotherapy to get back on my feet. Any contribution helps me recover and return to work.",
    aboutMe:
      "I'm James, a 45-year-old construction worker and father of two. I've been in the trades for over 20 years.",
    category: "Recovery",
    requester: "James O'Brien",
    initials: "JO",
    amount: 1200,
    raised: 480,
    daysAgo: 7,
  },
  {
    id: "mock-3",
    title: "Blood Pressure Monitor for Home Use",
    description:
      "My doctor recommended daily blood pressure monitoring at home. I need a reliable device to track my readings between appointments.",
    aboutMe:
      "I'm Maria, a retired nurse who now spends her time gardening and looking after grandchildren.",
    category: "Monitoring",
    requester: "Maria Garcia",
    initials: "MG",
    amount: 150,
    raised: 150,
    daysAgo: 12,
  },
  {
    id: "mock-4",
    title: "Chronic Pain Management Supplements",
    description:
      "Living with fibromyalgia is tough. I'm seeking help to cover anti-inflammatory supplements and a TENS unit recommended by my specialist.",
    aboutMe:
      "I'm David, a 37-year-old freelance graphic designer. I enjoy painting and playing guitar in my spare time.",
    category: "Pain Mgmt",
    requester: "David Chen",
    initials: "DC",
    amount: 300,
    raised: 85,
    daysAgo: 2,
  },
  {
    id: "mock-5",
    title: "Prenatal Vitamins & Wellness Check-ups",
    description:
      "Expecting my first child and need support covering prenatal vitamins and routine wellness visits not fully covered by my plan.",
    aboutMe:
      "I'm Aisha, a 31-year-old social worker passionate about community health and maternal care advocacy.",
    category: "Supplements",
    requester: "Aisha Johnson",
    initials: "AJ",
    amount: 400,
    raised: 220,
    daysAgo: 5,
  },
];

function GradientProgressBar({ pct }: { pct: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]}>
        <LinearGradient
          colors={["#22C55E", "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

function RequesterAvatar({
  initials,
  onPress,
}: {
  initials: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.avatarPressable}>
      <LinearGradient
        colors={["rgba(134,239,172,0.28)", "rgba(22,163,74,0.10)"]}
        style={styles.avatarGradient}
      />
      <View style={styles.avatarInner}>
        <Text style={styles.avatarInitials}>{initials}</Text>
      </View>
    </Pressable>
  );
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function AboutMeModal({
  visible,
  onClose,
  requester,
  aboutMe,
  initials,
}: {
  visible: boolean;
  onClose: () => void;
  requester: string;
  aboutMe: string;
  initials: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalName}>{requester}</Text>
                  <Text style={styles.modalNameSub}>Community Member</Text>
                </View>
                <Pressable onPress={onClose} style={styles.modalClose}>
                  <AppIcon name="close" size={18} color={Colors.text.muted} />
                </Pressable>
              </View>

              <View style={styles.modalDivider} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                style={styles.modalScroll}
              >
                <View style={styles.modalLabelRow}>
                  <AppIcon name="person" size={13} color={Colors.text.muted} />
                  <Text style={styles.modalLabel}>ABOUT ME</Text>
                </View>
                <Text style={styles.modalBody}>{aboutMe}</Text>
              </ScrollView>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RequestCard({
  item,
  index,
  shouldAnimate,
  onContribute,
}: {
  item: CommunityRequest;
  index: number;
  shouldAnimate: boolean;
  onContribute: () => void;
}) {
  const pct = Math.round((item.raised / item.amount) * 100);
  const fulfilled = item.raised >= item.amount;
  const iconName = (CATEGORY_ICONS[item.category] ?? "heart") as CategoryIconName;
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <Animated.View
        entering={
          shouldAnimate
            ? FadeInDown.delay((index + 2) * 150)
                .springify()
                .damping(18)
                .stiffness(120)
            : undefined
        }
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <RequesterAvatar
              initials={item.initials}
              onPress={() => setShowAbout(true)}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.requester}>{item.requester}</Text>
              <Text style={styles.timeAgo}>
                {item.daysAgo}d ago | {item.category}
              </Text>
            </View>
            {fulfilled ? (
              <View style={styles.fulfilledChip}>
                <AppIcon name="checkmark" size={10} color={Colors.brand} />
                <Text style={styles.fulfilledChipText}>Funded</Text>
              </View>
            ) : (
              <View style={styles.categoryChip}>
                <AppIcon name={iconName} size={12} color={Colors.text.muted} />
              </View>
            )}
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.progressRow}>
            <GradientProgressBar pct={pct} />
            <Text style={styles.progressLabel}>
              ${item.raised}
              <Text style={styles.progressLabelMuted}> / ${item.amount}</Text>
            </Text>
          </View>

          {!fulfilled && (
            <Pressable style={styles.donateBtn} onPress={onContribute}>
              <AppIcon name="heart" size={14} color="#fff" />
              <Text style={styles.donateBtnText}>Contribute</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>

      <AboutMeModal
        visible={showAbout}
        onClose={() => setShowAbout(false)}
        requester={item.requester}
        aboutMe={item.aboutMe}
        initials={item.initials}
      />
    </>
  );
}

export default function CommunityScreen() {
  const hasAnimated = useRef(false);
  const shouldAnimateOnMount = !hasAnimated.current;
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const campaigns = await listCampaigns();
      const mapped = campaigns.map((c) => campaignToRequest(c));
      setRequests(mapped.length > 0 ? mapped : MOCK_CAMPAIGNS);
    } catch {
      /* backend unavailable — show mock campaigns */
      setRequests(MOCK_CAMPAIGNS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleContribute = useCallback(
    async (campaignId: string) => {
      try {
        await createContribution(campaignId, {
          contributor_identifier: "anonymous",
          amount: 5,
        });
        await loadCampaigns();
      } catch {
        /* handle error silently */
      }
    },
    [loadCampaigns],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CommunityRequest; index: number }) => (
      <RequestCard
        item={item}
        index={index}
        shouldAnimate={shouldAnimateOnMount}
        onContribute={() => handleContribute(item.id)}
      />
    ),
    [shouldAnimateOnMount, handleContribute],
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Text style={styles.headerSub}>No community campaigns yet</Text>
          </View>
        }
        ListHeaderComponent={
          <Animated.View
            entering={
              shouldAnimateOnMount
                ? FadeInDown.delay(150)
                    .springify()
                    .damping(18)
                    .stiffness(120)
                : undefined
            }
            style={styles.header}
          >
            <View>
              <Text style={styles.headerTitle}>Community</Text>
              <Text style={styles.headerSub}>
                Help others access the care they need
              </Text>
            </View>
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 96,
  },
  header: {
    marginBottom: 22,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatarPressable: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGradient: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(68, 173, 79, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarInitials: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.text.secondary,
    letterSpacing: 0.3,
  },
  requester: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  fulfilledChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
  },
  fulfilledChipText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.brand,
    letterSpacing: 0.3,
  },
  categoryChip: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F4F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    lineHeight: 22,
    color: Colors.text.primary,
    letterSpacing: -0.1,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 19,
    color: Colors.text.muted,
    marginBottom: 16,
    letterSpacing: 0.1,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: TRACK_BG,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  progressLabelMuted: {
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
  },
  donateBtn: {
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
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.1,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: "rgba(15,23,42,0.34)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  modalContent: {
    width: "90%",
    maxWidth: 392,
    maxHeight: "80%",
  },
  modalCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 28,
    maxHeight: SCREEN_H * 0.8 - 56,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(68, 173, 79, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.text.secondary,
    letterSpacing: 0.5,
  },
  modalName: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  modalNameSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginBottom: 18,
  },
  modalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.text.muted,
    letterSpacing: 1.4,
  },
  modalBody: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.text.secondary,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
});
