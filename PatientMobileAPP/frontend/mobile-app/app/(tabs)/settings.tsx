import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { AppIcon, type AppIconName } from "../../components/AppIcon";
import { UniversalLiquidCard } from "../../components/UniversalLiquidCard";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { usePatientStore } from "../../store/patientStore";

const FALLBACK = "Not specified";

function formatSex(sex: string | null): string {
  if (!sex) return FALLBACK;
  const labels: Record<string, string> = {
    female: "Female",
    male: "Male",
    intersex: "Intersex",
    prefer_not_to_say: "Prefer not to say",
  };
  return labels[sex] ?? sex;
}

function formatAge(age: number | null): string {
  if (age === null) return FALLBACK;
  return `${age} years old`;
}

function formatEthnicity(ethnicities: string[]): string {
  if (!ethnicities.length) return FALLBACK;
  const labels: Record<string, string> = {
    white: "White",
    black_african_american: "Black / African American",
    black_caribbean: "Black / Caribbean",
    black_african: "Black / African",
    east_asian: "East Asian",
    south_asian: "South Asian",
    southeast_asian: "Southeast Asian",
    hispanic_latino: "Hispanic / Latino",
    mena: "Middle Eastern / North African",
    indigenous: "Indigenous / First Nations",
    pacific_islander: "Pacific Islander",
    other: "Other",
    prefer_not_to_say: "Prefer not to say",
  };
  return ethnicities.map((e) => labels[e] ?? e).join(", ");
}

function formatLanguage(lang: string | null): string {
  if (!lang) return FALLBACK;
  const labels: Record<string, string> = {
    en: "English",
    fr: "Français",
    es: "Español",
    ar: "العربية",
    zh: "中文",
    other: "Other",
  };
  return labels[lang] ?? lang;
}

/* ── Premium list item for settings display ── */
function SettingsRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[s.settingsRow, !isLast && s.settingsRowBorder]}>
      <View style={s.settingsIconWrap}>
        <AppIcon name={icon} size={18} color={Colors.forest[500]} />
      </View>
      <View style={s.settingsTextWrap}>
        <Text style={s.settingsLabel}>{label}</Text>
        <Text style={s.settingsValue}>{value}</Text>
      </View>
      <AppIcon name="chevron-forward" size={16} color={Colors.forest[300]} />
    </View>
  );
}

/* ── Profile header with avatar ── */
function ProfileHeader() {
  const { demographics } = usePatientStore();

  return (
    <View style={s.profileHeader}>
      <View style={s.avatarOuter}>
        <LinearGradient
          colors={["rgba(134,239,172,0.35)", "rgba(22,163,74,0.12)"]}
          style={s.avatarGradientRing}
        />
        <View style={s.avatarInner}>
          <AppIcon name="person" size={36} color={Colors.forest[400]} />
        </View>
      </View>
      <Text style={s.profileName}>Patient Profile</Text>
      <Text style={s.profileSub}>
        {demographics.completedAt
          ? "Onboarding completed"
          : "Profile incomplete"}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { demographics } = usePatientStore();

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)}>
          <Text style={s.pageTitle}>Profile</Text>
          <Text style={s.pageSub}>Your health information</Text>
        </Animated.View>

        {/* ── Avatar Card ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <UniversalLiquidCard variant="elevated" style={s.profileCard}>
            <ProfileHeader />
          </UniversalLiquidCard>
        </Animated.View>

        {/* ── Demographics Card ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <UniversalLiquidCard variant="default" style={s.demographicsCard}>
            <View style={s.cardLabelRow}>
              <AppIcon name="clipboard" size={14} color={Colors.forest[500]} />
              <Text style={s.cardLabel}>DEMOGRAPHICS</Text>
            </View>

            <SettingsRow
              icon="calendar"
              label="Age"
              value={formatAge(demographics.age)}
            />
            <SettingsRow
              icon="person"
              label="Biological Sex"
              value={formatSex(demographics.sex)}
            />
            <SettingsRow
              icon="community"
              label="Ethnicity"
              value={formatEthnicity(demographics.ethnicity)}
            />
            <SettingsRow
              icon="globe"
              label="Primary Language"
              value={formatLanguage(demographics.primaryLanguage)}
            />
            <SettingsRow
              icon="mail"
              label="Email"
              value={demographics.email ?? FALLBACK}
              isLast
            />
          </UniversalLiquidCard>
        </Animated.View>

        {/* ── Health Summary Card ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <UniversalLiquidCard variant="default" style={s.demographicsCard}>
            <View style={s.cardLabelRow}>
              <AppIcon name="shield-checkmark" size={14} color={Colors.forest[500]} />
              <Text style={s.cardLabel}>APP INFO</Text>
            </View>

            <SettingsRow
              icon="information-circle"
              label="Version"
              value="1.0.0"
            />
            <SettingsRow
              icon="shield-checkmark"
              label="Privacy Policy"
              value="View"
            />
            <SettingsRow
              icon="medical"
              label="Terms of Service"
              value="View"
              isLast
            />
          </UniversalLiquidCard>
        </Animated.View>

        {/* ── Completion Status ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <UniversalLiquidCard variant="subtle" style={s.statusCard}>
            <View style={s.statusRow}>
              <View style={s.statusBadge}>
                <AppIcon
                  name={demographics.completedAt ? "checkmark-circle" : "alert-circle"}
                  size={20}
                  color={demographics.completedAt ? Colors.accent : Colors.forest[400]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.statusTitle}>
                  {demographics.completedAt
                    ? "Profile Complete"
                    : "Profile Incomplete"}
                </Text>
                <Text style={s.statusSub}>
                  {demographics.completedAt
                    ? "All onboarding steps have been completed"
                    : "Complete onboarding to fill your profile"}
                </Text>
              </View>
            </View>
          </UniversalLiquidCard>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },

  /* ── Page Header ── */
  pageTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  pageSub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.forest[500],
    marginTop: 2,
    marginBottom: 24,
    letterSpacing: 0.1,
  },

  /* ── Profile Card ── */
  profileCard: { padding: 32, marginBottom: 16, alignItems: "center" },
  profileHeader: { alignItems: "center" },
  avatarOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarGradientRing: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: Colors.forest[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  profileSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.forest[500],
    marginTop: 4,
    letterSpacing: 0.2,
  },

  /* ── Demographics Card ── */
  demographicsCard: { padding: 24, marginBottom: 16 },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 18,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.forest[500],
    letterSpacing: 1.4,
  },

  /* ── Settings Row ── */
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(187, 247, 208, 0.3)",
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(240, 253, 244, 0.6)",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(187, 247, 208, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsTextWrap: { flex: 1 },
  settingsLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.forest[500],
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  settingsValue: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.forest[800],
    letterSpacing: -0.1,
  },

  /* ── Status Card ── */
  statusCard: { padding: 24, marginBottom: 16 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(240, 253, 244, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.forest[800],
    letterSpacing: -0.1,
  },
  statusSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.forest[500],
    marginTop: 2,
    letterSpacing: 0.1,
    lineHeight: 19,
  },
});
