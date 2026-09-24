import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GrantForm } from "@/components/admin/grant-form";
import { Card, PageTitle } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("newGrant") };
}

export default async function NewGrantPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: employers }, { data: employees }] = await Promise.all([
    supabase
      .from("employer_profiles")
      .select("user_id, company_name")
      .eq("status", "approved")
      .order("company_name"),
    supabase
      .from("employee_profiles")
      .select("user_id, headline, city_emirate, profiles(full_name)")
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1000),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("newGrant")} body={t("grantsBody")} />
      <Card className="sm:p-7">
        <GrantForm
          employers={(employers ?? []).map((e) => ({ id: e.user_id, label: e.company_name }))}
          employees={(employees ?? []).map((e) => ({
            id: e.user_id,
            label: e.profiles?.full_name || e.headline || "—",
            detail: [e.headline, e.city_emirate].filter(Boolean).join(" · "),
          }))}
        />
      </Card>
    </div>
  );
}
