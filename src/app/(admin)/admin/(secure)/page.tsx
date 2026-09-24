import { Building2, MapPinned, Users } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [employers, jobs, employees] = await Promise.all([
    supabase.from("employer_profiles").select("user_id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("employee_profiles").select("user_id", { count: "exact", head: true }),
  ]);
  const cards = [
    {
      label: t("statCards.employers"),
      value: employers.count ?? 0,
      icon: Building2,
      href: "/admin/employers",
    },
    { label: t("statCards.jobs"), value: jobs.count ?? 0, icon: MapPinned, href: null },
    { label: t("statCards.employees"), value: employees.count ?? 0, icon: Users, href: null },
  ];
  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("homeTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("homeBody")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, href }) => {
          const body = (
            <>
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-3xl font-extrabold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </>
          );
          return href ? (
            <Link key={label} href={href} className="shadow-float rounded-3xl bg-card p-5">
              {body}
            </Link>
          ) : (
            <div key={label} className="shadow-float rounded-3xl bg-card p-5">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
