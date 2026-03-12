import React, { forwardRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/Colors";

export interface CameraHandle {
  capture: () => void;
}

export interface UniversalCameraProps {
  onCapture: (uri: string) => void;
  isActive: boolean;
}

/**
 * Fallback for unsupported platforms.
 * Real implementations live in UniversalCamera.web.tsx and UniversalCamera.native.tsx.
 * Metro bundler resolves the correct file at build time via platform extensions.
 */
export const UniversalCamera = forwardRef<CameraHandle, UniversalCameraProps>(
  function UniversalCamera(_props, _ref) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera is not available on this platform</Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.forest[950],
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: Colors.secondary,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
