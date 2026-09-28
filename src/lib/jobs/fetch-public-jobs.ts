import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bounds } from "@/lib/jobs/meta";
import type { Database } from "@/types/database";

type Row = Database["public"]["Functions"]["get_public_jobs"]["Returns"][number];

// The API returns at most 1,000 rows per request (Supabase "max rows"), so the
// public list comes in pages; get_public_jobs orders by (published_at, id), so
// pages never overlap, and it stops at 5,000 jobs.
const PAGE = 1000;
const MAX = 5000;
// A request that hangs (a bad mobile connection) is given up after this long
// and tried again, so one stuck request never keeps the map empty.
const TIMEOUT_MS = 8000;
const TRIES = 3;

export async function fetchPublicJobs(
  client: SupabaseClient<Database>,
  b: Bounds,
): Promise<{ rows: Row[]; error: unknown }> {
  const rows: Row[] = [];
  for (let from = 0; from < MAX; from += PAGE) {
    let data: Row[] | null = null;
    let error: unknown = null;
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const result = await client
        .rpc("get_public_jobs", {
          min_lat: b.south,
          min_lng: b.west,
          max_lat: b.north,
          max_lng: b.east,
        })
        .range(from, from + PAGE - 1)
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      data = result.data;
      error = result.error;
      if (!error) break;
    }
    if (error) return { rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return { rows, error: null };
}
