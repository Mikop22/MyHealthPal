import React from "react";
import { StyleSheet } from "react-native";
import RNMapView, { Marker } from "react-native-maps";

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
 * Native map implementation using react-native-maps.
 * Plots clinic markers with the app's accent green colour.
 */
export function ClinicMapView({ clinics, height = 220 }: ClinicMapViewProps) {
  return (
    <RNMapView
      style={[styles.map, { height }]}
      initialRegion={{
        latitude: 42.9849,
        longitude: -81.2453,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {clinics.map((c) => (
        <Marker
          key={c.name}
          coordinate={{ latitude: c.latitude, longitude: c.longitude }}
          title={c.name}
          description={`${c.address} · ${c.distance}`}
          pinColor="#22C55E"
        />
      ))}
    </RNMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
  },
});
