"use client";

import { useMemo } from "react";
import { MapContainer, Marker, ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  clusterIcon,
  FlyTo,
  jobCardIcon,
  pointIcon,
  ThemedTiles,
  type MapTarget,
} from "@/components/map/leaflet-parts";
import { initials } from "@/lib/sponsors/initials";
import { logoUrl } from "@/lib/sponsors/logo";
import type { Bounds } from "@/lib/jobs/meta";
import type { PublicJob } from "@/lib/jobs/public-queries";

export type { MapTarget };

function JobMarker({
  job,
  selected,
  onSelect,
}: {
  job: PublicJob;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const icon = useMemo(
    () =>
      jobCardIcon(
        {
          title: job.title,
          sponsorName: job.sponsorName,
          logoUrl: logoUrl(job.sponsorLogo),
          initials: initials(job.sponsorName),
        },
        selected,
      ),
    [job.title, job.sponsorName, job.sponsorLogo, selected],
  );
  const label = `${job.title}, ${job.sponsorName}`;
  return (
    <Marker
      position={[job.lat, job.lng]}
      icon={icon}
      title={label}
      alt={label}
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
        minZoom={2}
        worldCopyJump
        maxBounds={[
          [Math.max(bounds.south - 1, -85), bounds.west - 1],
          [Math.min(bounds.north + 1, 85), bounds.east + 1],
        ]}
        maxBoundsViscosity={0.8}
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
