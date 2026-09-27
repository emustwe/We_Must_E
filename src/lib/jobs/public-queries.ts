import "server-only";
import { jobAreaBounds } from "@/lib/jobs/area";
import { fetchPublicJobs } from "@/lib/jobs/fetch-public-jobs";
import { toPublicJob, type PublicJob } from "@/lib/jobs/public-job";
import { logError } from "@/lib/log";
import { createPublicClient } from "@/lib/supabase/public";

export type { PublicJob };

// Published jobs of approved sponsors in the service area, with the rounded
// (~300 m) public pin, country and city only. Runs as
// anon, so it can see exactly what the public can.
export async function getPublicJobs(): Promise<PublicJob[]> {
  const { rows, error } = await fetchPublicJobs(createPublicClient(), jobAreaBounds());
  if (error) {
    logError("public-jobs", error);
    return [];
  }
  return rows.map(toPublicJob);
}
