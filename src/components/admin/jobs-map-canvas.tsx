"use client";

import { MapContainer, Marker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { clusterIcon, jobPinIcon, ThemedTiles } from "@/components/map/leaflet-parts";

type Pin = { id: string; title: string; lat: number; lng: number };

export default function JobsMapCanvas({ jobs }: { jobs: Pin[] }) {
  return (
    <MapContainer center={[24.9, 55.2]} zoom={8} className="size-full">
      <ThemedTiles />
      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        iconCreateFunction={clusterIcon}
      >
        {jobs.map((job) => (
          <Marker
            key={job.id}
            position={[job.lat, job.lng]}
            icon={jobPinIcon(job.title)}
            title={job.title}
            eventHandlers={{
              click: () =>
                document.getElementById(`job-${job.id}`)?.scrollIntoView({ behavior: "smooth" }),
            }}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
