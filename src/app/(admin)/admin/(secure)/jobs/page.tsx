import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/admin/filter-select";
import { JobsBoard } from "@/components/admin/jobs-board";
import { PageHeader, Segmented } from "@/components/admin/wm";
import type { JobStatus } from "@/lib/jobs/meta";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUi");
  return { title: t("jobsTitle") };
}

const STATUSES = [
  "pending",
  "published",
  "rejected",
  "hidden",
  "closed",
  "removed",
] as const satisfies JobStatus[];

export default async function AdminJobsPage({ searchParams }: PageProps<"/admin/jobs">) {
  const query = await searchParams;
  const status = STATUSES.find((s) => s === query.status);
  const sponsor = idSchema.safeParse(query.sponsor).data;
  const t = await getTranslations("adminUi");
  const format = await getFormatter();
  const supabase = await createClient();

  let request = supabase
    .from("jobs")
    .select(
      "id, title, description, location_label, city, lat, lng, status, published_at, created_at, review_note, employer_id, employer_profiles(company_name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) request = request.eq("status", status);
  if (sponsor) request = request.eq("employer_id", sponsor);
  let countRequest = supabase.from("jobs").select("status").limit(5000);
  if (sponsor) countRequest = countRequest.eq("employer_id", sponsor);
  const [{ data: jobs }, { data: all }, { data: sponsors }] = await Promise.all([
    request,
    countRequest,
    supabase.from("employer_profiles").select("user_id, company_name").order("company_name"),
  ]);

  const counts = new Map<string, number>();
  for (const j of all ?? []) counts.set(j.status, (counts.get(j.status) ?? 0) + 1);
  const href = (s?: JobStatus) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (sponsor) p.set("sponsor", sponsor);
    return `/admin/jobs${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title={t("jobsTitle")} body={t("jobsBody")} />
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          label={t("jobsTitle")}
          items={[
            { href: href(), label: t("jobTabs.all"), active: !status },
            ...STATUSES.map((s) => ({
              href: href(s),
              label: t(`jobTabs.${s}`),
              active: s === status,
              count: counts.get(s) ?? 0,
            })),
          ]}
        />
        <span className="grow" />
        <FilterSelect
          label={t("filterSponsor")}
          param="sponsor"
          value={sponsor ?? ""}
          reset={["job"]}
          options={[
            { value: "", label: t("any") },
            ...(sponsors ?? []).map((s) => ({ value: s.user_id, label: s.company_name })),
          ]}
        />
      </div>
      <JobsBoard
        key={`${status ?? "all"}-${sponsor ?? ""}`}
        jobs={(jobs ?? []).map((j) => ({
          id: j.id,
          title: j.title,
          description: j.description,
          area: j.location_label.split(",")[0]?.trim() || j.location_label,
          city: j.city,
          lat: j.lat,
          lng: j.lng,
          status: j.status,
          date: format.dateTime(new Date(j.published_at ?? j.created_at), { dateStyle: "medium" }),
          sponsor: j.employer_profiles?.company_name ?? "—",
          reviewNote: j.review_note,
        }))}
      />
    </>
  );
}
