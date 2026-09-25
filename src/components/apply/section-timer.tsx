"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// A clock that ticks every second in the browser. On the server (and during
// hydration) it is null, so the rendered time never differs between the two.
function subscribeClock(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}
const clockNow = () => Math.floor(Date.now() / 1000);

export function useCountdown(deadline: string | null) {
  const now = useSyncExternalStore(subscribeClock, clockNow, () => null);
  if (!deadline || now === null) return null;
  return Math.max(0, Math.floor(new Date(deadline).getTime() / 1000) - now);
}

export const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// The section's time left, pinned to the top of the page. The Task and Survey
// clocks start when the step opens; when time is up the applicant is asked to
// finish now (the time taken is kept for the team).
export function SectionTimer({ deadline }: { deadline: string | null }) {
  const t = useTranslations("apply");
  const left = useCountdown(deadline);
  if (left === null) return null;
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-2 flex justify-end bg-background/95 px-4 py-2 backdrop-blur">
      <p
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums",
          left < 60 ? "bg-destructive/10 text-destructive" : "bg-muted",
        )}
        aria-live={left < 60 ? "polite" : "off"}
      >
        <Clock className="size-4" aria-hidden="true" />
        {left > 0 ? (
          <>
            <span className="sr-only">{t("timeLeft")}: </span>
            {mmss(left)}
          </>
        ) : (
          t("sectionTimeUp")
        )}
      </p>
    </div>
  );
}
