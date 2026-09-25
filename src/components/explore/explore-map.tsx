"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { AttributionControl, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  FlyTo,
  jobPillIcon,
  VectorBase,
  wmClusterIcon,
  youAreHereIcon,
  type MapTarget,
} from "@/components/map/leaflet-parts";
import type { Bounds } from "@/lib/jobs/meta";
import { mapConfig } from "@/lib/map/config";

export type { MapTarget };

export type MapJob = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  label: string;
  isNew: boolean;
};

export const MAX_ZOOM = 18;
const spot = (lat: number, lng: number) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

function JobMarker({
  job,
  selected,
  onSelect,
}: {
  job: MapJob;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const icon = useMemo(
    () => jobPillIcon({ label: job.label, isNew: job.isNew }, { selected }),
    [job.label, job.isNew, selected],
  );
  return (
    <Marker
      position={[job.lat, job.lng]}
      icon={icon}
      title={job.title}
      alt={job.title}
      keyboard
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(job.id) }}
    />
  );
}

// Reports the map and its visible area to the page (custom controls, the
// "jobs in this area" count, and placing the job card beside its pin).
function MapBridge({
  onReady,
  onView,
  onEmptyClick,
}: {
  onReady: (map: L.Map) => void;
  onView: (bounds: Bounds) => void;
  onEmptyClick: () => void;
}) {
  const map = useMap();
  const report = () => {
    const b = map.getBounds();
    onView({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
  };
  useMapEvents({ moveend: report, zoomend: report, click: onEmptyClick });
  useEffect(() => {
    onReady(map);
    const scale = L.control.scale({ position: "bottomright", imperial: false, maxWidth: 64 });
    scale.addTo(map);
    report();
    return () => {
      scale.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per map
  }, [map]);
  return null;
}

// The full-screen public map. Loaded client-side only (Leaflet needs `window`).
export default function ExploreMap({
  jobs,
  bounds,
  selectedId,
  onSelect,
  onSpot,
  onEmptyClick,
  target,
  me,
  label,
  variant,
  onReady,
  onView,
}: {
  jobs: MapJob[];
  bounds: Bounds;
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Several jobs at the same point (a cluster at max zoom): open them with a pager.
  onSpot: (ids: string[]) => void;
  onEmptyClick: () => void;
  target: MapTarget | null;
  me: [number, number] | null;
  label: string;
  variant: "light" | "satellite";
  onReady: (map: L.Map) => void;
  onView: (bounds: Bounds) => void;
}) {
  const bySpot = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const j of jobs) {
      const k = spot(j.lat, j.lng);
      m.set(k, [...(m.get(k) ?? []), j.id]);
    }
    return m;
  }, [jobs]);

  // The cluster group binds its click handler once, so it reads the latest
  // jobs through a ref.
  const clusterClick = useRef<(cluster: L.MarkerCluster) => void>(() => {});
  useEffect(() => {
    clusterClick.current = (cluster) => {
      const map = (cluster as unknown as { _map: L.Map })._map;
      const spots = new Set(
        cluster.getAllChildMarkers().map((m) => spot(m.getLatLng().lat, m.getLatLng().lng)),
      );
      if (spots.size === 1 || map.getZoom() >= MAX_ZOOM) {
        onSpot([...spots].flatMap((k) => bySpot.get(k) ?? []));
        return;
      }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.flyToBounds(cluster.getBounds(), {
        animate: !reduce,
        duration: 0.6,
        paddingTopLeft: [80, 180],
        paddingBottomRight: [80, 100],
        maxZoom: MAX_ZOOM,
      });
    };
  }, [bySpot, onSpot]);

  return (
    <div role="region" aria-label={label} className="absolute inset-0 z-0">
      <MapContainer
        center={[25.2048, 55.2708]}
        zoom={11}
        minZoom={2}
        maxZoom={MAX_ZOOM}
        worldCopyJump
        maxBounds={[
          [Math.max(bounds.south - 1, -85), bounds.west - 1],
          [Math.min(bounds.north + 1, 85), bounds.east + 1],
        ]}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        attributionControl={false}
        className="size-full"
      >
        <VectorBase variant={variant} />
        <AttributionControl position="bottomright" prefix="Leaflet" />
        <AttributionText />
        <MapBridge onReady={onReady} onView={onView} onEmptyClick={onEmptyClick} />
        <FlyTo target={target} />
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={false}
          zoomToBoundsOnClick={false}
          maxClusterRadius={40}
          iconCreateFunction={wmClusterIcon}
          onClick={(e) => clusterClick.current((e as unknown as { layer: L.MarkerCluster }).layer)}
        >
          {jobs.map((job) => (
            <JobMarker
              key={job.id}
              job={job}
              selected={job.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </MarkerClusterGroup>
        {me ? (
          <Marker position={me} icon={youAreHereIcon()} interactive={false} keyboard={false} />
        ) : null}
      </MapContainer>
    </div>
  );
}

function AttributionText() {
  const map = useMap();
  useEffect(() => {
    const control = map.attributionControl;
    control?.addAttribution(mapConfig.attribution);
    return () => {
      control?.removeAttribution(mapConfig.attribution);
    };
  }, [map]);
  return null;
}
