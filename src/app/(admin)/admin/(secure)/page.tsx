import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AdminMap } from "@/components/admin/jobs-map";
import { MissingStepsAlert } from "@/components/admin/missing-steps-alert";
import {
  Avatar,
  btn,
  displayTitle,
  IconTile,
  PageHeader,
  StatusPill,
  WCard,
} from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { loadActors } from "@/lib/admin/actors";
import { describeAudit } from "@/lib/admin/audit-text";
import { requireAdminMfa } from "@/lib/auth/session";
import { shortLabel } from "@/lib/jobs/display";
import { createClient } from "@/lib/supabase/server";

const areaOf = (label: string | null | undefined) => label?.split(",")[0]?.trim() || "—";

function dayPart(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Dubai",
    }).format(now),
  );
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

// The most common area in a list, or "several areas".
function mainArea(labels: (string | null)[], several: string) {
  const counts = new Map<string, number>();
  for (const l of labels) {
    const a = l?.trim();
    if (a) counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  if (!counts.size) return several;
  if (counts.size === 1) return [...counts.keys()][0];
  return several;
}

export default async function AdminHome() {
  const profile = await requireAdminMfa();
  const t = await getTranslations("adminUi");
  const format = await getFormatter();
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };
  const [toReview, jobsToReview, sponsors, live, pendingApps, pendingJobs, audit, mapJobs] =
    await Promise.all([
      supabase.from("applications").select("id", count).eq("status", "submitted"),
      supabase.from("jobs").select("id", count).eq("status", "pending"),
      supabase.from("employer_profiles").select("user_id", count),
      supabase.from("jobs").select("id", count).eq("status", "published"),
      supabase
        .from("applications")
        .select(
          "id, submitted_at, contact_name, jobs(title, location_label, employer_profiles(company_name))",
        )
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(6),
      supabase
        .from("jobs")
        .select("id, title, location_label, city, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("audit_logs")
        .select("id, actor_id, action, target_type, target_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("jobs")
        .select("id, title, lat, lng, status, city")
        .in("status", ["published", "pending"])
        .limit(300),
    ]);

  const queue = [
    ...(pendingApps.data ?? []).map((a) => ({
      kind: "app" as const,
      id: a.id,
      at: a.submitted_at ?? "",
      name: a.contact_name ?? "—",
      line: t("appliedTo", {
        job: displayTitle(a.jobs?.title ?? "—"),
        sponsor: a.jobs?.employer_profiles?.company_name ?? "—",
        area: areaOf(a.jobs?.location_label),
      }),
      href: `/admin/applications/${a.id}`,
    })),
    ...(pendingJobs.data ?? []).map((j) => ({
      kind: "job" as const,
      id: j.id,
      at: j.created_at,
      name: displayTitle(j.title),
      line: t("jobWaiting", { area: j.city || areaOf(j.location_label) }),
      href: `/admin/jobs?status=pending&job=${j.id}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const actors = await loadActors(
    supabase,
    (audit.data ?? []).map((r) => r.actor_id),
  );
  const pins = (mapJobs.data ?? []).map((j) => ({
    id: j.id,
    label: shortLabel(j.title, 22),
    lat: j.lat,
    lng: j.lng,
    pending: j.status === "pending",
  }));
  const liveJobs = (mapJobs.data ?? []).filter((j) => j.status === "published");
  const waitingJobs = (mapJobs.data ?? []).filter((j) => j.status === "pending");
  const firstName = (profile.full_name || "Admin").split(" ")[0];

  const stats = [
    {
      value: toReview.count ?? 0,
      label: t("stat.apps"),
      icon: "inbox" as const,
      tint: ["#FDEBD2", "#B45309"] as const,
      link: { href: "/admin/applications", label: t("stat.reviewApps") },
    },
    {
      value: jobsToReview.count ?? 0,
      label: t("stat.jobs"),
      icon: "clipboardCheck" as const,
      tint: ["#FDEBD2", "#B45309"] as const,
      link: { href: "/admin/jobs?status=pending", label: t("stat.reviewJobs") },
    },
    {
      value: sponsors.count ?? 0,
      label: t("stat.sponsors"),
      icon: "fileText" as const,
      tint: ["#E3EAFF", "#2457F5"] as const,
      link: null,
    },
    {
      value: live.count ?? 0,
      label: t("stat.live"),
      icon: "pin" as const,
      tint: ["#D9F4E6", "#0B6B45"] as const,
      link: null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("greeting", { part: dayPart(new Date()), name: firstName })}
        body={t("overviewBody")}
        actions={
          <Link href="/admin/sponsors/new" className={btn("primary")}>
            <WmIcon name="plus" size={17} stroke={2.2} />
            {t("createSponsor")}
          </Link>
        }
      />
      <MissingStepsAlert />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <WCard key={s.label} className="flex flex-col gap-3.5 px-[22px] py-5">
            <IconTile name={s.icon} bg={s.tint[0]} fg={s.tint[1]} />
            <div className="flex flex-col gap-0.5">
              <span className="text-4xl leading-[1.1] font-extrabold tracking-[-1.2px]">
                {s.value}
              </span>
              <span className="text-sm font-semibold text-wm-body">{s.label}</span>
              {s.link && s.value > 0 ? (
                <Link
                  href={s.link.href}
                  className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-wm-blue no-underline"
                >
                  {s.link.label}
                  <WmIcon name="chevronRight" size={14} stroke={2.6} />
                </Link>
              ) : (
                <span className="mt-1 text-[13px] font-semibold text-wm-caption">
                  {t("stat.upToDate")}
                </span>
              )}
            </div>
          </WCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <WCard className="flex flex-col px-6 pt-[22px] pb-2.5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("attention")}</h2>
              <span className="text-[13px] font-semibold text-wm-caption">
                {t("items", { count: queue.length })}
              </span>
            </div>
            {queue.length === 0 ? (
              <p className="border-t border-[#EEF0F4] py-5 text-sm font-medium text-wm-caption">
                {t("nothingWaiting")}
              </p>
            ) : (
              queue.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex flex-wrap items-center gap-3.5 border-t border-[#EEF0F4] py-3.5 sm:flex-nowrap"
                >
                  {item.kind === "app" ? (
                    <Avatar name={item.name} size={40} />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wm-warn-bg text-[#B45309]">
                      <WmIcon name="briefcase" size={18} stroke={2.1} />
                    </span>
                  )}
                  <div className="flex min-w-0 grow basis-48 flex-col gap-[3px]">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-bold">
                      {item.name}
                      <StatusPill tone="warn">
                        {item.kind === "app" ? t("appStatus.submitted") : t("jobTabs.pending")}
                      </StatusPill>
                    </span>
                    <span className="text-[13px] font-medium text-wm-slate">{item.line}</span>
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap text-wm-caption">
                    {item.at
                      ? format.dateTime(
                          new Date(item.at),
                          item.kind === "app"
                            ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
                            : { month: "short", day: "numeric" },
                        )
                      : ""}
                  </span>
                  <Link href={item.href} className={btn("secondary", "xs")}>
                    {t("review")}
                  </Link>
                </div>
              ))
            )}
          </WCard>

          <WCard className="flex flex-col px-6 pt-[22px] pb-2.5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("recent")}</h2>
              <Link href="/admin/audit" className="text-[13px] font-bold text-wm-blue no-underline">
                {t("viewAudit")}
              </Link>
            </div>
            {!audit.data?.length ? (
              <p className="border-t border-[#EEF0F4] py-5 text-sm font-medium text-wm-caption">
                {t("noActivity")}
              </p>
            ) : (
              audit.data.map((row) => {
                const d = describeAudit(row);
                const actor = row.actor_id ? actors.get(row.actor_id) : null;
                const name = row.actor_id ? (actor?.name ?? t("deletedUser")) : t("system");
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 border-t border-[#EEF0F4] py-3"
                  >
                    <Avatar
                      name={name}
                      size={34}
                      kind={actor?.role === "admin" ? "admin" : "company"}
                    />
                    <span className="min-w-0 grow text-sm font-medium text-wm-body">
                      <span className="font-bold text-wm-ink">{name}</span>{" "}
                      {t.rich(`activity.${d.key}`, {
                        t: (chunks) =>
                          d.href ? (
                            <Link href={d.href} className="font-bold text-wm-blue no-underline">
                              {chunks}
                            </Link>
                          ) : (
                            <span className="font-bold">{chunks}</span>
                          ),
                      })}
                    </span>
                    <span className="text-xs font-semibold whitespace-nowrap text-wm-caption">
                      {format.dateTime(new Date(row.created_at), {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </WCard>
        </div>

        <WCard className="flex flex-col gap-3.5 px-6 py-[22px]">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("liveMap")}</h2>
            <Link href="/admin/jobs" className="text-[13px] font-bold text-wm-blue no-underline">
              {t("openJobs")}
            </Link>
          </div>
          <div className="relative h-[254px] w-full overflow-hidden rounded-[20px]">
            <AdminMap pins={pins} interactive={false} />
          </div>
          <span className="text-[13px] font-medium text-wm-slate">
            {t("mapSummary", {
              live: liveJobs.length,
              liveArea: mainArea(
                liveJobs.map((j) => j.city),
                t("severalAreas"),
              ),
              pending: waitingJobs.length,
              pendingArea: mainArea(
                waitingJobs.map((j) => j.city),
                t("severalAreas"),
              ),
            })}
          </span>
        </WCard>
      </div>
    </>
  );
}
