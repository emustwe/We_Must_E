import { ChevronRight, Lock, LockOpen } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

// One candidate in a list: the name is always visible; the rest opens with an E-coin.
export async function CandidateRow({
  jobId,
  applicationId,
  name,
  jobTitle,
  sharedAt,
  unlocked,
}: {
  jobId: string;
  applicationId: string;
  name: string;
  jobTitle?: string;
  sharedAt: string;
  unlocked: boolean;
}) {
  const t = await getTranslations("ecoins");
  const format = await getFormatter();
  return (
    <Link
      href={`/sponsor/jobs/${jobId}/candidates/${applicationId}`}
      className="shadow-float flex items-center gap-3 rounded-3xl bg-card p-4 transition-colors hover:bg-muted/40"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {jobTitle ? `${jobTitle} · ` : ""}
          {t("sharedOn", {
            date: format.dateTime(new Date(sharedAt), { day: "numeric", month: "short" }),
          })}
        </span>
      </span>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
          unlocked ? "bg-success/15 text-success" : "bg-brand-accent/20",
        )}
      >
        {unlocked ? (
          <LockOpen className="size-3.5" aria-hidden="true" />
        ) : (
          <Lock className="size-3.5" aria-hidden="true" />
        )}
        {unlocked ? t("open") : t("new")}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100"
        aria-hidden="true"
      />
    </Link>
  );
}
