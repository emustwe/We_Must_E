import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { revokeGrant } from "@/actions/admin-panel";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { serverNow } from "@/lib/onboarding/nav";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("grantsTitle") };
}

export default async function AdminGrantsPage() {
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const now = serverNow();
  const supabase = await createClient();
  const { data: grants } = await supabase
    .from("access_grants")
    .select(
      "id, scopes, expires_at, note, created_at, employer_profiles(company_name), employee_profiles(user_id, headline, profiles(full_name))",
    )
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <PageTitle
        title={t("grantsTitle")}
        body={t("grantsBody")}
        action={
          <Link href="/admin/grants/new" className={buttonVariants({ size: "touch" })}>
            <Plus className="size-4" aria-hidden="true" />
            {t("newGrant")}
          </Link>
        }
      />
      {!grants?.length ? (
        <p className="rounded-3xl border-2 border-dashed p-10 text-center text-muted-foreground">
          {t("noGrants")}
        </p>
      ) : (
        <ul className="space-y-3">
          {grants.map((g) => {
            const expired = Boolean(g.expires_at && new Date(g.expires_at).getTime() < now);
            return (
              <li
                key={g.id}
                className="shadow-float flex flex-col gap-3 rounded-3xl bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {g.employer_profiles?.company_name} →{" "}
                    <Link
                      href={`/admin/employees/${g.employee_profiles?.user_id}`}
                      className="text-primary hover:underline"
                    >
                      {g.employee_profiles?.profiles?.full_name || g.employee_profiles?.headline}
                    </Link>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {g.scopes.map((s) => (
                      <Badge key={s} tone="primary">
                        {t(`scopes.${s as "profile"}`)}
                      </Badge>
                    ))}
                    <Badge tone={expired ? "danger" : "muted"}>
                      {g.expires_at
                        ? t("expires", {
                            date: format.dateTime(new Date(g.expires_at), { dateStyle: "medium" }),
                          })
                        : t("noExpiry")}
                    </Badge>
                  </div>
                  {g.note ? <p className="mt-1.5 text-sm text-muted-foreground">{g.note}</p> : null}
                </div>
                <ActionButton
                  size="pill"
                  variant="ghost"
                  className="text-destructive"
                  confirm={t("revokeConfirm")}
                  action={revokeGrant.bind(null, g.id)}
                >
                  {t("revoke")}
                </ActionButton>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
