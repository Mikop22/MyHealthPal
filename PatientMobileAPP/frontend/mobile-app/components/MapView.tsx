import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/Colors";

export interface ClinicPin {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: string;
}

export interface ClinicMapViewProps {
  clinics: ClinicPin[];
  height?: number;
}

/**
 * Fallback for platforms without a map implementation.
 * Real implementations: MapView.web.tsx (pigeon-maps) / MapView.native.tsx (react-native-maps).
 */
export function ClinicMapView({ height = 220 }: ClinicMapViewProps) {
  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.text}>Map not available on this platform</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: Colors.forest[100],
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: Colors.forest[700],
    fontSize: 14,
  },
});
