import { Building2, MapPinned, Users, Video } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };
  const [employers, jobs, employees, waiting, videos] = await Promise.all([
    supabase.from("employer_profiles").select("user_id", count),
    supabase.from("jobs").select("id", count).eq("status", "open"),
    supabase.from("employee_profiles").select("user_id", count),
    supabase.from("employee_profiles").select("user_id", count).eq("status", "submitted"),
    supabase.from("video_resumes").select("id", count).eq("status", "uploaded"),
  ]);
  const cards = [
    {
      label: t("statCards.employees"),
      value: employees.count ?? 0,
      icon: Users,
      href: "/admin/employees",
    },
    {
      label: t("statCards.employers"),
      value: employers.count ?? 0,
      icon: Building2,
      href: "/admin/employers",
    },
    { label: t("statCards.jobs"), value: jobs.count ?? 0, icon: MapPinned, href: "/admin/jobs" },
  ];

  return (
    <div>
      <PageTitle title={t("homeTitle")} body={t("homeBody")} />
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="shadow-float rounded-3xl bg-card p-5 transition-transform active:scale-[0.99]"
          >
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">{t("needsAttention")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold">
            <Users
              className="size-4 text-brand-accent-foreground dark:text-brand-accent"
              aria-hidden="true"
            />
            {t("awaitingReview", { count: waiting.count ?? 0 })}
          </p>
          <Link
            href="/admin/employees?status=submitted"
            className={buttonVariants({ size: "pill", variant: "secondary" })}
          >
            {t("reviewNow")}
          </Link>
        </Card>
        <Card className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold">
            <Video
              className="size-4 text-brand-accent-foreground dark:text-brand-accent"
              aria-hidden="true"
            />
            {t("videosToReview", { count: videos.count ?? 0 })}
          </p>
          <Link
            href="/admin/employees?status=submitted"
            className={buttonVariants({ size: "pill", variant: "secondary" })}
          >
            {t("reviewNow")}
          </Link>
        </Card>
      </div>
    </div>
  );
}
