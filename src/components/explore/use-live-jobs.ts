"use client";

import { useEffect, useState } from "react";
import { fetchPublicJobs } from "@/lib/jobs/fetch-public-jobs";
import { toPublicJob, type PublicJob } from "@/lib/jobs/public-job";
import type { Bounds } from "@/lib/jobs/meta";
import { createClient } from "@/lib/supabase/client";

const FALLBACK_REFRESH_MS = 60_000;
// At most one reload this often, whatever arrives on the channel.
const MIN_RELOAD_GAP_MS = 3_000;

// The public job list, kept up to date while the page is open: the database
// broadcasts "changed" on the private "public-jobs" channel (anyone may
// listen, only the database may send) whenever the map
// changes (a job is approved, closed, hidden...), and we reload the list.
// There is also a slow refresh and a refresh when the tab comes back, in case
// the live connection drops.
export function useLiveJobs(initial: PublicJob[], bounds: Bounds) {
  const [jobs, setJobs] = useState(initial);
  const { south, west, north, east } = bounds;

  useEffect(() => {
    const supabase = createClient();
    let timer: number | undefined;
    let cancelled = false;
    let last = 0;

    async function reload() {
      last = Date.now();
      const { rows, error } = await fetchPublicJobs(supabase, { south, west, north, east });
      if (!cancelled && !error) setJobs(rows.map(toPublicJob));
    }
    // Several changes in a row become one reload, and reloads are spaced out.
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reload, Math.max(300, last + MIN_RELOAD_GAP_MS - Date.now()));
    };

    const channel = supabase
      .channel("public-jobs", { config: { private: true } })
      .on("broadcast", { event: "changed" }, soon)
      .subscribe();
    const interval = window.setInterval(soon, FALLBACK_REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && soon();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [south, west, north, east]);

  return jobs;
}
