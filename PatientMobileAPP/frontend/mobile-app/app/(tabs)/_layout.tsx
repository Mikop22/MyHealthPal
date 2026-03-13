import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon, type AppIconName } from "../../components/AppIcon";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";

const TAB_ACTIVE = Colors.accent;
const TAB_INACTIVE = "#667085";

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

function TabIcon({ name, focused }: { name: AppIconName; focused: boolean }) {
  const scale = useSharedValue(focused ? 1.14 : 1);
  const underline = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.14 : 1, {
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
    width: interpolate(underline.value, [0, 1], [0, 18]),
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

function ActiveTabLabel({
  title,
  focused,
}: {
  title: string;
  focused: boolean;
}) {
  if (!focused) return null;

  return <Text style={styles.activeLabel}>{title}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: "transparent",
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "rgba(15, 23, 42, 0.10)",
          height: 75 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 14,
          elevation: 10,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 2,
          paddingBottom: 2,
        },
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
            tabBarLabel: ({ focused }) => (
              <ActiveTabLabel title={tab.title} focused={focused} />
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
    gap: 6,
    paddingTop: 2,
  },
  underline: {
    height: 3,
    borderRadius: 999,
    backgroundColor: TAB_ACTIVE,
  },
  activeLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: "#344054",
    letterSpacing: 0.15,
    marginTop: 4,
  },
});
