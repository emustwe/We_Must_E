"use client";

// Leaflet touches `window` on import: only import this file from modules that
// are loaded with next/dynamic({ ssr: false }).
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useSyncExternalStore } from "react";
import { TileLayer, useMap } from "react-leaflet";
import type { StyleSpecification } from "maplibre-gl";
import { iconNode } from "@/components/map/wm-icons";
import { mapConfig } from "@/lib/map/config";
import { lightStyle, satelliteStyleUrl, streetsStyleUrl } from "@/lib/map/vector-style";

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

export type MapTarget =
  { center: [number, number]; zoom: number } | { bounds: [[number, number], [number, number]] }; // [[south, west], [north, east]]

// Moves the map when `target` changes: to a point, or to fit an area.
export function FlyTo({ target }: { target: MapTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("bounds" in target) {
      map.flyToBounds(target.bounds, {
        animate: !reduce,
        duration: 0.8,
        // Room for the floating search bar above and the controls below.
        paddingTopLeft: [48, map.getSize().x < 640 ? 150 : 170],
        paddingBottomRight: [80, 100],
        maxZoom: 14,
      });
    } else {
      map.flyTo(target.center, target.zoom, { animate: !reduce, duration: 0.8 });
    }
  }, [map, target]);
  return null;
}

// Job card on the map: sponsor logo (or initials), job title and sponsor.
// Built with DOM APIs (textContent, img.src) so sponsor-written text can never
// inject HTML.
export function jobCardIcon(
  job: { title: string; sponsorName: string; logoUrl: string | null; initials: string },
  selected = false,
) {
  const el = document.createElement("span");
  el.className = selected ? "wm-card wm-card-selected" : "wm-card";
  const logo = document.createElement("span");
  logo.className = "wm-card-logo";
  if (job.logoUrl) {
    const img = document.createElement("img");
    img.src = job.logoUrl;
    img.alt = "";
    img.loading = "lazy";
    logo.append(img);
  } else {
    logo.textContent = job.initials;
  }
  const text = document.createElement("span");
  text.className = "wm-card-text";
  const title = document.createElement("span");
  title.className = "wm-card-title";
  title.textContent = job.title;
  const sponsor = document.createElement("span");
  sponsor.className = "wm-card-sponsor";
  sponsor.textContent = job.sponsorName;
  text.append(title, sponsor);
  el.append(logo, text);
  return L.divIcon({ html: el, className: "wm-pin-wrap", iconSize: undefined, iconAnchor: [0, 0] });
}

// Admin overview pins (no sponsor details needed there).
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

// ------------------------------------------------------------------ design map

// The light vector map (MapTiler Streets v2 restyled, see lib/map/vector-style),
// or satellite. MapLibre draws the base map; Leaflet keeps the pins on top.
export function VectorBase({ variant = "light" }: { variant?: "light" | "satellite" }) {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;
    (async () => {
      const [{ maplibreGL }] = await Promise.all([
        import("@maplibre/maplibre-gl-leaflet"),
        import("maplibre-gl/dist/maplibre-gl.css"),
      ]);
      let style: string | StyleSpecification = satelliteStyleUrl();
      if (variant === "light") {
        try {
          const res = await fetch(streetsStyleUrl());
          if (!res.ok) throw new Error(String(res.status));
          style = lightStyle((await res.json()) as StyleSpecification);
        } catch {
          return; // Offline or key refused: the land-coloured background stays.
        }
      }
      if (cancelled) return;
      layer = maplibreGL({ style, attributionControl: false });
      layer.addTo(map);
    })();
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, variant]);
  return null;
}

const el = (tag: string, className: string) => {
  const node = document.createElement(tag);
  node.className = className;
  return node;
};

// A job on the design map: white pill with a tinted role icon and a short
// label, and a dot on the exact point. Built with DOM APIs (textContent) so
// sponsor-written text can never inject HTML.
export function jobPillIcon(
  job: { label: string; isNew?: boolean },
  state: { selected?: boolean; pending?: boolean; small?: boolean } = {},
) {
  const root = el("span", state.small ? "wm-p wm-p-sm" : "wm-p");
  if (state.selected) root.append(el("span", "wm-p-pulse"));
  root.append(el("span", "wm-p-dot"));
  const pill = el(
    "span",
    `wm-p-pill${state.selected ? " wm-p-on" : ""}${state.pending ? " wm-p-pending" : ""}`,
  );
  const icon = el("span", "wm-p-icon");
  icon.append(iconNode("briefcase", 16, 2.2));
  const text = el("span", "wm-p-label");
  text.textContent = job.label;
  pill.append(icon, text);
  if (job.isNew) pill.append(el("span", "wm-p-new"));
  root.append(pill);
  return L.divIcon({
    html: root,
    className: "wm-pin-wrap",
    iconSize: undefined,
    iconAnchor: [0, 0],
  });
}

// Pins within 40px merge: a white disc with the count in blue, a soft blue
// halo and small badges for the jobs inside.
export function wmClusterIcon(cluster: L.MarkerCluster) {
  const root = el("span", "wm-c");
  const count = cluster.getChildCount();
  root.textContent = String(count);
  const badges = el("span", "wm-c-badges");
  for (let i = 0; i < Math.min(count, 2); i++) {
    const badge = el("span", "wm-c-badge");
    badge.append(iconNode("briefcase", 12, 2.4));
    badges.append(badge);
  }
  root.append(badges);
  return L.divIcon({ html: root, className: "wm-pin-wrap", iconSize: L.point(58, 58) });
}

// "You are here": a blue dot with a white ring inside an accuracy circle.
export const youAreHereIcon = (size = 120) =>
  L.divIcon({
    html: `<span class="wm-you" style="--wm-acc:${size}px"><span></span></span>`,
    className: "wm-pin-wrap",
    iconSize: L.point(0, 0),
    iconAnchor: L.point(0, 0),
  });
