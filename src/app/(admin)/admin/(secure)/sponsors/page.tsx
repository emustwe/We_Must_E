import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FormAlert } from "@/components/forms/form-alert";
import {
  ResendInviteButton,
  SponsorRowMenu,
  SponsorSearch,
} from "@/components/admin/sponsor-actions";
import {
  Avatar,
  btn,
  IconTile,
  PageHeader,
  Segmented,
  StatusPill,
  WCard,
} from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { createClient } from "@/lib/supabase/server";
import { logoUrl } from "@/lib/sponsors/logo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUi");
  return { title: t("sponsorsTitle") };
}

const TABS = { active: "approved", setup: "pending" } as const;
const TONE = { approved: "ok", pending: "idle", suspended: "danger" } as const;

export default async function AdminSponsorsPage({ searchParams }: PageProps<"/admin/sponsors">) {
  const params = await searchParams;
  const t = await getTranslations("adminUi");
  const ta = await getTranslations("admin");
  const tab = params.tab === "active" || params.tab === "setup" ? params.tab : undefined;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 60).toLowerCase();
  const supabase = await createClient();
  const [{ data: sponsors }, { data: jobs }] = await Promise.all([
    supabase
      .from("employer_profiles")
      .select("user_id, company_name, contact_person, contact_email, status, logo_path, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("jobs").select("employer_id").neq("status", "removed").limit(5000),
  ]);
  const jobCount = new Map<string, number>();
  for (const j of jobs ?? []) jobCount.set(j.employer_id, (jobCount.get(j.employer_id) ?? 0) + 1);

  const all = sponsors ?? [];
  const count = (s?: keyof typeof TABS) =>
    s ? all.filter((x) => x.status === TABS[s]).length : all.length;
  const shown = all.filter(
    (s) =>
      (!tab || s.status === TABS[tab]) &&
      (!q ||
        [s.company_name, s.contact_person, s.contact_email].some((v) =>
          v?.toLowerCase().includes(q),
        )),
  );
  const settingUp = all.filter((s) => s.status === "pending");
  const tabHref = (s?: keyof typeof TABS) => {
    const p = new URLSearchParams();
    if (s) p.set("tab", s);
    if (q) p.set("q", q);
    return `/admin/sponsors${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title={t("sponsorsTitle")}
        body={t("sponsorsBody")}
        actions={
          <Link href="/admin/sponsors/new" className={btn("primary")}>
            <WmIcon name="plus" size={17} stroke={2.2} />
            {t("createSponsor")}
          </Link>
        }
      />
      {params.deleted === "1" ? <FormAlert tone="success" message={ta("sponsorDeleted")} /> : null}

      <WCard className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <Segmented
            label={t("sponsorsTitle")}
            items={[
              { href: tabHref(), label: t("sponsorTabs.all"), active: !tab, count: count() },
              {
                href: tabHref("active"),
                label: t("sponsorTabs.active"),
                active: tab === "active",
                count: count("active"),
              },
              {
                href: tabHref("setup"),
                label: t("sponsorTabs.setup"),
                active: tab === "setup",
                count: count("setup"),
              },
            ]}
          />
          <span className="grow" />
          <SponsorSearch value={q} />
        </div>
        <div className="hidden grid-cols-12 gap-3 bg-[#F8F9FB] px-5 py-2.5 text-xs font-bold text-wm-caption md:grid">
          <span className="col-span-4">{t("col.company")}</span>
          <span className="col-span-2">{t("col.contact")}</span>
          <span className="col-span-3">{t("col.email")}</span>
          <span className="col-span-2">{t("col.status")}</span>
          <span className="col-span-1" />
        </div>
        {!shown.length ? (
          <p className="border-t border-[#EEF0F4] px-5 py-8 text-center text-sm font-semibold text-wm-caption">
            {t("noSponsors")}
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {shown.map((s) => {
              const logo = logoUrl(s.logo_path);
              return (
                <li
                  key={s.user_id}
                  className="grid grid-cols-12 items-center gap-3 border-t border-[#EEF0F4] px-5 py-4"
                >
                  <Link
                    href={`/admin/sponsors/${s.user_id}`}
                    className="col-span-10 flex min-w-0 items-center gap-3 text-wm-ink no-underline md:col-span-4"
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small public logo
                      <img
                        src={logo}
                        alt=""
                        className="size-11 shrink-0 rounded-[14px] object-cover"
                      />
                    ) : (
                      <Avatar name={s.company_name} size={44} kind="company" />
                    )}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-bold">{s.company_name}</span>
                      {s.status === "pending" ? (
                        <span className="text-xs font-semibold text-[#B45309]">
                          {t("notFinished")}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-wm-caption">
                          {t("postingJobs", { count: jobCount.get(s.user_id) ?? 0 })}
                        </span>
                      )}
                    </span>
                  </Link>
                  <span className="col-span-12 text-sm font-semibold text-wm-body md:col-span-2">
                    {s.contact_person ?? "—"}
                  </span>
                  <span className="col-span-12 flex min-w-0 items-center gap-2 text-sm font-medium text-wm-body md:col-span-3">
                    <span className="shrink-0 text-wm-caption">
                      <WmIcon name="mail" size={15} stroke={2} />
                    </span>
                    <span className="truncate">{s.contact_email}</span>
                  </span>
                  <span className="col-span-10 md:col-span-2">
                    <StatusPill tone={TONE[s.status]}>{t(`sponsorStatus.${s.status}`)}</StatusPill>
                  </span>
                  <span className="col-span-2 row-start-1 flex justify-end md:col-span-1 md:row-start-auto">
                    <SponsorRowMenu employerId={s.user_id} name={s.company_name} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </WCard>

      {settingUp.map((s) => (
        <WCard key={s.user_id} className="px-[22px] py-5">
          <div className="flex flex-wrap items-center gap-4">
            <IconTile name="info" bg="#FDEBD2" fg="#B45309" size={48} radius={16} iconSize={22} />
            <div className="flex min-w-0 grow basis-64 flex-col gap-[3px]">
              <span className="text-[15px] font-extrabold">
                {t("stillSettingUp", { name: s.company_name })}
              </span>
              <span className="text-sm font-medium text-wm-slate">{t("settingUpBody")}</span>
            </div>
            <Link href={`/admin/sponsors/${s.user_id}`} className={btn("secondary")}>
              {t("openSponsor")}
            </Link>
            <ResendInviteButton employerId={s.user_id} name={s.company_name} />
          </div>
        </WCard>
      ))}

      <WCard className="flex flex-col gap-4 p-[22px]">
        <h2 className="m-0 text-base font-extrabold">{t("howSponsors")}</h2>
        <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-wm-tint text-sm font-extrabold text-wm-blue">
                {n}
              </span>
              <span className="flex flex-col gap-[3px]">
                <span className="text-sm font-bold">{t(`step${n}`)}</span>
                <span className="text-[13px] leading-[1.5] font-medium text-wm-slate">
                  {t(`step${n}Body`)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </WCard>
    </>
  );
}
