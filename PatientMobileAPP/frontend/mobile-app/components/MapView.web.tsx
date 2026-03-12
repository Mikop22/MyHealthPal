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
}

const LONDON_ON: [number, number] = [42.9849, -81.2453];

/**
 * Web map implementation using pigeon-maps (pure React, no API key required).
 * Renders OpenStreetMap tiles with green clinic markers for London, Ontario.
 */
export function ClinicMapView({ clinics, height = 220 }: ClinicMapViewProps) {
  return (
    <div style={{ borderRadius: 20, overflow: "hidden" }}>
      <Map
        height={height}
        defaultCenter={LONDON_ON}
        defaultZoom={13}
        attribution={false}
      >
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
