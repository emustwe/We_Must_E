"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { getCandidateVideoUrl } from "@/actions/sponsor-candidates";
import { WmIcon } from "@/components/map/wm-icons";
import { cn } from "@/lib/utils";

// One answer video. The 5-minute link is fetched (and the view logged) only
// when it is played.
export function CandidateVideo({
  videoId,
  number,
  prompt,
  length,
  large,
}: {
  videoId: string;
  number: number;
  prompt: string | null;
  length: string;
  large?: boolean;
}) {
  const t = useTranslations("adminUi");
  const te = useTranslations("errors");
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const height = large ? "h-[300px]" : "h-[150px]";
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {url ? (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className={cn("w-full rounded-[18px] bg-black", height)}
        />
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await getCandidateVideoUrl({ videoId });
              if (!result.ok) toast.error(te(result.error));
              else setUrl(result.data.url);
            })
          }
          aria-label={`${t("playVideo")} ${number} (${t("viewLogged")})`}
          className={cn(
            "relative flex w-full items-center justify-center rounded-[18px] border-0 bg-[#1E2638]",
            height,
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-white/[0.92] text-wm-ink",
              large ? "size-16" : "size-11",
            )}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <WmIcon name="play" size={large ? 24 : 18} stroke={2} fill="currentColor" />
            )}
          </span>
          <span className="absolute top-3 left-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-white/[0.92] px-2 text-xs font-extrabold text-wm-ink">
            {number}
          </span>
          <span className="absolute right-3 bottom-2.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {length}
          </span>
        </button>
      )}
      {prompt ? (
        <span
          className={cn(
            "font-bold whitespace-pre-line text-wm-body",
            large ? "text-sm" : "line-clamp-3 text-xs",
          )}
        >
          {prompt}
        </span>
      ) : null}
    </div>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useTranslations("sponsorUi");
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(t("copied"));
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked: nothing to do, the text is on screen.
        }
      }}
      className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-wm-field bg-white text-wm-body hover:bg-wm-mist"
    >
      <WmIcon name={done ? "check" : "clipboardCheck"} size={16} stroke={2.2} />
    </button>
  );
}
