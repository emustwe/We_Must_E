"use client";

import { useMemo } from "react";
import { MapContainer, Marker, ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  clusterIcon,
  FlyTo,
  jobPinIcon,
  pointIcon,
  ThemedTiles,
} from "@/components/map/leaflet-parts";
import type { Bounds } from "@/lib/jobs/meta";
import type { PublicJob } from "@/lib/jobs/public-queries";

export type MapTarget = { center: [number, number]; zoom: number };

function JobMarker({
  job,
  selected,
  onSelect,
}: {
  job: PublicJob;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const icon = useMemo(() => jobPinIcon(job.title, selected), [job.title, selected]);
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

// The full-screen public map. Loaded client-side only (Leaflet needs `window`).
export default function ExploreMap({
  jobs,
  bounds,
  selectedId,
  onSelect,
  target,
  me,
  label,
}: {
  jobs: PublicJob[];
  bounds: Bounds;
  selectedId: string | null;
  onSelect: (id: string) => void;
  target: MapTarget | null;
  me: [number, number] | null;
  label: string;
}) {
  return (
    <div role="region" aria-label={label} className="absolute inset-0 z-0">
      <MapContainer
        center={[25.2048, 55.2708]}
        zoom={10}
        minZoom={7}
        maxBounds={[
          [bounds.south - 1, bounds.west - 1],
          [bounds.north + 1, bounds.east + 1],
        ]}
        zoomControl={false}
        className="size-full"
      >
        <ThemedTiles />
        <ZoomControl position="bottomright" />
        <FlyTo target={target} />
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={50}
          iconCreateFunction={clusterIcon}
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
          <Marker position={me} icon={pointIcon("me")} interactive={false} keyboard={false} />
        ) : null}
      </MapContainer>
    </div>
  );
}
