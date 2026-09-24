import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DeleteAccountCard } from "@/components/layout/delete-account";
import { SignOutEverywhereCard } from "@/components/layout/sign-out-everywhere";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function EmployerAccountPage() {
  const t = await getTranslations("account");
  const te = await getTranslations("employee");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      <SignOutEverywhereCard body={te("securityBody")} />
      <DeleteAccountCard body={t("employerDeleteBody")} />
    </div>
  );
}
