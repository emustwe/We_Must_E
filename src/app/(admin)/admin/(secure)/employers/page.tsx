import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmployerStatusButton } from "@/components/admin/employer-status-button";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("employersTitle") };
}

export default async function AdminEmployersPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: employers } = await supabase
    .from("employer_profiles")
    .select(
      "user_id, company_name, contact_person, contact_email, contact_phone, status, must_change_password, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("employersTitle")}</h1>
        <Link href="/admin/employers/new" className={buttonVariants({ size: "touch" })}>
          <Plus className="size-4" aria-hidden="true" />
          {t("createEmployer")}
        </Link>
      </div>
      {!employers?.length ? (
        <p className="rounded-3xl border-2 border-dashed p-10 text-center text-muted-foreground">
          {t("noEmployers")}
        </p>
      ) : (
        <ul className="space-y-3">
          {employers.map((e) => (
            <li
              key={e.user_id}
              className="shadow-float flex flex-col gap-3 rounded-3xl bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{e.company_name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      e.status === "approved"
                        ? "bg-success/15 text-success"
                        : e.status === "suspended"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t(`status.${e.status}`)}
                  </span>
                  {e.must_change_password ? (
                    <span className="rounded-full bg-brand-accent/20 px-2.5 py-0.5 text-xs font-semibold">
                      {t("mustChange")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {[e.contact_person, e.contact_email, e.contact_phone].filter(Boolean).join(" · ")}
                </p>
              </div>
              <EmployerStatusButton employerId={e.user_id} status={e.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
