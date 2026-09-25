"use client";

import type L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { jobPillIcon, VectorBase, wmClusterIcon } from "@/components/map/leaflet-parts";

export type AdminPin = { id: string; label: string; lat: number; lng: number; pending: boolean };
export type AdminMapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  show: (ids: string[]) => void;
};

function Pin({
  pin,
  selected,
  onSelect,
}: {
  pin: AdminPin;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const icon = useMemo(
    () => jobPillIcon({ label: pin.label }, { selected, pending: pin.pending, small: true }),
    [pin.label, pin.pending, selected],
  );
  return (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={icon}
      title={pin.label}
      alt={pin.label}
      keyboard={Boolean(onSelect)}
      interactive={Boolean(onSelect)}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={onSelect ? { click: () => onSelect(pin.id) } : undefined}
    />
  );
}

function Bridge({
  pins,
  selectedId,
  apiRef,
  onView,
}: {
  pins: AdminPin[];
  selectedId: string | null;
  apiRef?: React.RefObject<AdminMapApi | null>;
  onView?: (b: L.LatLngBounds) => void;
}) {
  const map = useMap();
  const fitted = useRef(false);
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fit = (list: AdminPin[], animate: boolean) => {
    if (!list.length) return;
    if (list.length === 1) {
      map.setView([list[0].lat, list[0].lng], 13, { animate });
      return;
    }
    map.fitBounds(
      list.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [60, 60], maxZoom: 13, animate },
    );
  };

  // First view: the live jobs (waiting ones may sit outside it; the page
  // offers a chip to go there), or everything when nothing is live.
  useEffect(() => {
    if (fitted.current || !pins.length) return;
    fitted.current = true;
    const live = pins.filter((p) => !p.pending);
    fit(live.length ? live : pins, false);
    onView?.(map.getBounds());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first fit only
  }, [pins]);

  // Selecting a card pans its pin into view.
  useEffect(() => {
    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;
    if (!map.getBounds().pad(-0.15).contains([pin.lat, pin.lng])) {
      map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 12), {
        animate: !reduce(),
        duration: 0.6,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on selection change
  }, [selectedId]);

  useMapEvents({ moveend: () => onView?.(map.getBounds()) });

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      show: (ids) =>
        fit(
          pins.filter((p) => ids.includes(p.id)),
          !reduce(),
        ),
    };
  });
  return null;
}

// A light map of jobs for the admin, with exact points.
export default function AdminMapCanvas({
  pins,
  selectedId = null,
  onSelect,
  apiRef,
  onView,
  interactive = true,
}: {
  pins: AdminPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  apiRef?: React.RefObject<AdminMapApi | null>;
  onView?: (b: L.LatLngBounds) => void;
  interactive?: boolean;
}) {
  return (
    <MapContainer
      center={[25.1, 55.2]}
      zoom={10}
      maxZoom={18}
      zoomControl={false}
      attributionControl={false}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      className="size-full"
    >
      <VectorBase />
      <Bridge pins={pins} selectedId={selectedId} apiRef={apiRef} onView={onView} />
      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={40}
        iconCreateFunction={wmClusterIcon}
      >
        {pins.map((pin) => (
          <Pin key={pin.id} pin={pin} selected={pin.id === selectedId} onSelect={onSelect} />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
