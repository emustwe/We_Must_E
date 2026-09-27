import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { DeclineRequestButton } from "@/components/admin/sponsor-request-actions";
import { btn, PageHeader, Segmented, StatusPill, WCard } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUi");
  return { title: t("requestsTitle") };
}

const TONE = { new: "warn", approved: "ok", declined: "idle" } as const;

// Companies that asked to become a sponsor ("For sponsors" on the map).
export default async function SponsorRequestsPage({
  searchParams,
}: PageProps<"/admin/sponsor-requests">) {
  const t = await getTranslations("adminUi");
  const format = await getFormatter();
  const query = await searchParams;
  const tab = query.tab === "handled" ? "handled" : "new";
  const supabase = await createClient();
  let q = supabase
    .from("sponsor_requests")
    .select(
      "id, company_name, contact_person, email, phone, city, website, message, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  q = tab === "new" ? q.eq("status", "new") : q.neq("status", "new");
  const { data: requests } = await q;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("requestsTitle")} body={t("requestsBody")} />
      <Segmented
        label={t("requestsTitle")}
        items={[
          { label: t("requestsNew"), href: "/admin/sponsor-requests", active: tab === "new" },
          {
            label: t("requestsHandled"),
            href: "/admin/sponsor-requests?tab=handled",
            active: tab === "handled",
          },
        ]}
      />
      {!requests?.length ? (
        <WCard className="p-6 text-sm font-semibold text-wm-caption">{t("requestsEmpty")}</WCard>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 xl:grid-cols-2">
          {requests.map((r) => (
            <li key={r.id}>
              <WCard className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-extrabold break-words">{r.company_name}</span>
                    <span className="text-xs font-medium text-wm-caption">
                      {format.dateTime(new Date(r.created_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {r.city}
                    </span>
                  </span>
                  <StatusPill tone={TONE[r.status]}>{t(`requestStatus.${r.status}`)}</StatusPill>
                </div>
                <dl className="m-0 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <Row label={t("requestContact")} value={r.contact_person} />
                  <Row label={t("requestEmail")} value={r.email} href={`mailto:${r.email}`} />
                  <Row label={t("requestPhone")} value={r.phone} href={`tel:${r.phone}`} />
                  {r.website ? <Row label={t("requestWebsite")} value={r.website} /> : null}
                </dl>
                {r.message ? (
                  <p className="m-0 rounded-xl bg-wm-mist p-3 text-sm whitespace-pre-line text-wm-body">
                    {r.message}
                  </p>
                ) : null}
                {r.status === "new" ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <DeclineRequestButton requestId={r.id} />
                    <Link
                      href={`/admin/sponsors/new?request=${r.id}`}
                      className={btn("primary", "sm")}
                    >
                      <WmIcon name="plus" size={15} stroke={2.4} />
                      {t("requestCreate")}
                    </Link>
                  </div>
                ) : null}
              </WCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs font-semibold text-wm-caption">{label}</dt>
      <dd className="m-0 font-bold break-words">
        {href ? (
          <a href={href} className="text-wm-blue no-underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
