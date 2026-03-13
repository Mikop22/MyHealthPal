import React, { useEffect } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { AppIcon, type AppIconName } from "../../components/AppIcon";
import { Colors } from "../../constants/Colors";

const TAB_ACTIVE = Colors.accent;
const TAB_INACTIVE = "#667085";
const TAB_BORDER = "rgba(15, 23, 42, 0.08)";
const TAB_BG = "rgba(255,255,255,0.92)";

/* ── Per-tab icon mapping ── */
interface TabDefinition {
  name: string;
  title: string;
  icon: AppIconName;
}

const TABS: TabDefinition[] = [
  { name: "scanner", title: "Scanner", icon: "camera" },
  { name: "triage", title: "Check In", icon: "clipboard" },
  { name: "vitals", title: "Vitals", icon: "vitals" },
  { name: "funding", title: "Funding", icon: "funding" },
  { name: "community", title: "Community", icon: "community" },
  { name: "settings", title: "Profile", icon: "settings" },
];

/* ── Animated tab icon with spring scale + underline ── */
function TabIcon({ name, focused }: { name: AppIconName; focused: boolean }) {
  const scale = useSharedValue(focused ? 1.18 : 1);
  const underline = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.18 : 1, {
      damping: 16,
      stiffness: 400,
      mass: 0.6,
    });
    underline.value = withSpring(focused ? 1 : 0, {
      damping: 20,
      stiffness: 320,
    });
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    width: interpolate(underline.value, [0, 1], [0, 20]),
    opacity: underline.value,
  }));

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={iconStyle}>
        <AppIcon
          name={name}
          size={20}
          color={focused ? TAB_ACTIVE : TAB_INACTIVE}
        />
      </Animated.View>
      <Animated.View style={[styles.underline, underlineStyle]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: Platform.OS === "web" ? TAB_BG : "transparent",
          borderTopColor: TAB_BORDER,
          borderTopWidth: StyleSheet.hairlineWidth,
          ...(Platform.OS === "web"
            ? ({
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              boxShadow: "0 -8px 30px rgba(15,23,42,0.06)",
            } as Record<string, string>)
            : {}),
          height: Platform.OS === "web" ? 68 : 72,
          paddingTop: 8,
          paddingBottom: Platform.OS === "web" ? 8 : 10,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.04,
          shadowRadius: 18,
          elevation: 8,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.15,
          marginBottom: 2,
        },
        tabBarBackground: () =>
          Platform.OS !== "web" ? (
            <View style={styles.tabBarBackground}>
              <BlurView
                intensity={54}
                tint="light"
                style={{ position: "absolute", inset: 0 } as never}
              />
              <View style={styles.tabBarOverlay} />
            </View>
          ) : (null as unknown as React.ReactElement),
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon name={tab.icon} focused={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 4,
  },
  underline: {
    height: 3,
    borderRadius: 999,
    backgroundColor: TAB_ACTIVE,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.84)",
  },
  tabBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.58)",
  },
});
