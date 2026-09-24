import { clientEnv } from "@/lib/env";
import type { Bounds } from "@/lib/jobs/meta";

// MapTiler Geocoding, called from the browser with the domain-restricted key.
// English names; results limited to the service area.
const BASE = "https://api.maptiler.com/geocoding";

export type Place = { label: string; lat: number; lng: number };

type Feature = { place_name?: string; text?: string; center?: [number, number] };

function toPlace(feature: Feature): Place | null {
  if (!feature.center) return null;
  return {
    label: feature.place_name ?? feature.text ?? "",
    lng: feature.center[0],
    lat: feature.center[1],
  };
}

export async function searchPlaces(
  query: string,
  bounds: Bounds,
  signal?: AbortSignal,
): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    key: clientEnv.NEXT_PUBLIC_GEOCODING_API_KEY,
    language: "en",
    limit: "5",
    bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
  });
  const res = await fetch(`${BASE}/${encodeURIComponent(q)}.json?${params}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: Feature[] };
  return (data.features ?? []).map(toPlace).filter((p): p is Place => Boolean(p));
}

// Short, human place name for a point, e.g. "Marina Promenade, Dubai".
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    key: clientEnv.NEXT_PUBLIC_GEOCODING_API_KEY,
    language: "en",
    limit: "1",
  });
  const res = await fetch(`${BASE}/${lng},${lat}.json?${params}`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: Feature[] };
  const feature = data.features?.[0];
  if (!feature?.place_name) return null;
  // Drop the trailing country for a shorter label.
  return feature.place_name
    .replace(/,\s*(United Arab Emirates|الإمارات العربية المتحدة)$/, "")
    .slice(0, 200);
}
