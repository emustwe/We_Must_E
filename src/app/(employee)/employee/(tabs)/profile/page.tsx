import { ClipboardList, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/actions/auth";
import { DeleteAccountCard } from "@/components/layout/delete-account";
import { SignOutEverywhereCard } from "@/components/layout/sign-out-everywhere";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeStatus } from "@/lib/jobs/queries";

const STATUS_KEYS = {
  draft: "statusDraft",
  submitted: "statusSubmitted",
  approved: "statusApproved",
  hidden: "statusHidden",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee");
  return { title: t("profileTitle") };
}

export default async function EmployeeProfilePage() {
  const profile = await requireRole("employee");
  const t = await getTranslations("employee");
  const tc = await getTranslations("common");
  const to = await getTranslations("onboarding");
  const status = await getEmployeeStatus(profile.id);
  const firstName = profile.full_name.split(" ")[0];
  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 pt-6 pb-28 sm:px-6">
      <div className="flex items-center gap-4">
        <span
          className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-extrabold text-primary-foreground"
          aria-hidden="true"
        >
          {initials || "🙂"}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {firstName ? t("welcome", { name: firstName }) : t("welcomeNoName")}
          </h1>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5 text-success" aria-hidden="true" />
            {tc("neverPublic")}
          </p>
        </div>
      </div>

      <section className="shadow-float flex items-center justify-between rounded-3xl bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("statusLabel")}</p>
        <p className="rounded-full bg-muted px-3 py-1 text-sm font-bold">
          {t(STATUS_KEYS[status])}
        </p>
      </section>

      {status === "draft" ? (
        <section className="rounded-3xl bg-primary p-5 text-primary-foreground">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ClipboardList className="size-5" aria-hidden="true" />
            {t("nextTitle")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed opacity-90">{t("nextBody")}</p>
          <Link
            href="/employee/onboarding"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-primary-foreground px-5 text-sm font-bold text-primary"
          >
            {to("startCta")}
          </Link>
        </section>
      ) : null}

      <SignOutEverywhereCard body={t("securityBody")} />
      <DeleteAccountCard />
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="touch" className="w-full text-muted-foreground">
          {tc("signOut")}
        </Button>
      </form>
    </main>
  );
}
