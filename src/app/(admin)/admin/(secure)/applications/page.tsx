import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { APPLICATION_TONE, Badge, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("applicationsTitle") };
}

const STATUSES = ["submitted", "approved", "rejected"] as const;
const PAGE = 25;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  const params = await searchParams;
  const t = await getTranslations("admin");
  const ts = await getTranslations("applicationStatus");
  const format = await getFormatter();

  // Filters come from the URL: validate each one.
  const statusParam = one(params.status);
  const status =
    statusParam === "all" ? undefined : (STATUSES.find((s) => s === statusParam) ?? "submitted");
  const job = idSchema.safeParse(one(params.job)).data;
  const employer = idSchema.safeParse(one(params.sponsor)).data;
  const from = isDate(one(params.from));
  const to = isDate(one(params.to));
  // Only letters, digits, spaces and dashes reach the query.
  const city = (one(params.city) ?? "")
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .slice(0, 60);
  const page = /^\d{1,4}$/.test(one(params.page) ?? "") ? Number(params.page) : 0;

  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select(
      "id, status, submitted_at, applicants(full_name), jobs!inner(title, location_label, employer_id, employer_profiles(company_name))",
      { count: "exact" },
    )
    .neq("status", "in_progress")
    .order("submitted_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (status) query = query.eq("status", status);
  if (job) query = query.eq("job_id", job);
  if (employer) query = query.eq("jobs.employer_id", employer);
  if (from) query = query.gte("submitted_at", from);
  if (to)
    query = query.lt("submitted_at", new Date(new Date(to).getTime() + 86_400_000).toISOString());
  if (city) query = query.ilike("jobs.location_label", `%${city}%`);

  const [{ data: rows, count }, { data: jobs }, { data: employers }] = await Promise.all([
    query,
    supabase.from("jobs").select("id, title").order("created_at", { ascending: false }).limit(300),
    supabase.from("employer_profiles").select("user_id, company_name").order("company_name"),
  ]);

  const current = {
    status: statusParam ?? "submitted",
    ...(job ? { job } : {}),
    ...(employer ? { sponsor: employer } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(city ? { city } : {}),
  };
  const pageHref = (p: number) =>
    `/admin/applications?${new URLSearchParams({ ...current, page: String(p) })}`;
  const select = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm";

  return (
    <div>
      <PageTitle title={t("applicationsTitle")} body={t("applicationsBody")} />

      <form className="shadow-float mb-5 grid gap-3 rounded-3xl bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="f-status">{t("filterStatus")}</label>
          <select id="f-status" name="status" defaultValue={current.status} className={select}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
            <option value="all">{t("allStatuses")}</option>
          </select>
        </div>
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="f-job">{t("filterJob")}</label>
          <select id="f-job" name="job" defaultValue={job ?? ""} className={select}>
            <option value="">{t("anyJob")}</option>
            {(jobs ?? []).map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="f-sponsor">{t("filterEmployer")}</label>
          <select id="f-sponsor" name="sponsor" defaultValue={employer ?? ""} className={select}>
            <option value="">{t("anyEmployer")}</option>
            {(employers ?? []).map((e) => (
              <option key={e.user_id} value={e.user_id}>
                {e.company_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="f-city">{t("filterCity")}</label>
          <input
            id="f-city"
            name="city"
            defaultValue={city}
            placeholder={t("cityPlaceholder")}
            className={select}
          />
        </div>
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="f-from">{t("filterFrom")}</label>
          <input id="f-from" type="date" name="from" defaultValue={from} className={select} />
        </div>
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="f-to">{t("filterTo")}</label>
          <input id="f-to" type="date" name="to" defaultValue={to} className={select} />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonVariants({ size: "touch", className: "flex-1" })}>
            {t("filter")}
          </button>
          <Link
            href="/admin/applications"
            className={buttonVariants({ size: "touch", variant: "ghost" })}
          >
            {t("clearFilters")}
          </Link>
        </div>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">
        {t("resultsCount", { count: count ?? 0 })}
      </p>
      {!rows?.length ? (
        <p className="rounded-3xl border-2 border-dashed p-10 text-center text-muted-foreground">
          {t("noApplications")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/applications/${a.id}`}
                className="shadow-float flex items-center gap-3 rounded-3xl bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{a.applicants?.full_name ?? "—"}</span>
                    <Badge tone={APPLICATION_TONE[a.status]}>{ts(a.status)}</Badge>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {a.jobs.title} · {a.jobs.employer_profiles?.company_name} ·{" "}
                    {a.jobs.location_label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {a.submitted_at
                      ? format.dateTime(new Date(a.submitted_at), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : ""}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 text-muted-foreground rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <nav className="mt-4 flex justify-center gap-2" aria-label={t("pages")}>
        {page > 0 ? (
          <Link
            href={pageHref(page - 1)}
            className={buttonVariants({ size: "pill", variant: "secondary" })}
          >
            {t("prev")}
          </Link>
        ) : null}
        {(page + 1) * PAGE < (count ?? 0) ? (
          <Link
            href={pageHref(page + 1)}
            className={buttonVariants({ size: "pill", variant: "secondary" })}
          >
            {t("next")}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
