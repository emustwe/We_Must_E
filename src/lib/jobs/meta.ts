import type { Database } from "@/types/database";

export type JobStatus = Database["public"]["Enums"]["job_status"];

// Emirate picker when location permission is denied.
export const CITIES = [
  { id: "Dubai", center: [25.2048, 55.2708] as [number, number], zoom: 11 },
  { id: "Abu Dhabi", center: [24.4539, 54.3773] as [number, number], zoom: 11 },
  { id: "Sharjah", center: [25.3463, 55.4033] as [number, number], zoom: 12 },
  { id: "Ajman", center: [25.4052, 55.5136] as [number, number], zoom: 12 },
  { id: "Ras Al Khaimah", center: [25.8007, 55.9432] as [number, number], zoom: 12 },
  { id: "Fujairah", center: [25.1288, 56.3264] as [number, number], zoom: 12 },
  { id: "Umm Al Quwain", center: [25.5647, 55.555] as [number, number], zoom: 12 },
] as const;

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
