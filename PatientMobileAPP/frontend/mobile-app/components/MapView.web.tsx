import React from "react";
import { Map, Marker } from "pigeon-maps";

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
  userLocation?: { latitude: number; longitude: number } | null;
}

const LONDON_ON: [number, number] = [42.9849, -81.2453];

/**
 * Web map implementation using pigeon-maps (pure React, no API key required).
 * Renders OpenStreetMap tiles with green clinic markers.
 */
export function ClinicMapView({ clinics, height = 220, userLocation }: ClinicMapViewProps) {
  const center: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : LONDON_ON;

  return (
    <div style={{ borderRadius: 20, overflow: "hidden" }}>
      <Map
        height={height}
        defaultCenter={center}
        defaultZoom={13}
        attribution={false}
      >
        {userLocation && (
          <Marker
            width={40}
            anchor={[userLocation.latitude, userLocation.longitude]}
            color="#3B82F6"
          />
        )}
        {clinics.map((c) => (
          <Marker
            key={c.name}
            width={36}
            anchor={[c.latitude, c.longitude]}
            color="#22C55E"
          />
        ))}
      </Map>
    </div>
  );
}
