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
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-[11px]">
        <span className="flex size-10 items-center justify-center rounded-[13px] bg-wm-blue text-[21px] font-extrabold text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]">
          W
        </span>
        <span className="flex flex-col">
          <span className="text-lg leading-[1.15] font-extrabold tracking-[-0.4px]">Wemuste</span>
          <span className="text-xs font-semibold text-wm-caption">Admin console</span>
        </span>
      </div>
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-6 shadow-wm-1">
        <h1 className="text-2xl font-extrabold tracking-[-0.6px]">{t("mfaTitle")}</h1>
        <MfaForm verifiedFactorId={verified?.id ?? null} />
      </div>
    </div>
  );
}
