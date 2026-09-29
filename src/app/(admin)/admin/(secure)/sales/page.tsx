import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CreateSalesperson } from "@/components/admin/create-salesperson";
import { EmptyRow, PageHeader, WCard } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminSales");
  return { title: t("title") };
}

// Salespeople and how many sponsors each brought with their referral code.
export default async function SalesPage() {
  const t = await getTranslations("adminSales");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: people }, { data: requests }, { data: accounts }] = await Promise.all([
    supabase
      .from("sales_people")
      .select("id, code, nickname, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("sponsor_requests").select("salesperson_id").not("salesperson_id", "is", null),
    supabase.from("employer_profiles").select("referred_by").not("referred_by", "is", null),
  ]);
  const count = (list: { [k: string]: string | null }[] | null, key: string, id: string) =>
    (list ?? []).filter((r) => r[key] === id).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} body={t("body")} />
      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("createTitle")}</h2>
        <CreateSalesperson />
      </WCard>
      {!people?.length ? (
        <EmptyRow>{t("empty")}</EmptyRow>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 xl:grid-cols-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/sales/${p.id}`}
                className="flex items-center gap-4 rounded-3xl bg-white p-5 text-wm-ink no-underline shadow-wm-1 hover:shadow-wm-2"
              >
                <span className="flex min-w-0 grow flex-col gap-1">
                  <span className="text-base font-extrabold">{p.nickname}</span>
                  <span className="font-mono text-sm font-bold text-wm-blue">{p.code}</span>
                  <span className="text-xs font-semibold text-wm-caption">
                    {t("since", {
                      date: format.dateTime(new Date(p.created_at), { dateStyle: "medium" }),
                    })}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-0.5 text-right">
                  <span className="text-2xl font-extrabold tabular-nums">
                    {count(requests, "salesperson_id", p.id)}
                  </span>
                  <span className="text-xs font-semibold text-wm-slate">{t("sponsorsShort")}</span>
                  <span className="text-xs font-semibold text-wm-caption">
                    {t("accountsShort", { count: count(accounts, "referred_by", p.id) })}
                  </span>
                </span>
                <span className="text-wm-caption">
                  <WmIcon name="chevronRight" size={16} stroke={2.4} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
