import { Clock, PauseCircle } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getEmployerAccount } from "@/lib/auth/employer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("pendingTitle") };
}

export default async function EmployerPendingPage() {
  const { employer } = await getEmployerAccount();
  if (employer?.must_change_password) redirect("/sponsor/welcome");
  if (employer?.status === "approved") redirect("/sponsor");
  const t = await getTranslations("employer");
  const suspended = employer?.status === "suspended";
  const Icon = suspended ? PauseCircle : Clock;

  return (
    <div className="animate-in-fast mx-auto max-w-md py-12 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent-foreground dark:text-brand-accent">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-balance">
        {suspended ? t("suspendedTitle") : t("pendingTitle")}
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {suspended
          ? t("suspendedBody")
          : t("pendingBody", { company: employer?.company_name ?? "" })}
      </p>
    </div>
  );
}
