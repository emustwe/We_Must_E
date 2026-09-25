import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SetPasswordForm } from "@/components/employer/set-password-form";
import { getEmployerAccount } from "@/lib/auth/employer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("welcomeTitle") };
}

export default async function EmployerWelcomePage() {
  const { employer } = await getEmployerAccount();
  if (!employer?.must_change_password) redirect("/sponsor");
  const t = await getTranslations("employer");
  return (
    <div className="shadow-float animate-sheet mx-auto mt-6 max-w-md rounded-[2rem] bg-card p-6 sm:p-8">
      <p className="text-3xl" aria-hidden="true">
        👋
      </p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{t("welcomeTitle")}</h1>
      <p className="mt-1.5 mb-6 text-muted-foreground">{t("welcomeBody")}</p>
      <SetPasswordForm />
    </div>
  );
}
