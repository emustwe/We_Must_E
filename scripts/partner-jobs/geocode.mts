// Looks up every city and area in cities.mts once (OpenStreetMap Nominatim,
// one request per second as its usage policy asks) and saves the checked
// points in places.json. An area is kept only if it is found in the right
// country and within 30 km of its city's centre.
//
//   npx tsx scripts/partner-jobs/geocode.mts
//
// Already saved places are not looked up again.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CITIES, COUNTRY_NAMES } from "./cities.mjs";

export type Places = Record<
  string,
  { center: [number, number]; areas: { name: string; lat: number; lng: number }[] }
>;

const FILE = join(import.meta.dirname, "places.json");
const places: Places = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
const UA = "Wemuste job setup (https://www.wemuste.com; emustwe@gmail.com)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Areas are searched only within ~35 km of their city's centre.
async function find(
  q: string,
  country: string,
  near?: [number, number],
): Promise<[number, number] | null> {
  await sleep(1100);
  const box: Record<string, string> = near
    ? {
        viewbox: [near[1] - 0.35, near[0] + 0.35, near[1] + 0.35, near[0] - 0.35].join(","),
        bounded: "1",
      }
    : {};
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q,
    countrycodes: country.toLowerCase(),
    format: "jsonv2",
    limit: "1",
    ...box,
  })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`${res.status} for ${q}`);
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? [Number(hit.lat), Number(hit.lon)] : null;
}

function km([a, b]: [number, number], [c, d]: [number, number]) {
  const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r);
  const y = (c - a) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

for (const c of CITIES) {
  const key = `${c.country}:${c.city}`;
  if (places[key]?.areas.length === c.areas.length) continue;
  const country = COUNTRY_NAMES[c.country];
  const center =
    c.center ?? places[key]?.center ?? (await find(`${c.city}, ${country}`, c.country));
  if (!center) throw new Error(`city not found: ${key}`);
  const areas = [];
  for (const name of c.areas) {
    const known = places[key]?.areas.find((a) => a.name === name);
    if (known) {
      areas.push(known);
      continue;
    }
    const p = await find(`${name}, ${c.city}, ${country}`, c.country, center);
    if (!p) console.log(`  not found: ${name}, ${c.city}`);
    else if (km(p, center) > 30)
      console.log(`  too far (${Math.round(km(p, center))} km): ${name}, ${c.city}`);
    else areas.push({ name, lat: +p[0].toFixed(5), lng: +p[1].toFixed(5) });
  }
  places[key] = { center: [+center[0].toFixed(5), +center[1].toFixed(5)], areas };
  writeFileSync(FILE, `${JSON.stringify(places, null, 2)}\n`);
  console.log(`${key}: ${areas.length}/${c.areas.length} areas`);
}
