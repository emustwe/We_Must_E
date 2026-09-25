import { MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { JobStatusBadge } from "@/components/employer/job-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("jobsTitle") };
}

export default async function EmployerJobsPage() {
  const profile = await requireRole("employer");
  const t = await getTranslations("employer");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, location_label, status, published_at")
    .eq("employer_id", profile.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  return (
    <div className="animate-in-fast space-y-6 pt-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("jobsTitle")}</h1>
        <Link href="/sponsor/jobs/new" className={buttonVariants({ size: "touch" })}>
          <Plus className="size-4" aria-hidden="true" />
          {t("postJob")}
        </Link>
      </div>

      {!jobs?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed p-10 text-center">
          <span className="text-4xl" aria-hidden="true">
            📍
          </span>
          <h2 className="text-xl font-extrabold">{t("noJobsTitle")}</h2>
          <p className="max-w-sm text-muted-foreground">{t("noJobsBody")}</p>
          <Link href="/sponsor/jobs/new" className={cn(buttonVariants({ size: "touch" }), "mt-2")}>
            {t("postJob")}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/sponsor/jobs/${job.id}`}
                className="shadow-float flex gap-3 rounded-3xl bg-card p-4 transition-transform active:scale-[0.99]"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <MapPin className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 font-bold">{job.title}</span>
                    <JobStatusBadge status={job.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {job.location_label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t("postedOn", {
                      date: format.dateTime(new Date(job.published_at), {
                        day: "numeric",
                        month: "short",
                      }),
                    })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
