"use client";

// Leaflet touches `window` on import: only import this file from modules that
// are loaded with next/dynamic({ ssr: false }).
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useSyncExternalStore } from "react";
import { TileLayer, useMap } from "react-leaflet";
import { mapConfig } from "@/lib/map/config";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeDark(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// MapTiler raster tiles, following the system light/dark setting.
export function ThemedTiles() {
  const dark = useSyncExternalStore(
    subscribeDark,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  return (
    <TileLayer
      key={dark ? "dark" : "light"}
      url={dark ? mapConfig.tileUrlDark : mapConfig.tileUrl}
      attribution={mapConfig.attribution}
      detectRetina={false}
      maxZoom={19}
    />
  );
}

// Moves the map when `target` changes.
export function FlyTo({ target }: { target: { center: [number, number]; zoom: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo(target.center, target.zoom, { animate: !reduce, duration: 0.8 });
  }, [map, target]);
  return null;
}

// Job pin: a pill with the job title. Built with DOM APIs (textContent) so
// employer-written titles can never inject HTML.
export function jobPinIcon(title: string, selected = false) {
  const el = document.createElement("span");
  el.className = selected ? "wm-pin wm-pin-selected" : "wm-pin";
  const label = document.createElement("span");
  label.className = "wm-pin-label";
  label.textContent = title.length > 22 ? `${title.slice(0, 21)}…` : title;
  el.append(label);
  return L.divIcon({ html: el, className: "wm-pin-wrap", iconSize: undefined, iconAnchor: [0, 0] });
}

export function clusterIcon(cluster: L.MarkerCluster) {
  const el = document.createElement("span");
  el.className = "wm-cluster";
  el.textContent = String(cluster.getChildCount());
  return L.divIcon({ html: el, className: "wm-pin-wrap", iconSize: L.point(44, 44) });
}

// Draggable point for the employer location picker and the "you are here" dot.
export const pointIcon = (kind: "pick" | "me") =>
  L.divIcon({
    html: `<span class="${kind === "pick" ? "wm-pick" : "wm-me"}"></span>`,
    className: "wm-pin-wrap",
    iconSize: kind === "pick" ? L.point(36, 36) : L.point(20, 20),
    iconAnchor: kind === "pick" ? L.point(18, 34) : L.point(10, 10),
  });
