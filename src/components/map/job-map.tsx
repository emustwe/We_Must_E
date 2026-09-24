"use client";

import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { applyMapTint } from "@/components/map/tint";
import { CATEGORY_META, formatPinAmount, type JobCategory } from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  category: JobCategory;
  payMin: number;
  requested?: boolean;
};

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

// Full-bleed job map. MapLibre is loaded lazily so pages render before the
// ~250 kB map library arrives on slow connections.
export function JobMap({
  pins,
  selectedId,
  onSelect,
  center,
  zoom = 11,
  className,
  pickMode,
  picked,
  onPick,
  padding,
  fitKey,
  fitPadding,
}: {
  pins: MapPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  center: [number, number];
  zoom?: number;
  className?: string;
  /** Tap-to-place mode used when an employer sets a job location. */
  pickMode?: boolean;
  picked?: { lat: number; lng: number } | null;
  onPick?: (point: { lat: number; lng: number }) => void;
  /** Space kept clear for floating UI when centring on a pin. */
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  /** When this value changes, zoom to fit all pins. */
  fitKey?: string;
  /** Padding for fitting pins, per layout. */
  fitPadding?: (desktop: boolean) => { top: number; bottom: number; left: number; right: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const pickMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onPickRef.current = onPick;
  });

  // Create the map once.
  useEffect(() => {
    const markers = markersRef.current;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      // See scripts/copy-maplibre-worker.mjs.
      maplibre.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
      libRef.current = maplibre;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      map = new maplibre.Map({
        container: containerRef.current,
        style: dark ? STYLE_DARK : STYLE_LIGHT,
        center,
        zoom,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      map.touchZoomRotate.disableRotation();
      map.on("click", (event) => {
        if (onPickRef.current) onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });
      // Follow container size changes (sheets, panels, orientation).
      const observer = new ResizeObserver(() => map?.resize());
      observer.observe(containerRef.current);
      map.once("remove", () => observer.disconnect());
      map.on("load", () => {
        if (cancelled || !map) return;
        applyMapTint(map, dark);
        setReady(true);
      });
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markers.clear();
    };
    // Center/zoom are initial values only; later changes use flyTo below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync job pins.
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = libRef.current;
    if (!map || !maplibre || !ready) return;
    const existing = markersRef.current;
    const nextIds = new Set(pins.map((pin) => pin.id));

    for (const [id, { marker }] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }
    for (const pin of pins) {
      let entry = existing.get(pin.id);
      if (!entry) {
        const el = document.createElement("button");
        el.type = "button";
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current?.(pin.id);
        });
        const marker = new maplibre.Marker({ element: el, anchor: "bottom" })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
        entry = { marker, el };
        existing.set(pin.id, entry);
      }
      const selected = pin.id === selectedId;
      entry.el.className = cn(
        "shadow-pin flex items-center gap-1 rounded-full border-2 px-2 py-1 text-sm font-bold transition-transform duration-150",
        selected
          ? "z-10 scale-110 border-foreground bg-foreground text-background"
          : "border-background bg-background text-foreground hover:scale-105",
      );
      entry.el.setAttribute("aria-label", `${pin.category} job`);
      entry.el.setAttribute("aria-pressed", String(selected));
      entry.el.innerHTML = "";
      const emoji = document.createElement("span");
      emoji.textContent = CATEGORY_META[pin.category].emoji;
      emoji.setAttribute("aria-hidden", "true");
      const amount = document.createElement("span");
      amount.textContent = formatPinAmount(pin.payMin);
      entry.el.append(emoji, amount);
      if (pin.requested) {
        const dot = document.createElement("span");
        dot.className = "size-2 rounded-full bg-success";
        entry.el.append(dot);
      }
      entry.marker.getElement().style.zIndex = selected ? "10" : "1";
    }
  }, [pins, selectedId, ready]);

  // Centre on the selected pin, leaving room for floating cards.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;
    map.easeTo({
      center: [pin.lng, pin.lat],
      zoom: Math.max(map.getZoom(), 13),
      padding: { top: 0, bottom: 0, left: 0, right: 0, ...padding },
      duration: 400,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  // Fit all pins (first load and whenever the filter changes).
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = libRef.current;
    if (!map || !maplibre || !ready || fitKey === undefined || pins.length === 0) return;
    const bounds = new maplibre.LngLatBounds();
    for (const pin of pins) bounds.extend([pin.lng, pin.lat]);
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    map.fitBounds(bounds, {
      padding: fitPadding?.(desktop) ?? 60,
      maxZoom: 14,
      duration: 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, ready]);

  // Follow external centre changes (city switcher) when not fitting to pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || (fitKey !== undefined && pins.length > 0)) return;
    map.flyTo({ center, zoom, duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, zoom, ready]);

  // Location picker marker.
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = libRef.current;
    if (!map || !maplibre || !ready || !pickMode) return;
    if (!picked) {
      pickMarkerRef.current?.remove();
      pickMarkerRef.current = null;
      return;
    }
    if (!pickMarkerRef.current) {
      const el = document.createElement("div");
      el.className =
        "shadow-pin flex size-10 items-center justify-center rounded-full border-4 border-background bg-primary text-lg";
      el.textContent = "📍";
      // Coordinates must be set before addTo().
      pickMarkerRef.current = new maplibre.Marker({ element: el, anchor: "bottom" })
        .setLngLat([picked.lng, picked.lat])
        .addTo(map);
    }
    pickMarkerRef.current.setLngLat([picked.lng, picked.lat]);
  }, [picked, pickMode, ready]);

  return (
    // Callers position the map (e.g. "absolute inset-0" or "relative h-72").
    <div className={cn("overflow-hidden bg-muted", className)}>
      {/* Inline position: maplibre-gl.css sets .maplibregl-map { position: relative }. */}
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0 }}
        className={cn(pickMode && "cursor-crosshair")}
      />
      {!ready ? (
        <div
          className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_30%_40%,var(--color-border)_0,transparent_60%)]"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
