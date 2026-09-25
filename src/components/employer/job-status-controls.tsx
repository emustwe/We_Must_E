"use client";

import { XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { closeJob } from "@/actions/employer";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { JobStatus } from "@/lib/jobs/meta";

// Employers can close a live job. Hiding, removing and re-opening are admin-only.
export function JobStatusControls({ jobId, status }: { jobId: string; status: JobStatus }) {
  const t = useTranslations("employerJob");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const ask = useConfirm();

  if (status !== "published") return null;
  return (
    <Button
      variant="ghost"
      size="pill"
      disabled={pending}
      className="text-destructive"
      onClick={async () => {
        if (
          !(await ask({
            title: t("close"),
            body: t("closeConfirm"),
            tone: "danger",
            confirmLabel: t("close"),
          }))
        )
          return;
        startTransition(async () => {
          const result = await closeJob({ jobId, status: "closed" });
          if (!result.ok) toast.error(te(result.error));
          else toast.success(t("closedToast"));
        });
      }}
    >
      <XCircle className="size-4" aria-hidden="true" />
      {t("close")}
    </Button>
  );
}
