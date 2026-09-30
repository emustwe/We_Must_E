import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { OutreachAdd } from "@/components/admin/outreach-add";
import { OutreachRow } from "@/components/admin/outreach-row";
import { EmptyRow, PageHeader, Segmented, WCard } from "@/components/admin/wm";
import { clientEnv } from "@/lib/env";
import { OUTREACH_STATUSES, type OutreachStatus } from "@/lib/outreach/config";
import { outreachEmail } from "@/lib/outreach/email";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminOutreach");
  return { title: t("title") };
}

// Outreach: companies the team emails by hand. Each contact has a private
// video link; the email is copied here and pasted into the team's mailbox.
export default async function OutreachPage({ searchParams }: PageProps<"/admin/outreach">) {
  const { s } = await searchParams;
  const filter = OUTREACH_STATUSES.find((x) => x === s) ?? null;
  const t = await getTranslations("adminOutreach");
  const format = await getFormatter();
  const supabase = await createClient();
  const site = clientEnv.NEXT_PUBLIC_SITE_URL;

  let query = supabase
    .from("outreach_contacts")
    .select(
      "id, token, name, company, email, country, status, link_off, open_count, created_at, sent_at, last_opened_at, sales_people(code)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (filter) query = query.eq("status", filter);
  const count = (status?: OutreachStatus) => {
    const q = supabase.from("outreach_contacts").select("id", { count: "exact", head: true });
    return status ? q.eq("status", status) : q;
  };
  const [{ data: contacts }, { data: people }, all, ...byStatus] = await Promise.all([
    query,
    supabase.from("sales_people").select("id, code, nickname").order("code"),
    count(),
    ...OUTREACH_STATUSES.map((x) => count(x)),
  ]);
  const counts = Object.fromEntries(OUTREACH_STATUSES.map((x, i) => [x, byStatus[i].count ?? 0]));
  const date = (d: string) => format.dateTime(new Date(d), { dateStyle: "medium" });
  const sample = outreachEmail({
    site,
    token: "0".repeat(32),
    name: contacts?.[0]?.name ?? "Sara Khan",
    company: contacts?.[0]?.company ?? "Example Company",
  });
  const steps = [t("step1"), t("step2"), t("step3"), t("step4")];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} body={t("body")} />

      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("howTitle")}</h2>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-sm font-semibold text-wm-body">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-wm-tint text-xs font-extrabold text-wm-blue">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <details className="rounded-2xl bg-wm-land p-4">
          <summary className="cursor-pointer text-sm font-bold">{t("preview")}</summary>
          <p className="m-0 mt-3 text-[13px] font-bold">
            {t("subject")}: <span className="font-semibold">{sample.subject}</span>
          </p>
          <div
            className="mt-3 rounded-xl bg-white p-4"
            // Our own template; every value in it is escaped.
            dangerouslySetInnerHTML={{ __html: sample.html }}
          />
        </details>
      </WCard>

      <WCard className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("addTitle")}</h2>
        <OutreachAdd
          salespeople={(people ?? []).map((p) => ({
            id: p.id,
            label: `${p.code} · ${p.nickname}`,
          }))}
        />
      </WCard>

      <Segmented
        label={t("filterLabel")}
        items={[
          { href: "/admin/outreach", label: t("all"), active: !filter, count: all.count ?? 0 },
          ...OUTREACH_STATUSES.map((x) => ({
            href: `/admin/outreach?s=${x}`,
            label: t(`status.${x}`),
            active: filter === x,
            count: counts[x],
          })),
        ]}
      />

      {!contacts?.length ? (
        <EmptyRow>{t("empty")}</EmptyRow>
      ) : (
        <WCard className="px-6 py-2">
          <ul className="m-0 flex list-none flex-col p-0">
            {contacts.map((c) => (
              <OutreachRow
                key={c.id}
                site={site}
                row={{
                  id: c.id,
                  token: c.token,
                  name: c.name,
                  company: c.company,
                  email: c.email,
                  country: c.country,
                  status: c.status as OutreachStatus,
                  linkOff: c.link_off,
                  openCount: c.open_count,
                  code: c.sales_people?.code ?? null,
                  dates: [
                    t("addedOn", { date: date(c.created_at) }),
                    c.sent_at ? t("sentOn", { date: date(c.sent_at) }) : null,
                    c.last_opened_at ? t("openedOn", { date: date(c.last_opened_at) }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                }}
              />
            ))}
          </ul>
        </WCard>
      )}
    </div>
  );
}
