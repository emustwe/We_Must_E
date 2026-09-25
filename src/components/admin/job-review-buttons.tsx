"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adminReviewJob } from "@/actions/admin-panel";
import { Button } from "@/components/ui/button";

// Approve (the job goes live on the map at once) or send it back with a
// reason the sponsor sees.
export function JobReviewButtons({ jobId }: { jobId: string }) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const review = (approve: boolean) =>
    startTransition(async () => {
      const result = await adminReviewJob({ jobId, approve, note: approve ? "" : note });
      if (!result.ok) toast.error(te(result.error));
      else toast.success(approve ? t("jobApprovedToast") : t("jobRejectedToast"));
    });

  if (rejecting) {
    return (
      <div className="w-full space-y-2">
        <label className="block space-y-1 text-sm font-medium">
          <span>{t("rejectReason")}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("rejectReasonPlaceholder")}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            size="pill"
            variant="destructive"
            disabled={pending || !note.trim()}
            onClick={() => review(false)}
          >
            {t("sendBack")}
          </Button>
          <Button size="pill" variant="ghost" onClick={() => setRejecting(false)}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <Button size="pill" disabled={pending} onClick={() => review(true)}>
        <Check className="size-4" aria-hidden="true" />
        {t("approveJob")}
      </Button>
      <Button
        size="pill"
        variant="secondary"
        className="text-destructive"
        disabled={pending}
        onClick={() => setRejecting(true)}
      >
        <X className="size-4" aria-hidden="true" />
        {t("rejectJob")}
      </Button>
    </>
  );
}
