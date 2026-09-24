import { getTranslations } from "next-intl/server";
import type { JobStatus } from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";

const TONE: Record<JobStatus, string> = {
  published: "bg-success/15 text-success",
  hidden: "bg-brand-accent/20 text-brand-accent-foreground dark:text-brand-accent",
  closed: "bg-muted text-muted-foreground",
  removed: "bg-destructive/10 text-destructive",
};

export async function JobStatusBadge({ status }: { status: JobStatus }) {
  const t = await getTranslations("jobStatus");
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE[status])}>
      {t(status)}
    </span>
  );
}
