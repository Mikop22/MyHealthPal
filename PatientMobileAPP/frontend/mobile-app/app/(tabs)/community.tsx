import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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

const REQUESTS: CommunityRequest[] = [
  { id: "r01", title: "Iron supplements for anemia recovery", description: "I've been diagnosed with iron-deficiency anemia and need daily supplements to rebuild my hemoglobin levels before my next check-up.", aboutMe: "I'm a 28-year-old nursing student and single mom from Atlanta. I was diagnosed with severe anemia after months of fatigue that I kept dismissing as stress.", category: "Supplements", requester: "Amara J.", initials: "AJ", amount: 28, raised: 18, daysAgo: 3 },
  { id: "r02", title: "Heating pad for endometriosis flare", description: "Currently in a severe endo flare and the heat therapy is the only thing keeping me functional enough to work.", aboutMe: "I'm a 32-year-old graphic designer living with stage III endometriosis. It took 7 years to get my diagnosis. I advocate for other women going through the same struggle.", category: "Pain Mgmt", requester: "Keisha R.", initials: "KR", amount: 35, raised: 35, daysAgo: 1 },
  { id: "r03", title: "Prenatal vitamins (3-month supply)", description: "My OB recommended these specific prenatals but they're not covered by my insurance plan.", aboutMe: "I'm expecting my first child and want to give her the best start. I work part-time as a teacher's aide while finishing my degree.", category: "Supplements", requester: "Maria L.", initials: "ML", amount: 42, raised: 28, daysAgo: 5 },
  { id: "r04", title: "Blood glucose test strips", description: "I need to monitor my glucose levels 4x daily as directed by my endocrinologist, but the strips add up fast.", aboutMe: "I'm a 45-year-old grandmother managing Type 2 diabetes. I was diagnosed two years ago and I'm working hard to get my A1C under control.", category: "Monitoring", requester: "Denise W.", initials: "DW", amount: 22, raised: 12, daysAgo: 2 },
  { id: "r05", title: "Compression socks for DVT prevention", description: "Post-surgery requirement to prevent blood clots during recovery. My surgeon says I need medical-grade compression.", aboutMe: "I'm a 38-year-old fitness instructor who just had knee surgery. The irony isn't lost on me - I help people stay healthy but need help recovering myself.", category: "Recovery", requester: "Tanya B.", initials: "TB", amount: 18, raised: 18, daysAgo: 7 },
  { id: "r06", title: "Post-surgical wound care kit", description: "I need sterile bandages, antiseptic, and wound closure strips for at-home care after my laparoscopic procedure.", aboutMe: "I'm a 29-year-old social worker recovering from a laparoscopic procedure to remove ovarian cysts. Every day I help others - now I'm asking for a little help too.", category: "Recovery", requester: "Jasmine C.", initials: "JC", amount: 55, raised: 30, daysAgo: 4 },
  { id: "r07", title: "Migraine cold therapy cap", description: "I suffer from chronic migraines 3-4 times a week and cold compression is one of the few things that provides relief.", aboutMe: "I'm a 34-year-old freelance writer dealing with chronic migraines since my teens. Some days I can barely look at a screen, which makes working incredibly challenging.", category: "Pain Mgmt", requester: "Lena P.", initials: "LP", amount: 32, raised: 8, daysAgo: 1 },
  { id: "r08", title: "Fiber supplement for GI management", description: "My gastroenterologist recommended daily fiber supplementation to manage IBS symptoms and reduce flare frequency.", aboutMe: "I'm a 26-year-old barista managing IBS-C. It affects every part of my life, from what I eat to whether I can make it through a full shift.", category: "Supplements", requester: "Fatima N.", initials: "FN", amount: 15, raised: 15, daysAgo: 6 },
  { id: "r09", title: "Pulse oximeter for home monitoring", description: "My pulmonologist wants me tracking my oxygen saturation daily at home following my asthma hospitalization.", aboutMe: "I'm a 41-year-old mom of three with severe asthma. After a scary ER visit last month, my doctor wants me monitoring at home so we can catch drops early.", category: "Monitoring", requester: "Sharon K.", initials: "SK", amount: 38, raised: 22, daysAgo: 2 },
  { id: "r10", title: "Anti-nausea wristbands (pair)", description: "I'm dealing with severe nausea from my medication regimen and these acupressure bands help without adding more meds.", aboutMe: "I'm a 30-year-old artist going through treatment that leaves me nauseous most days. I'd rather not add another prescription to the pile.", category: "Pain Mgmt", requester: "Nina T.", initials: "NT", amount: 12, raised: 4, daysAgo: 1 },
];

type CategoryIconName = Parameters<typeof AppIcon>[0]["name"];

const CATEGORY_ICONS: Record<string, CategoryIconName> = {
  Supplements: "nutrition",
  "Pain Mgmt": "bandage",
  Monitoring: "pulse",
  Recovery: "fitness",
};

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
                  <AppIcon name="close" size={18} color={TEXT_PRIMARY} />
                </Pressable>
              </View>

              <View style={styles.modalDivider} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                style={styles.modalScroll}
              >
                <View style={styles.modalLabelRow}>
                  <AppIcon name="person" size={13} color={Colors.accent} />
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
}: {
  item: CommunityRequest;
  index: number;
  shouldAnimate: boolean;
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
                <AppIcon name="checkmark" size={10} color={Colors.accent} />
                <Text style={styles.fulfilledChipText}>Funded</Text>
              </View>
            ) : (
              <View style={styles.categoryChip}>
                <AppIcon name={iconName} size={12} color={Colors.accent} />
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
            <Pressable style={styles.donateBtn}>
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

  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: CommunityRequest; index: number }) => (
      <RequestCard
        item={item}
        index={index}
        shouldAnimate={shouldAnimateOnMount}
      />
    ),
    [shouldAnimateOnMount],
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={REQUESTS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
  },
  headerSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    marginTop: 4,
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
    backgroundColor: "#FFFFFF",
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
    color: TEXT_PRIMARY,
    letterSpacing: 0.3,
  },
  requester: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    marginTop: 2,
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
    color: Colors.accent,
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
    lineHeight: 23,
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 21,
    color: TEXT_SECONDARY,
    marginBottom: 18,
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
    color: Colors.accent,
    letterSpacing: -0.2,
  },
  progressLabelMuted: {
    fontFamily: Fonts.regular,
    color: TEXT_TERTIARY,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
  },
  modalName: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  modalNameSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    marginTop: 3,
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
    color: TEXT_SECONDARY,
    letterSpacing: 1.4,
  },
  modalBody: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: "#344054",
    lineHeight: 23,
    letterSpacing: 0.1,
  },
});
