"use client";

import { useEffect, useState } from "react";
import { fetchPublicJobs } from "@/lib/jobs/fetch-public-jobs";
import { toPublicJob, type PublicJob } from "@/lib/jobs/public-job";
import type { Bounds } from "@/lib/jobs/meta";
import { createClient } from "@/lib/supabase/client";

const FALLBACK_REFRESH_MS = 60_000;
// At most one reload this often, whatever arrives on the channel.
const MIN_RELOAD_GAP_MS = 3_000;
// Until the first list has loaded, a failed load is tried again this soon.
const RETRY_EMPTY_MS = 3_000;

// The public job list, kept up to date while the page is open: the database
// broadcasts "changed" on the private "public-jobs" channel (anyone may
// listen, only the database may send) whenever the map
// changes (a job is approved, closed, hidden...), and we reload the list.
// There is also a slow refresh and a refresh when the tab comes back, in case
// the live connection drops.
export function useLiveJobs(initial: PublicJob[], bounds: Bounds) {
  const [jobs, setJobs] = useState(initial);
  const { south, west, north, east } = bounds;
  // The server couldn't load the list (a bad connection): load it here at
  // once, and keep trying until it works.
  const startEmpty = initial.length === 0;

  useEffect(() => {
    const supabase = createClient();
    let timer: number | undefined;
    let cancelled = false;
    let last = 0;
    let loaded = !startEmpty;

    async function reload() {
      last = Date.now();
      const { rows, error } = await fetchPublicJobs(supabase, { south, west, north, east });
      if (cancelled) return;
      if (!error) {
        loaded = true;
        setJobs((prev) => keepUnchanged(prev, rows.map(toPublicJob)));
      } else if (!loaded) {
        timer = window.setTimeout(reload, RETRY_EMPTY_MS);
      }
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
    if (startEmpty) void reload();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [south, west, north, east, startEmpty]);

  return jobs;
}

// A reload returns every job again: keep the jobs that didn't change (and the
// whole list if nothing did), so the map only redraws what is new.
function keepUnchanged(prev: PublicJob[], next: PublicJob[]) {
  const before = new Map(prev.map((j) => [j.id, j]));
  let same = prev.length === next.length;
  const merged = next.map((job, i) => {
    const old = before.get(job.id);
    const keep = old !== undefined && JSON.stringify(old) === JSON.stringify(job);
    if (!keep || prev[i] !== old) same = false;
    return keep ? old : job;
  });
  return same ? prev : merged;
}
