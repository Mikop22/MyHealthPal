import "../global.css";

import { useEffect } from "react";
import { Platform, View } from "react-native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Colors } from "../constants/Colors";
import { GlassCanvas } from "../components/GlassCanvas";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const pathname = usePathname();
  const isOnboarding = pathname.includes("onboarding");

  return (
    <View style={{ flex: 1, backgroundColor: isOnboarding ? "white" : "transparent" }}>
      {!isOnboarding && <GlassCanvas />}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor:
              Platform.OS === "web"
                ? "rgba(255, 255, 255, 0.08)"
                : "transparent",
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontWeight: "700",
            color: Colors.primary,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, contentStyle: { backgroundColor: "white" } }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
