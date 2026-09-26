"use client";

import L from "leaflet";
import { Circle, MapContainer, Marker } from "react-leaflet";
import { VectorBase } from "@/components/map/leaflet-parts";

const point = L.divIcon({
  html: '<span class="wm-exact"></span>',
  className: "wm-pin-wrap",
  iconSize: L.point(18, 18),
  iconAnchor: L.point(9, 9),
});

// The job's exact point (private) and the ~300 m area the public map shows.
export default function JobLocationCanvas({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      maxZoom={18}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      className="size-full"
    >
      <VectorBase />
      <Circle
        center={[lat, lng]}
        radius={300}
        pathOptions={{
          color: "#2457F5",
          weight: 1.5,
          dashArray: "5 5",
          fillColor: "#2457F5",
          fillOpacity: 0.1,
        }}
      />
      <Marker position={[lat, lng]} icon={point} interactive={false} keyboard={false} />
    </MapContainer>
  );
}
