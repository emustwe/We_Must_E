import "server-only";
import { jobAreaBounds } from "@/lib/jobs/area";
import { logError } from "@/lib/log";
import { createPublicClient } from "@/lib/supabase/public";

export type PublicJob = {
  id: string;
  title: string;
  description: string;
  locationLabel: string;
  lat: number;
  lng: number;
  publishedAt: string;
};

// Published jobs of approved employers in the service area, with the rounded
// (~300 m) public pin only. Runs as anon, so RLS-level access is the public's.
export async function getPublicJobs(): Promise<PublicJob[]> {
  const b = jobAreaBounds();
  const { data, error } = await createPublicClient().rpc("get_public_jobs", {
    min_lat: b.south,
    min_lng: b.west,
    max_lat: b.north,
    max_lng: b.east,
  });
  if (error) {
    logError("public-jobs", error);
    return [];
  }
  return (data ?? []).map((j) => ({
    id: j.id,
    title: j.title,
    description: j.description,
    locationLabel: j.location_label,
    lat: j.public_lat,
    lng: j.public_lng,
    publishedAt: j.published_at,
  }));
}
