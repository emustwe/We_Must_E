"use client";

import dynamic from "next/dynamic";

export const JobLocation = dynamic(() => import("@/components/sponsors/job-location-canvas"), {
  ssr: false,
  loading: () => <div className="size-full bg-wm-land" aria-hidden="true" />,
});
