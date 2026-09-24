"use client";

import { Check, Clock, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteVideo } from "@/actions/onboarding";
import { VideoRecorder } from "@/components/onboarding/video-recorder";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PromptWithVideo = {
  id: string;
  prompt: string;
  maxSeconds: number;
  video: { id: string; url: string | null } | null;
};

export function VideoStep({
  userId,
  prompts,
  nextHref,
}: {
  userId: string;
  prompts: PromptWithVideo[];
  nextHref: string;
}) {
  const t = useTranslations("onboarding.video");
  const to = useTranslations("onboarding");
  const te = useTranslations("errors");
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const allDone = prompts.every((p) => p.video);

  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-muted/70 p-4 text-sm leading-relaxed">{t("tips")}</p>
      <ol className="space-y-3">
        {prompts.map((p, i) => (
          <li key={p.id} className="shadow-float rounded-3xl bg-card p-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  p.video ? "bg-success text-success-foreground" : "bg-muted",
                )}
              >
                {p.video ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="leading-snug font-bold">{p.prompt}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" aria-hidden="true" />
                  {t("maxSeconds", { seconds: p.maxSeconds })}
                  {p.video ? (
                    <span className="ms-2 font-semibold text-success">· {t("done")}</span>
                  ) : null}
                </p>
              </div>
            </div>

            {active === p.id ? (
              <div className="mt-4">
                <VideoRecorder
                  userId={userId}
                  promptId={p.id}
                  maxSeconds={p.maxSeconds}
                  onCancel={() => setActive(null)}
                />
              </div>
            ) : p.video ? (
              <div className="mt-4 space-y-3">
                {p.video.url ? (
                  <video
                    src={p.video.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full rounded-2xl bg-foreground object-cover"
                  />
                ) : null}
                <div className="flex gap-2">
                  <Button variant="secondary" size="pill" onClick={() => setActive(p.id)}>
                    {t("recordAgain")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="pill"
                    disabled={pending}
                    className="text-destructive"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteVideo(p.video!.id);
                        if (!result.ok) toast.error(te(result.error));
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("delete")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="touch"
                className="mt-4 w-full"
                onClick={() => setActive(p.id)}
                disabled={active !== null}
              >
                <Video className="size-4" aria-hidden="true" />
                {t("record")}
              </Button>
            )}
          </li>
        ))}
      </ol>
      <p className="text-center text-xs text-muted-foreground">{t("reviewNote")}</p>
      {allDone ? (
        <Link href={nextHref} className={cn(buttonVariants({ size: "touch" }), "w-full")}>
          {to("continue")}
        </Link>
      ) : null}
    </div>
  );
}
