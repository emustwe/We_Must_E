"use client";

import { Check, Loader2, Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { getVideoUrl, reviewApplication } from "@/actions/admin-applications";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/result";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function ReviewPanel({
  applicationId,
  status,
  notes,
}: {
  applicationId: string;
  status: "submitted" | "approved" | "rejected";
  notes: string;
}) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [text, setText] = useState(notes);
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();

  async function decide(decision: "approved" | "rejected") {
    const approve = decision === "approved";
    const yes = await ask({
      title: approve ? t("approve") : t("reject"),
      body: approve ? t("approveConfirm") : t("rejectConfirm"),
      confirmLabel: approve ? t("approve") : t("reject"),
      tone: approve ? "default" : "danger",
    });
    if (!yes) return;
    startTransition(async () => {
      const result = await reviewApplication({ applicationId, decision, notes: text });
      if (!result.ok) toast.error(te(result.error));
      else toast.success(decision === "approved" ? t("approvedToast") : t("rejectedToast"));
    });
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("reviewNotes")}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={t("reviewNotesPlaceholder")}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
        />
      </label>
      <p className="text-xs text-muted-foreground">{t("reviewNotesHint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="touch"
          className="flex-1"
          disabled={pending || status === "approved"}
          onClick={() => decide("approved")}
        >
          <Check className="size-4" aria-hidden="true" />
          {t("approve")}
        </Button>
        <Button
          size="touch"
          variant="secondary"
          className="flex-1 text-destructive"
          disabled={pending || status === "rejected"}
          onClick={() => decide("rejected")}
        >
          <X className="size-4" aria-hidden="true" />
          {t("reject")}
        </Button>
      </div>
    </div>
  );
}

// Asks the server for a 5-minute link (the view is logged), then plays it.
// `load` is the admin's or the sponsor's server action.
export function VideoViewer({
  videoId,
  load = getVideoUrl,
}: {
  videoId: string;
  load?: (input: { videoId: string }) => Promise<ActionResult<{ url: string }>>;
}) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (url) {
    return (
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="aspect-video w-full rounded-2xl bg-black"
      />
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await load({ videoId });
          if (!result.ok) toast.error(te(result.error));
          else setUrl(result.data.url);
        })
      }
      className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-foreground/90 text-background"
    >
      {pending ? (
        <Loader2 className="size-8 animate-spin" aria-hidden="true" />
      ) : (
        <Play className="size-8 fill-current" aria-hidden="true" />
      )}
      <span className="text-sm font-semibold">{t("playVideo")}</span>
      <span className="text-xs opacity-70">{t("viewLogged")}</span>
    </button>
  );
}
