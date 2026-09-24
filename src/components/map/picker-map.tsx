"use client";

import type L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import { FlyTo, pointIcon, ThemedTiles } from "@/components/map/leaflet-parts";

type Point = { lat: number; lng: number };

function ClickToPick({ onPick }: { onPick: (p: Point) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Map for choosing a job location: tap the map or drag the pin.
// Loaded client-side only (Leaflet needs `window`).
export default function PickerMap({
  value,
  target,
  onPick,
  pinLabel,
}: {
  value: Point | null;
  target: { center: [number, number]; zoom: number } | null;
  onPick: (p: Point) => void;
  pinLabel: string;
}) {
  const icon = useMemo(() => pointIcon("pick"), []);
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : [25.2048, 55.2708]}
      zoom={value ? 15 : 11}
      className="size-full"
    >
      <ThemedTiles />
      <FlyTo target={target} />
      <ClickToPick onPick={onPick} />
      {value ? (
        <Marker
          position={[value.lat, value.lng]}
          icon={icon}
          draggable
          autoPan
          title={pinLabel}
          alt={pinLabel}
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              onPick({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
