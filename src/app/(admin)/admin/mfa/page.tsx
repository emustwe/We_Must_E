import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MfaForm } from "@/components/auth/mfa-form";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("mfaTitle") };
}

export default async function AdminMfaPage() {
  await requireRole("admin");
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/admin");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp.find((factor) => factor.status === "verified");

  return (
    <div className="mx-auto max-w-sm space-y-6 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("mfaTitle")}</h1>
      <MfaForm verifiedFactorId={verified?.id ?? null} />
    </div>
  );
}
