"use client";

import { Loader2, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { getVideoUrl } from "@/actions/admin-applications";
import type { ActionResult } from "@/lib/result";

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
