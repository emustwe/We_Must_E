import { Building2, ClipboardCheck, Inbox, MapPinned } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MissingStepsAlert } from "@/components/admin/missing-steps-alert";
import { PageTitle } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };
  const [toReview, jobsToReview, employers, jobs] = await Promise.all([
    supabase.from("applications").select("id", count).eq("status", "submitted"),
    supabase.from("jobs").select("id", count).eq("status", "pending"),
    supabase.from("employer_profiles").select("user_id", count),
    supabase.from("jobs").select("id", count).eq("status", "published"),
  ]);
  const cards = [
    {
      label: t("statCards.toReview"),
      value: toReview.count ?? 0,
      icon: Inbox,
      href: "/admin/applications",
    },
    {
      label: t("statCards.jobsToReview"),
      value: jobsToReview.count ?? 0,
      icon: ClipboardCheck,
      href: "/admin/jobs?status=pending",
    },
    {
      label: t("statCards.employers"),
      value: employers.count ?? 0,
      icon: Building2,
      href: "/admin/sponsors",
    },
    { label: t("statCards.jobs"), value: jobs.count ?? 0, icon: MapPinned, href: "/admin/jobs" },
  ];

  return (
    <div>
      <PageTitle title={t("homeTitle")} body={t("homeBody")} />
      <MissingStepsAlert />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
