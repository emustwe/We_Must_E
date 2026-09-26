import type { Database } from "@/types/database";

type Row = Database["public"]["Functions"]["get_public_jobs"]["Returns"][number];

export type PublicJob = {
  id: string;
  title: string;
  description: string;
  locationLabel: string;
  lat: number;
  lng: number;
  publishedAt: string;
  sponsorName: string;
  sponsorLogo: string | null;
  countryCode: string | null;
  countryName: string | null;
  city: string | null;
  // Shows what a job looks like; not open for applications.
  isExample: boolean;
};

// get_public_jobs() row -> what the map uses (only the public, rounded pin).
export const toPublicJob = (j: Row): PublicJob => ({
  id: j.id,
  title: j.title,
  description: j.description,
  locationLabel: j.location_label,
  lat: j.public_lat,
  lng: j.public_lng,
  publishedAt: j.published_at,
  sponsorName: j.sponsor_name,
  sponsorLogo: j.sponsor_logo,
  countryCode: j.country_code,
  countryName: j.country_name,
  city: j.city,
  isExample: j.is_example,
});

// "Dubai Marina, Dubai, United Arab Emirates" without repeating a part the
// place name already contains.
export function placeLine(
  job: { locationLabel: string; city: string | null; countryName: string | null },
  withCountry = true,
) {
  const parts = [job.locationLabel];
  const has = (x: string) => parts.some((p) => p.toLowerCase().includes(x.toLowerCase()));
  if (job.city && !has(job.city)) parts.push(job.city);
  if (withCountry && job.countryName && !has(job.countryName)) parts.push(job.countryName);
  return parts.join(", ");
}
