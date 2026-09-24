"use client";

import dynamic from "next/dynamic";

// Admin overview map (exact points). Client-only: Leaflet needs `window`.
export const AdminJobsMap = dynamic(() => import("@/components/admin/jobs-map-canvas"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" aria-hidden="true" />,
});
