import type { Database } from "@/types/database";

export type JobStatus = Database["public"]["Enums"]["job_status"];

export type Bounds = { south: number; west: number; north: number; east: number };

export function parseBounds(value: string): Bounds {
  const [south, west, north, east] = value.split(",").map(Number);
  return { south, west, north, east };
}

export function isInside(bounds: Bounds, lat: number, lng: number) {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

// Great-circle distance in km.
export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
