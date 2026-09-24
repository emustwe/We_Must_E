import { ClipboardList, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SignOutEverywhereCard } from "@/components/layout/sign-out-everywhere";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const STATUS_KEYS = {
  draft: "statusDraft",
  submitted: "statusSubmitted",
  approved: "statusApproved",
  hidden: "statusHidden",
} as const;

export default async function EmployeeDashboard() {
  const profile = await requireRole("employee");
  const t = await getTranslations("employee");
  const tc = await getTranslations("common");
  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employee_profiles")
    .select("status")
    .eq("user_id", profile.id)
    .single();
  const status = employee?.status ?? "draft";
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="animate-in-fast space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? t("welcome", { name: firstName }) : t("welcomeNoName")}
        </h1>
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="size-3.5" aria-hidden="true" />
          {tc("neverPublic")}
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("statusLabel")}</p>
        <p className="mt-1 text-lg font-semibold">{t(STATUS_KEYS[status])}</p>
      </section>

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ClipboardList className="size-4 text-primary" aria-hidden="true" />
          {t("nextTitle")}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("nextBody")}</p>
        <p className="mt-4 text-sm font-medium text-primary">{t("comingSoon")}</p>
      </section>

      <SignOutEverywhereCard body={t("securityBody")} />
    </div>
  );
}
