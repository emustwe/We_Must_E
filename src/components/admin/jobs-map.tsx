"use client";

import dynamic from "next/dynamic";

// Admin maps (exact points). Client-only: Leaflet needs `window`.
export const AdminMap = dynamic(() => import("@/components/admin/admin-map-canvas"), {
  ssr: false,
  loading: () => <div className="size-full bg-wm-land" aria-hidden="true" />,
});
