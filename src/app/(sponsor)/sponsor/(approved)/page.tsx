import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { btn, JOB_PILL, PageHeader, Segmented, StatusPill, tileColors } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
import { JobSearch } from "@/components/sponsors/job-search";
import { requireRole } from "@/lib/auth/session";
import type { JobStatus } from "@/lib/jobs/meta";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employer");
  return { title: t("jobsTitle") };
}

const TABS = ["published", "pending", "rejected", "hidden", "closed"] as const;

export default async function EmployerJobsPage({ searchParams }: PageProps<"/sponsor">) {
  const params = await searchParams;
  const profile = await requireRole("employer");
  const t = await getTranslations("employer");
  const ts = await getTranslations("jobStatus");
  const tu = await getTranslations("sponsorUi");
  const format = await getFormatter();
  const tab = TABS.find((s) => s === params.tab);
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60);
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, location_label, status, published_at, created_at")
    .eq("employer_id", profile.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });
  const jobs = data ?? [];
  // Candidates per job (approved by Wemuste; names only until opened).
  const counts = new Map(
    await Promise.all(
      jobs.slice(0, 60).map(async (j) => {
        const { data: rows } = await supabase.rpc("sponsor_list_candidates", {
          p_job_id: j.id,
          p_page: 0,
        });
        return [j.id, Number(rows?.[0]?.total ?? 0)] as const;
      }),
    ),
  );
  const count = (s?: JobStatus) => (s ? jobs.filter((j) => j.status === s).length : jobs.length);
  const shown = jobs.filter(
    (j) => (!tab || j.status === tab) && (!q || j.title.toLowerCase().includes(q.toLowerCase())),
  );
  const waiting = jobs.find((j) => j.status === "pending");
  const href = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("tab", s);
    if (q) p.set("q", q);
    return `/sponsor${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <Crumbs items={[{ label: t("jobsTitle") }]} />
      <PageHeader
        title={t("jobsTitle")}
        body={tu("jobsBody")}
        actions={
          <Link href="/sponsor/jobs/new" className={btn("primary")}>
            <WmIcon name="plus" size={17} stroke={2.2} />
            {t("postJob")}
          </Link>
        }
      />
      {jobs.length ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented
            label={t("jobsTitle")}
            items={[
              { href: href(), label: tu("tabAll"), active: !tab, count: count() },
              ...TABS.filter((s) => s === "published" || s === "pending" || s === "closed" || count(s)).map(
                (s) => ({ href: href(s), label: ts(s), active: tab === s, count: count(s) }),
              ),
            ]}
          />
          <span className="grow" />
          <JobSearch value={q} label={tu("searchJobs")} />
        </div>
      ) : null}
      {waiting ? (
        <div className="flex flex-wrap items-center gap-3.5 rounded-[18px] border border-[#F6DFAE] bg-[#FEF6E4] px-5 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wm-warn-bg text-[#B45309]">
            <WmIcon name="shieldClock" size={19} stroke={2.2} />
          </span>
          <span className="flex min-w-0 grow basis-60 flex-col gap-0.5">
            <span className="text-sm font-extrabold text-[#7A4B06]">
              {tu("waitingTitle", { title: waiting.title })}
            </span>
            <span className="text-[13px] font-medium text-[#7A4B06]">{tu("waitingBody")}</span>
          </span>
          <Link href={`/sponsor/jobs/${waiting.id}`} className={btn("secondary", "xs")}>
            {tu("viewJob")}
          </Link>
        </div>
      ) : null}

      {!jobs.length ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed border-[#C9D1DD] bg-white p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-wm-tint text-wm-blue">
            <WmIcon name="briefcase" size={22} stroke={2.1} />
          </span>
          <h2 className="m-0 text-xl font-extrabold">{t("noJobsTitle")}</h2>
          <p className="m-0 max-w-sm text-sm font-medium text-wm-slate">{t("noJobsBody")}</p>
          <Link href="/sponsor/jobs/new" className={cn(btn("primary"), "mt-2")}>
            {t("postJob")}
          </Link>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((job) => {
            const [bg, fg] =
              job.status === "closed" || job.status === "hidden"
                ? (["#E9ECF2", "#475569"] as const)
                : job.status === "pending"
                  ? (["#FDEBD2", "#9A4A06"] as const)
                  : tileColors(job.title);
            const n = counts.get(job.id) ?? 0;
            return (
              <li key={job.id}>
                <Link
                  href={`/sponsor/jobs/${job.id}`}
                  className={cn(
                    "flex h-full flex-col gap-4 rounded-[22px] bg-white p-5 text-wm-ink no-underline shadow-wm-1 hover:outline-2 hover:-outline-offset-2 hover:outline-wm-blue",
                    (job.status === "closed" || job.status === "hidden") && "opacity-[0.78]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <span
                      style={{ background: bg, color: fg }}
                      className="flex size-[46px] items-center justify-center rounded-[14px]"
                    >
                      <WmIcon name="briefcase" size={21} stroke={2.1} />
                    </span>
                    <StatusPill tone={JOB_PILL[job.status]}>{ts(job.status)}</StatusPill>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-lg font-extrabold tracking-[-0.3px] break-words">{job.title}</span>
                    <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] font-medium text-wm-slate">
                      <span className="flex items-center gap-[5px]">
                        <WmIcon name="pin" size={14} stroke={2} />
                        {job.location_label.split(",")[0]}
                      </span>
                      <span className="flex items-center gap-[5px]">
                        <WmIcon name="shieldClock" size={14} stroke={2} />
                        {t("postedOn", {
                          date: format.dateTime(new Date(job.published_at ?? job.created_at), {
                            day: "numeric",
                            month: "short",
                          }),
                        })}
                      </span>
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-[#EEF0F4] pt-3.5">
                    <span
                      className={cn(
                        "flex items-center gap-2 text-[13px] font-bold",
                        n ? "text-wm-blue" : "text-wm-body",
                      )}
                    >
                      <WmIcon name="inbox" size={16} stroke={2.1} />
                      {job.status === "pending" ? tu("notOnMap") : tu("candidatesCount", { count: n })}
                    </span>
                    <span className="flex text-wm-caption">
                      <WmIcon name="chevronRight" size={16} stroke={2.4} />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
