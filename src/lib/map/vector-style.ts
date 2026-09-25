import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import { clientEnv } from "@/lib/env";

// The job map's light style: MapTiler Streets v2, restyled to the design's
// colours (DESIGN_BRIEF "Map style (light)").
export const MAP_COLORS = {
  water: "#AED6F1",
  land: "#F4F5F2",
  blocks: "#EAECE7",
  buildings: "#E0E3DD",
  parks: "#CFE8C6",
  beach: "#EFE4C4",
  highway: "#FFD37F",
  highwayCasing: "#E9B955",
  street: "#FFFFFF",
  streetCasing: "#DDE0E4",
  metro: "#E5484D",
  label: "#4B5563",
} as const;

const key = () => clientEnv.NEXT_PUBLIC_GEOCODING_API_KEY;
export const streetsStyleUrl = () =>
  `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key())}`;
export const satelliteStyleUrl = () =>
  `https://api.maptiler.com/maps/hybrid/style.json?key=${encodeURIComponent(key())}`;

const FILL: Record<string, string> = {
  Background: MAP_COLORS.land,
  Meadow: MAP_COLORS.parks,
  Scrub: MAP_COLORS.parks,
  Crop: MAP_COLORS.land,
  Forest: MAP_COLORS.parks,
  Wood: MAP_COLORS.parks,
  Grass: MAP_COLORS.parks,
  Glacier: MAP_COLORS.land,
  // Most "sand" in the Gulf is desert, not beach: draw it as land.
  Sand: MAP_COLORS.land,
  Residential: MAP_COLORS.blocks,
  Industrial: MAP_COLORS.blocks,
  Cemetery: MAP_COLORS.parks,
  Hospital: MAP_COLORS.blocks,
  Stadium: MAP_COLORS.blocks,
  School: MAP_COLORS.blocks,
  "Airport zone": MAP_COLORS.blocks,
  Pedestrian: MAP_COLORS.street,
  Pier: MAP_COLORS.land,
  "Water intermittent": MAP_COLORS.water,
  Water: MAP_COLORS.water,
  Building: MAP_COLORS.buildings,
  Bridge: MAP_COLORS.street,
};

const LINE: Record<string, string> = {
  "River tunnel": MAP_COLORS.water,
  River: MAP_COLORS.water,
  Highway: MAP_COLORS.highway,
  "Highway outline": MAP_COLORS.highwayCasing,
  "Major road": MAP_COLORS.street,
  "Major road outline": MAP_COLORS.streetCasing,
  "Minor road": MAP_COLORS.street,
  "Minor road outline": MAP_COLORS.streetCasing,
  "Bridge outline": MAP_COLORS.streetCasing,
  "Tunnel outline": MAP_COLORS.streetCasing,
  Tunnel: MAP_COLORS.street,
  "Pier road": MAP_COLORS.street,
  "Major rail": MAP_COLORS.metro,
  "Minor rail": MAP_COLORS.metro,
  "Railway tunnel": MAP_COLORS.metro,
};

// Clutter the design leaves out: points of interest, house numbers, 3D.
const HIDE = new Set([
  "Building 3D",
  "Housenumber",
  "Oneway",
  "Major rail hatching",
  "Minor rail hatching",
  "Railway tunnel hatching",
  "Highway shield",
  "Highway shield (US)",
  "Highway shield interstate top (US)",
  "Highway shield interstate (US)",
  "Highway junction",
  "Public",
  "Sport",
  "Education",
  "Tourism",
  "Culture",
  "Shopping",
  "Food",
  "Transport",
  "Park",
  "Healthcare",
  "Airport gate",
  "Station",
]);

// District and town names: 13px, weight 700, #4B5563, 4px land-coloured halo.
const DISTRICT_LABELS = new Set(["Place labels", "Town labels", "City labels"]);

function restyleLayer(layer: LayerSpecification): LayerSpecification {
  if (HIDE.has(layer.id)) return { ...layer, layout: { ...layer.layout, visibility: "none" } };
  if (layer.type === "background" && FILL[layer.id]) {
    return { ...layer, paint: { ...layer.paint, "background-color": FILL[layer.id] } };
  }
  if (layer.type === "fill" && FILL[layer.id]) {
    return {
      ...layer,
      paint: {
        ...layer.paint,
        "fill-color": FILL[layer.id],
        ...(layer.id === "Building"
          ? { "fill-opacity": 1, "fill-outline-color": MAP_COLORS.buildings }
          : {}),
      },
    };
  }
  if (layer.type === "line" && LINE[layer.id]) {
    const rail = LINE[layer.id] === MAP_COLORS.metro;
    return {
      ...layer,
      paint: {
        ...layer.paint,
        "line-color": LINE[layer.id],
        ...(rail ? { "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 16, 3] } : {}),
      },
    } as LayerSpecification;
  }
  if (layer.type === "symbol" && DISTRICT_LABELS.has(layer.id)) {
    return {
      ...layer,
      layout: {
        ...layer.layout,
        "text-font": ["Roboto Bold", "Noto Sans Bold"],
        "text-size": 13,
        "text-transform": "none",
        "text-letter-spacing": 0,
      },
      paint: {
        ...layer.paint,
        "text-color": MAP_COLORS.label,
        "text-halo-color": MAP_COLORS.land,
        "text-halo-width": 4,
        "text-halo-blur": 0,
      },
    };
  }
  if (layer.type === "symbol" && layer.id === "Road labels") {
    return {
      ...layer,
      paint: { ...layer.paint, "text-color": "#6B7280", "text-halo-color": "#FFFFFF" },
    };
  }
  if (
    layer.type === "symbol" &&
    (layer.id === "Ocean labels" || layer.id === "Lake labels" || layer.id === "River labels")
  ) {
    return { ...layer, paint: { ...layer.paint, "text-color": "#4A83B5", "text-halo-width": 0 } };
  }
  return layer;
}

// English names first (the design's labels are in English).
const ENGLISH = ["coalesce", ["get", "name:en"], ["get", "name"]];

function inEnglish(layer: LayerSpecification): LayerSpecification {
  if (layer.type !== "symbol" || !layer.layout?.["text-field"]) return layer;
  return { ...layer, layout: { ...layer.layout, "text-field": ENGLISH } } as LayerSpecification;
}

export function lightStyle(style: StyleSpecification): StyleSpecification {
  return { ...style, layers: style.layers.map((l) => inEnglish(restyleLayer(l))) };
}
