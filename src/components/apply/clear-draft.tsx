"use client";

import { useEffect } from "react";
import { draftKey } from "@/components/apply/survey-step";

// The application is sent: forget the answers kept in this tab.
export function ClearDraft({ jobId }: { jobId: string }) {
  useEffect(() => {
    try {
      sessionStorage.removeItem(draftKey(jobId));
    } catch {
      // Storage blocked: nothing was kept.
    }
  }, [jobId]);
  return null;
}
