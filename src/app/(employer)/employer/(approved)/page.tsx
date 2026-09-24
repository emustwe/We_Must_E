import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PayLabelServer } from "@/components/employer/pay-label-server";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { CATEGORY_META } from "@/lib/jobs/meta";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("jobsTitle") };
}

export default async function EmployerJobsPage() {
  const profile = await requireRole("employer");
  const t = await getTranslations("employer");
  const tj = await getTranslations("jobStatus");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: jobs }, { data: applications }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, title, category, pay_min, pay_max, pay_period, currency, area_label, city_emirate, status, expires_at",
      )
      .eq("employer_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("job_applications").select("job_id").eq("status", "pending"),
  ]);
  const pendingByJob = new Map<string, number>();
  for (const a of applications ?? [])
    pendingByJob.set(a.job_id, (pendingByJob.get(a.job_id) ?? 0) + 1);

  return (
    <div className="animate-in-fast space-y-6 pt-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("jobsTitle")}</h1>
        <Link href="/employer/jobs/new" className={buttonVariants({ size: "touch" })}>
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
          <Link href="/employer/jobs/new" className={cn(buttonVariants({ size: "touch" }), "mt-2")}>
            {t("postJob")}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {jobs.map((job) => {
            const pending = pendingByJob.get(job.id) ?? 0;
            const meta = CATEGORY_META[job.category];
            return (
              <li key={job.id}>
                <Link
                  href={`/employer/jobs/${job.id}`}
                  className="shadow-float flex gap-3 rounded-3xl bg-card p-4 transition-transform active:scale-[0.99]"
                >
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl",
                      meta.tint,
                    )}
                    aria-hidden="true"
                  >
                    {meta.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 font-bold">{job.title}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          job.status === "open"
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {tj(job.status)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {job.area_label}, {job.city_emirate}
                    </span>
                    <PayLabelServer
                      min={job.pay_min}
                      max={job.pay_max}
                      period={job.pay_period}
                      currency={job.currency}
                      className="mt-1 block text-sm font-bold"
                    />
                    <span className="mt-2 flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          "font-semibold",
                          pending ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {t("requestsCount", { count: pending })}
                      </span>
                      <span className="text-muted-foreground">
                        {t("expires", {
                          date: format.dateTime(new Date(job.expires_at), {
                            day: "numeric",
                            month: "short",
                          }),
                        })}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
