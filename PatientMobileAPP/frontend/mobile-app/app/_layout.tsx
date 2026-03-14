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
  const isScanner = pathname.includes("scanner");

  const appContent = (
    <View style={{ flex: 1, backgroundColor: isOnboarding ? Colors.background : "transparent" }}>
      {!isOnboarding && <GlassCanvas />}
      <StatusBar style={isScanner ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor:
              Platform.OS === "web"
                ? "rgba(255, 255, 255, 0.06)"
                : "transparent",
          },
          headerTintColor: Colors.text.primary,
          headerTitleStyle: {
            fontWeight: "700",
            color: Colors.text.primary,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );

  if (Platform.OS !== "web") return appContent;

  // On web, constrain to a mobile phone aspect ratio so judges see the intended design
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#1A1A2E",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 390,
          maxWidth: "100vw" as any,
          height: "100vh" as any,
          maxHeight: 844,
          borderRadius: 40,
          overflow: "hidden",
          // subtle phone shadow
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.4,
          shadowRadius: 40,
        }}
      >
        {appContent}
      </View>
    </View>
  );
}
