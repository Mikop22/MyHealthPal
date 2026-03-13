import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { AppIcon, type AppIconName } from "../../components/AppIcon";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { usePatientStore } from "../../store/patientStore";
import { getProfile, updateProfile } from "../../services/api";

const FALLBACK = "Not specified";
const SCREEN_BG = "#F6F8F6";
const CARD_BG = "#FFFFFF";
const TEXT_PRIMARY = "#101828";
const TEXT_SECONDARY = "#667085";
const TEXT_TERTIARY = "#98A2B3";
const DIVIDER = "rgba(15, 23, 42, 0.08)";

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
    fr: "Francais",
    es: "Espanol",
    ar: "Arabic",
    zh: "Chinese",
    other: "Other",
  };
  return labels[lang] ?? lang;
}

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
        <AppIcon name={icon} size={18} color={Colors.accent} />
      </View>
      <View style={s.settingsTextWrap}>
        <Text style={s.settingsLabel}>{label}</Text>
        <Text style={s.settingsValue}>{value}</Text>
      </View>
      <AppIcon name="chevron-forward" size={16} color={TEXT_TERTIARY} />
    </View>
  );
}

function ProfileHeader() {
  const { demographics } = usePatientStore();

  return (
    <View style={s.profileHeader}>
      <View style={s.avatarOuter}>
        <LinearGradient
          colors={["rgba(134,239,172,0.34)", "rgba(22,163,74,0.10)"]}
          style={s.avatarGradientRing}
        />
        <View style={s.avatarInner}>
          <AppIcon name="person" size={36} color={TEXT_PRIMARY} />
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
  const { demographics, setAge, setSex, setLanguage, setEthnicity, setEmail } = usePatientStore();

  // Hydrate store from backend on mount
  useEffect(() => {
    let cancelled = false;
    getProfile("current_user")
      .then((profile) => {
        if (cancelled) return;
        if (profile.age !== null) setAge(profile.age);
        if (profile.sex) setSex(profile.sex as "female" | "male" | "intersex" | "prefer_not_to_say");
        if (profile.primary_language) setLanguage(profile.primary_language);
        if (profile.ethnicity.length > 0) setEthnicity(profile.ethnicity);
        if (profile.email) setEmail(profile.email);
      })
      .catch(() => {
        /* backend unavailable — use local store */
      });
    return () => { cancelled = true; };
  }, []);

  // Persist to backend when demographics change
  useEffect(() => {
    if (!demographics.completedAt) return;
    updateProfile("current_user", {
      age: demographics.age,
      sex: demographics.sex,
      primary_language: demographics.primaryLanguage,
      ethnicity: demographics.ethnicity,
      email: demographics.email,
    }).catch(() => {
      /* backend unavailable */
    });
  }, [demographics.completedAt]);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500).delay(50)}>
          <Text style={s.pageTitle}>Profile</Text>
          <Text style={s.pageSub}>Your health information</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <View style={s.surfaceCard}>
            <ProfileHeader />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={s.surfaceCard}>
            <View style={s.cardLabelRow}>
              <AppIcon name="clipboard" size={14} color={Colors.accent} />
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
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <View style={s.surfaceCard}>
            <View style={s.cardLabelRow}>
              <AppIcon
                name="shield-checkmark"
                size={14}
                color={Colors.accent}
              />
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
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <View style={[s.surfaceCard, s.statusCard]}>
            <View style={s.statusRow}>
              <View style={s.statusBadge}>
                <AppIcon
                  name={
                    demographics.completedAt
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={20}
                  color={demographics.completedAt ? Colors.accent : TEXT_SECONDARY}
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
          </View>
        </Animated.View>

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
  pageTitle: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
  },
  pageSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    marginTop: 4,
    marginBottom: 24,
    letterSpacing: 0.1,
  },
  profileHeader: {
    alignItems: "center",
  },
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  profileName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  profileSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: TEXT_SECONDARY,
    letterSpacing: 1.4,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    gap: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  settingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F4F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsTextWrap: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: TEXT_SECONDARY,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  settingsValue: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  statusCard: {
    paddingVertical: 22,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  statusSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: TEXT_SECONDARY,
    marginTop: 3,
    letterSpacing: 0.1,
    lineHeight: 19,
  },
});
