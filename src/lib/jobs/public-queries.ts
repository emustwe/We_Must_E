import "server-only";
import { jobAreaBounds } from "@/lib/jobs/area";
import { toPublicJob, type PublicJob } from "@/lib/jobs/public-job";
import { logError } from "@/lib/log";
import { createPublicClient } from "@/lib/supabase/public";

export type { PublicJob };

// Published jobs of approved sponsors in the service area, with the rounded
// (~300 m) public pin, sponsor name/logo, country and city only. Runs as
// anon, so it can see exactly what the public can.
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
  return (data ?? []).map(toPublicJob);
}
