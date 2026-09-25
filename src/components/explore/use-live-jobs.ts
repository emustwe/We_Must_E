"use client";

import { useEffect, useState } from "react";
import { toPublicJob, type PublicJob } from "@/lib/jobs/public-job";
import type { Bounds } from "@/lib/jobs/meta";
import { createClient } from "@/lib/supabase/client";

const FALLBACK_REFRESH_MS = 60_000;

// The public job list, kept up to date while the page is open: the database
// broadcasts "changed" on the public "public-jobs" channel whenever the map
// changes (a job is approved, closed, hidden...), and we reload the list.
// There is also a slow refresh and a refresh when the tab comes back, in case
// the live connection drops.
export function useLiveJobs(initial: PublicJob[], bounds: Bounds) {
  const [jobs, setJobs] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    let timer: number | undefined;
    let cancelled = false;

    async function reload() {
      const { data, error } = await supabase.rpc("get_public_jobs", {
        min_lat: bounds.south,
        min_lng: bounds.west,
        max_lat: bounds.north,
        max_lng: bounds.east,
      });
      if (!cancelled && !error && data) setJobs(data.map(toPublicJob));
    }
    // Several changes in a row become one reload.
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reload, 300);
    };

    const channel = supabase
      .channel("public-jobs")
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
  }, [bounds.south, bounds.west, bounds.north, bounds.east]);

  return jobs;
}
