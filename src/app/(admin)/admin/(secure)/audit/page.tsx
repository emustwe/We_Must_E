import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/admin/filter-select";
import { Avatar, btn, PageHeader, Segmented, WCard } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { loadActors } from "@/lib/admin/actors";
import { auditQuery, parseAuditFilters, type AuditFilters } from "@/lib/admin/audit-query";
import { AUDIT_GROUPS, describeAudit, TONE_COLORS, type AuditGroup } from "@/lib/admin/audit-text";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUi");
  return { title: t("auditTitle") };
}

const PAGE = 50;
const TZ = "Asia/Dubai";

function query(f: AuditFilters, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.group) p.set("group", f.group);
  if (f.who) p.set("who", f.who);
  if (f.date) p.set("date", f.date);
  if (f.action) p.set("action", f.action);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.size ? `?${p}` : "";
}

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const t = await getTranslations("adminUi");
  const format = await getFormatter();
  const f = parseAuditFilters(await searchParams);
  const supabase = await createClient();
  const { data: rows, count } = await auditQuery(supabase, f, [
    f.page * PAGE,
    f.page * PAGE + PAGE - 1,
  ]);
  const actors = await loadActors(
    supabase,
    (rows ?? []).map((r) => r.actor_id),
  );

  const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  const now = new Date();
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000));
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const date = format.dateTime(d, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: TZ,
    });
    const k = dayKey(d);
    if (k === today) return t("todayOn", { date });
    if (k === yesterday) return t("yesterdayOn", { date });
    return format.dateTime(d, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: TZ,
    });
  };
  const groups: { day: string; label: string; rows: NonNullable<typeof rows> }[] = [];
  for (const r of rows ?? []) {
    const k = dayKey(new Date(r.created_at));
    const last = groups.at(-1);
    if (last?.day === k) last.rows.push(r);
    else groups.push({ day: k, label: dayLabel(r.created_at), rows: [r] });
  }

  const tabs: (AuditGroup | undefined)[] = [
    undefined,
    ...(Object.keys(AUDIT_GROUPS) as AuditGroup[]),
  ];
  const word = (s: string) =>
    t.has(`statusWord.${s}` as never) ? t(`statusWord.${s}` as never) : s;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <>
      <PageHeader
        title={t("auditTitle")}
        body={t("auditBody")}
        actions={
          <a href={`/admin/audit/export${query(f)}`} className={btn("secondary")} download>
            <WmIcon name="download" size={17} stroke={2.2} />
            {t("exportCsv")}
          </a>
        }
      />
      <div className="flex items-center gap-2.5 rounded-[14px] bg-white px-4 py-3 text-[13px] font-semibold text-wm-body shadow-wm-1">
        <span className="shrink-0 text-wm-trust">
          <WmIcon name="lock" size={16} stroke={2.2} />
        </span>
        {t("permanent")}
      </div>

      <WCard className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-4">
          <Segmented
            label={t("auditTitle")}
            items={tabs.map((g) => ({
              href: `/admin/audit${query({ ...f, group: g, action: undefined, page: 0 })}`,
              label: t(`auditTabs.${g ?? "all"}`),
              active: !f.action && f.group === g,
            }))}
          />
          <span className="grow" />
          <FilterSelect
            label={t("filterWho")}
            param="who"
            value={f.who ?? ""}
            options={[
              { value: "", label: t("anyone") },
              { value: "admins", label: t("admins") },
              { value: "sponsors", label: t("sponsorsWho") },
            ]}
          />
          <FilterSelect
            label={t("filterDate")}
            param="date"
            value={f.date ?? ""}
            icon="calendar"
            options={[
              { value: "", label: t("anyTime") },
              { value: "today", label: t("today") },
              { value: "7", label: t("last7") },
              { value: "30", label: t("last30") },
            ]}
          />
        </div>
        <div className="hidden grid-cols-12 gap-3 bg-[#F8F9FB] px-5 py-2.5 text-xs font-bold text-wm-caption md:grid">
          <span className="col-span-1">{t("col.time")}</span>
          <span className="col-span-3">{t("col.who")}</span>
          <span className="col-span-4">{t("col.what")}</span>
          <span className="col-span-3">{t("col.target")}</span>
          <span className="col-span-1" />
        </div>
        {!groups.length ? (
          <p className="px-5 py-8 text-center text-sm font-semibold text-wm-caption">
            {t("noAudit")}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.day}>
              <h2 className="m-0 px-5 pt-3.5 pb-1.5 text-[13px] font-extrabold text-wm-ink">
                {g.label}
              </h2>
              {g.rows.map((r) => {
                const d = describeAudit(r);
                const actor = r.actor_id ? actors.get(r.actor_id) : null;
                const name = r.actor_id ? (actor?.name ?? t("deletedUser")) : t("system");
                const [bg, fg] = TONE_COLORS[d.tone];
                const chip =
                  d.chip?.kind === "change"
                    ? t("change", { from: cap(word(d.chip.from)), to: word(d.chip.to) })
                    : d.chip?.kind === "text"
                      ? d.key === "videoViewed"
                        ? t("video", { id: d.chip.text })
                        : d.chip.text
                      : null;
                return (
                  <details key={r.id} className="group border-t border-[#EEF0F4]">
                    <summary className="grid cursor-pointer list-none grid-cols-12 items-center gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="col-span-3 text-[13px] font-semibold text-wm-slate md:col-span-1">
                        {format.dateTime(new Date(r.created_at), {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: TZ,
                        })}
                      </span>
                      <span className="col-span-9 flex min-w-0 items-center gap-2.5 md:col-span-3">
                        <Avatar
                          name={name}
                          size={34}
                          kind={actor?.role === "admin" ? "admin" : "company"}
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-bold">{name}</span>
                          <span className="text-xs font-semibold text-wm-caption">
                            {actor?.role ? t(`role.${actor.role}`) : t("system")}
                          </span>
                        </span>
                      </span>
                      <span className="col-span-12 flex min-w-0 items-center gap-2.5 md:col-span-4">
                        <span
                          style={{ background: bg, color: fg }}
                          className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px]"
                        >
                          <WmIcon name={d.icon} size={16} stroke={2.2} />
                        </span>
                        <span className="text-sm font-semibold">{t(`what.${d.key}`)}</span>
                      </span>
                      <span className="col-span-10 flex min-w-0 items-center gap-2 md:col-span-3">
                        {d.target ? (
                          d.href ? (
                            <Link
                              href={d.href}
                              className="text-sm font-bold text-wm-blue no-underline"
                            >
                              {t(`targetCap.${d.target}`)}
                            </Link>
                          ) : (
                            <span className="text-sm font-bold">{t(`targetCap.${d.target}`)}</span>
                          )
                        ) : null}
                        {chip ? (
                          <span className="truncate rounded-lg bg-wm-mist px-2 py-[3px] text-xs font-semibold whitespace-nowrap text-wm-slate">
                            {chip}
                          </span>
                        ) : null}
                      </span>
                      <span className="col-span-2 flex justify-end md:col-span-1">
                        <span
                          className="flex size-[34px] items-center justify-center rounded-[10px] text-wm-caption transition-transform group-open:rotate-180"
                          aria-hidden="true"
                        >
                          <WmIcon name="chevronDown" size={16} stroke={2.4} />
                        </span>
                        <span className="sr-only">{t("showDetails")}</span>
                      </span>
                    </summary>
                    <pre className="mx-5 mb-3 overflow-x-auto rounded-xl bg-wm-mist p-3 font-mono text-xs text-wm-body">
                      {JSON.stringify(
                        {
                          action: r.action,
                          target_type: r.target_type,
                          target_id: r.target_id,
                          metadata: r.metadata,
                          created_at: r.created_at,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                );
              })}
            </div>
          ))
        )}
        {f.page > 0 || (f.page + 1) * PAGE < (count ?? 0) ? (
          <nav
            className="flex justify-center gap-2 border-t border-[#EEF0F4] px-5 py-3"
            aria-label="Pages"
          >
            {f.page > 0 ? (
              <Link
                href={`/admin/audit${query(f, { page: String(f.page - 1) })}`}
                className={btn("secondary", "sm")}
              >
                {t("prev")}
              </Link>
            ) : null}
            {(f.page + 1) * PAGE < (count ?? 0) ? (
              <Link
                href={`/admin/audit${query(f, { page: String(f.page + 1) })}`}
                className={btn("secondary", "sm")}
              >
                {t("next")}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </WCard>
    </>
  );
}
