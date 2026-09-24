"use client";

import { Pause, Play, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { setJobStatus } from "@/actions/employer";
import { Button } from "@/components/ui/button";
import type { JobStatus } from "@/lib/jobs/meta";

export function JobStatusControls({ jobId, status }: { jobId: string; status: JobStatus }) {
  const t = useTranslations("employerJob");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();

  function change(next: "open" | "paused" | "closed") {
    if (next === "closed" && !window.confirm(t("closeConfirm"))) return;
    startTransition(async () => {
      const result = await setJobStatus({ jobId, status: next });
      if (!result.ok) toast.error(te(result.error));
    });
  }

  if (status === "removed" || status === "closed") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" ? (
        <Button variant="secondary" size="pill" disabled={pending} onClick={() => change("paused")}>
          <Pause className="size-4" aria-hidden="true" />
          {t("pause")}
        </Button>
      ) : (
        <Button variant="secondary" size="pill" disabled={pending} onClick={() => change("open")}>
          <Play className="size-4" aria-hidden="true" />
          {t("reopen")}
        </Button>
      )}
      <Button
        variant="ghost"
        size="pill"
        disabled={pending}
        onClick={() => change("closed")}
        className="text-destructive"
      >
        <XCircle className="size-4" aria-hidden="true" />
        {t("close")}
      </Button>
    </div>
  );
}
