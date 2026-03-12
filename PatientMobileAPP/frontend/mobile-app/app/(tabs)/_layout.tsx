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
          size={22}
          color={focused ? Colors.tabBar.active : Colors.tabBar.inactive}
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
        tabBarActiveTintColor: Colors.tabBar.active,
        tabBarInactiveTintColor: Colors.tabBar.inactive,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor:
            Platform.OS === "web" ? "rgba(255,255,255,0.08)" : "transparent",
          borderTopColor: "rgba(255,255,255,0.30)",
          borderTopWidth: 1,
          ...(Platform.OS === "web"
            ? ({
              backdropFilter: "blur(28px) saturate(160%)",
              WebkitBackdropFilter: "blur(28px) saturate(160%)",
            } as Record<string, string>)
            : {}),
          height: Platform.OS === "web" ? 64 : undefined,
          paddingBottom: Platform.OS === "web" ? 8 : undefined,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarBackground: () =>
          Platform.OS !== "web" ? (
            <BlurView
              intensity={60}
              tint="light"
              style={{ position: "absolute", inset: 0 } as never}
            />
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
    gap: 3,
    paddingTop: 2,
  },
  underline: {
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Colors.tabBar.active,
  },
});
