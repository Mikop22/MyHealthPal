import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AppIcon } from "./AppIcon";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Typography";

export interface CameraHandle {
  capture: () => void;
}

interface UniversalCameraProps {
  onCapture: (uri: string) => void;
  isActive: boolean;
}

export const UniversalCamera = forwardRef<CameraHandle, UniversalCameraProps>(
  function UniversalCamera({ onCapture, isActive }, ref) {
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    useImperativeHandle(
      ref,
      () => ({
        async capture() {
          if (!cameraRef.current) return;
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.85,
          });
          if (photo?.uri) onCapture(photo.uri);
        },
      }),
      [onCapture],
    );

    if (!permission) {
      return <View style={styles.fallback} />;
    }

    if (!permission.granted) {
      return (
        <View style={styles.fallback}>
          <View style={styles.permissionCard}>
            <View style={styles.permissionIconWrap}>
              <AppIcon name="camera" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Camera permission is required</Text>
            <Text style={styles.subText}>
              Enable camera access to scan documents inside the frame.
            </Text>
            <Pressable onPress={requestPermission} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Grant Permission</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (!isActive) return <View style={styles.fallback} />;

    return (
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />
    );
  },
);

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#030712",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  permissionCard: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(34, 197, 94, 0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: Fonts.bold,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subText: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 15,
    fontFamily: Fonts.regular,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    minWidth: 220,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.1,
  },
});
