import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Colors } from "../constants/Colors";

export interface CameraHandle {
  capture: () => void;
}

interface UniversalCameraProps {
  onCapture: (uri: string) => void;
  isActive: boolean;
}

/**
 * Native camera implementation using expo-camera CameraView.
 * Handles permission requests and provides a takePictureAsync capture method.
 */
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
          <Text style={styles.text}>
            Camera permission is required to scan documents
          </Text>
          <Button onPress={requestPermission} title="Grant Permission" />
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
