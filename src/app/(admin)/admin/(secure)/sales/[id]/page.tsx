import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { EmptyRow, PageHeader, StatusPill, WCard } from "@/components/admin/wm";
import { CopyButton } from "@/components/sponsors/candidate-media";
import { clientEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminSales");
  return { title: t("title") };
}

const TONE = { new: "warn", approved: "ok", declined: "idle" } as const;

// One salesperson: their code and link, and every sponsor who used the code.
export default async function SalespersonPage({ params }: PageProps<"/admin/sales/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const t = await getTranslations("adminSales");
  const tr = await getTranslations("adminUi");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: person }, { data: requests }, { data: accounts }] = await Promise.all([
    supabase
      .from("sales_people")
      .select("id, code, nickname, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("sponsor_requests")
      .select("id, company_name, contact_person, city, status, created_at")
      .eq("salesperson_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("employer_profiles")
      .select("user_id, company_name, status, created_at")
      .eq("referred_by", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!person) notFound();
  const link = `${clientEnv.NEXT_PUBLIC_SITE_URL}/for-sponsors?ref=${encodeURIComponent(person.code)}`;
  const date = (d: string) => format.dateTime(new Date(d), { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/sales" className="text-sm font-bold text-wm-blue no-underline">
        ← {t("title")}
      </Link>
      <PageHeader title={person.nickname} body={t("since", { date: date(person.created_at) })} />
      <WCard className="flex flex-col gap-3 p-6">
        <div className="flex items-center gap-3 rounded-2xl bg-wm-land px-4 py-3">
          <span className="flex min-w-0 grow flex-col">
            <span className="text-xs font-semibold text-wm-slate">{t("code")}</span>
            <span className="font-mono text-xl font-extrabold text-wm-blue">{person.code}</span>
          </span>
          <CopyButton value={person.code} label={t("copyCode")} />
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-wm-land px-4 py-3">
          <span className="flex min-w-0 grow flex-col">
            <span className="text-xs font-semibold text-wm-slate">{t("link")}</span>
            <span className="text-sm font-bold break-all">{link}</span>
          </span>
          <CopyButton value={link} label={t("copyLink")} />
        </div>
        <p className="m-0 text-[13px] font-medium text-wm-slate">{t("linkNote")}</p>
      </WCard>

      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">
          {t("requestsTitle", { count: requests?.length ?? 0 })}
        </h2>
        {!requests?.length ? (
          <EmptyRow>{t("noRequests")}</EmptyRow>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 border-b border-wm-line py-3 last:border-0"
              >
                <span className="flex min-w-0 grow flex-col">
                  <span className="text-sm font-extrabold">{r.company_name}</span>
                  <span className="text-xs font-semibold text-wm-slate">
                    {r.contact_person} · {r.city} · {date(r.created_at)}
                  </span>
                </span>
                <StatusPill tone={TONE[r.status]}>{tr(`requestStatus.${r.status}`)}</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </WCard>

      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">
          {t("accountsTitle", { count: accounts?.length ?? 0 })}
        </h2>
        {!accounts?.length ? (
          <EmptyRow>{t("noAccounts")}</EmptyRow>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {accounts.map((a) => (
              <li key={a.user_id} className="border-b border-wm-line py-3 last:border-0">
                <Link
                  href={`/admin/sponsors/${a.user_id}`}
                  className="flex items-center gap-3 text-wm-ink no-underline"
                >
                  <span className="grow text-sm font-extrabold">{a.company_name}</span>
                  <span className="text-xs font-semibold text-wm-slate">{date(a.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </WCard>
    </div>
  );
}
