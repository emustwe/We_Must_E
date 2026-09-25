import { clientEnv } from "@/lib/env";
import { cityFromContext } from "@/lib/geo/countries";
import type { Bounds } from "@/lib/jobs/meta";

// MapTiler Geocoding, called from the browser with the domain-restricted key.
// English names.
const BASE = "https://api.maptiler.com/geocoding";

export type Place = {
  label: string;
  lat: number;
  lng: number;
  countryCode: string | null;
  city: string | null;
  bbox: [number, number, number, number] | null; // west, south, east, north
};

type Feature = {
  place_name?: string;
  text?: string;
  center?: [number, number];
  bbox?: [number, number, number, number];
  properties?: { country_code?: string };
  context?: { id?: string; text?: string; country_code?: string }[];
};

const trimCountry = (label: string) => label.replace(/,\s*[^,]+$/, "");

function toPlace(feature: Feature): Place | null {
  if (!feature.center) return null;
  const code =
    feature.properties?.country_code ??
    feature.context?.find((c) => c.id?.startsWith("country."))?.country_code ??
    null;
  return {
    label: feature.place_name ?? feature.text ?? "",
    lng: feature.center[0],
    lat: feature.center[1],
    countryCode: code && /^[a-z]{2}$/i.test(code) ? code.toUpperCase() : null,
    city: cityFromContext(feature.context),
    bbox: feature.bbox ?? null,
  };
}

async function query(path: string, params: Record<string, string>, signal?: AbortSignal) {
  const search = new URLSearchParams({
    key: clientEnv.NEXT_PUBLIC_GEOCODING_API_KEY,
    language: "en",
    ...params,
  });
  const res = await fetch(`${BASE}/${path}.json?${search}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: Feature[] };
  return (data.features ?? []).map(toPlace).filter((p): p is Place => Boolean(p));
}

// Places matching the text, optionally inside one country.
export async function searchPlaces(
  text: string,
  bounds: Bounds,
  signal?: AbortSignal,
  country?: string | null,
): Promise<Place[]> {
  const q = text.trim();
  if (q.length < 2) return [];
  const world = bounds.west <= -179 && bounds.east >= 179;
  return query(
    encodeURIComponent(q),
    {
      limit: "5",
      ...(world ? {} : { bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}` }),
      ...(country ? { country: country.toLowerCase() } : {}),
    },
    signal,
  );
}

// The area of a country, to fit the map to it.
export async function findCountry(name: string, code: string, signal?: AbortSignal) {
  const [place] = await query(
    encodeURIComponent(name),
    { types: "country", limit: "1", country: code.toLowerCase() },
    signal,
  );
  return place ?? null;
}

// Place name, country and city for a point, e.g. "Marina Walk, Dubai".
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal) {
  const [place] = await query(`${lng},${lat}`, { limit: "1" }, signal);
  if (!place) return null;
  return { ...place, label: trimCountry(place.label).slice(0, 200) || place.label.slice(0, 200) };
}
