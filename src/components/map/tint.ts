import type { Map as MapLibreMap } from "maplibre-gl";

// Soft pastel tint over OpenFreeMap "positron" (light) and "dark": blue water,
// green parks, warm land. Keeps the map calm so the job pins stand out.
const LIGHT = {
  background: "#f6f4ef",
  water: "#bcdcf5",
  park: "#d9efd3",
  wood: "#cfe8c8",
  sand: "#f3ead6",
};
const DARK = {
  background: "#0f172a",
  water: "#1d3557",
  park: "#1c3a2e",
  wood: "#1a3429",
  sand: "#2a2a24",
};

export function applyMapTint(map: MapLibreMap, dark: boolean) {
  const colors = dark ? DARK : LIGHT;
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    const set = (prop: string, value: string) => {
      try {
        map.setPaintProperty(
          layer.id,
          prop as Parameters<MapLibreMap["setPaintProperty"]>[1],
          value,
        );
      } catch {
        // Layer without that paint property; ignore.
      }
    };
    if (layer.type === "background") set("background-color", colors.background);
    else if (layer.type === "fill" && id.includes("water")) set("fill-color", colors.water);
    else if (layer.type === "fill" && (id.includes("park") || id.includes("grass")))
      set("fill-color", colors.park);
    else if (layer.type === "fill" && id.includes("wood")) set("fill-color", colors.wood);
    else if (layer.type === "fill" && (id.includes("sand") || id.includes("beach")))
      set("fill-color", colors.sand);
  }
}
