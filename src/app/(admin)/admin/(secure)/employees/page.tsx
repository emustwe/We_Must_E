import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge, EMPLOYEE_TONE, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { AVAILABILITY, CITIES } from "@/lib/jobs/meta";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Status = Database["public"]["Enums"]["employee_status"];
type Availability = Database["public"]["Enums"]["availability"];
const STATUSES: Status[] = ["submitted", "approved", "draft", "hidden"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("employeesTitle") };
}

const pick = <T extends string>(value: unknown, allowed: readonly T[]) =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

export default async function AdminEmployeesPage({ searchParams }: PageProps<"/admin/employees">) {
  const t = await getTranslations("admin");
  const ts = await getTranslations("schedule");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const city = pick(
    params.city,
    CITIES.map((c) => c.id),
  );
  const status = pick(params.status, STATUSES);
  const availability = pick(params.availability, AVAILABILITY);
  const minScore =
    typeof params.min === "string" && /^\d{1,3}$/.test(params.min) ? Number(params.min) : undefined;
  const page =
    typeof params.page === "string" && /^\d{1,3}$/.test(params.page) ? Number(params.page) : 0;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_search_employees", {
    p_query: q || undefined,
    p_city: city,
    p_status: status,
    p_availability: availability as Availability | undefined,
    p_min_score: minScore,
    p_page: page,
  });
  if (error) logError("admin-search-employees", error);
  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  const pageHref = (p: number) => {
    const next = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
    next.set("page", String(p));
    return `/admin/employees?${next}`;
  };

  return (
    <div>
      <PageTitle title={t("employeesTitle")} />
      <form
        className="shadow-float mb-5 grid gap-2 rounded-3xl bg-card p-3 sm:grid-cols-[1fr_auto_auto_auto_7rem_auto]"
        role="search"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder={t("search")}
          aria-label={t("search")}
          className="h-11 rounded-xl border border-input bg-background px-4"
        />
        <select
          name="city"
          defaultValue={city ?? ""}
          aria-label={t("allCities")}
          className="h-11 rounded-xl border border-input bg-background px-3"
        >
          <option value="">{t("allCities")}</option>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label={t("allStatuses")}
          className="h-11 rounded-xl border border-input bg-background px-3"
        >
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`employeeStatus.${s}`)}
            </option>
          ))}
        </select>
        <select
          name="availability"
          defaultValue={availability ?? ""}
          aria-label={t("anyAvailability")}
          className="h-11 rounded-xl border border-input bg-background px-3"
        >
          <option value="">{t("anyAvailability")}</option>
          {AVAILABILITY.map((a) => (
            <option key={a} value={a}>
              {ts(a)}
            </option>
          ))}
        </select>
        <input
          name="min"
          defaultValue={minScore ?? ""}
          inputMode="numeric"
          placeholder={t("minScore")}
          aria-label={t("minScore")}
          className="h-11 rounded-xl border border-input bg-background px-3"
        />
        <div className="flex gap-2">
          <button type="submit" className={buttonVariants({ size: "pill" })}>
            {t("filter")}
          </button>
          <Link
            href="/admin/employees"
            className={buttonVariants({ size: "pill", variant: "ghost" })}
          >
            {t("clear")}
          </Link>
        </div>
      </form>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {t("results", { count: total })}
      </p>
      <ul className="grid gap-3 lg:grid-cols-2">
        {rows.map((e) => (
          <li key={e.user_id}>
            <Link
              href={`/admin/employees/${e.user_id}`}
              className="shadow-float block rounded-3xl bg-card p-4 transition-transform active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{e.full_name || "—"}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {e.headline ?? t("noneYet")}
                  </p>
                </div>
                <Badge tone={EMPLOYEE_TONE[e.status]}>{t(`employeeStatus.${e.status}`)}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {e.city_emirate ? <Badge>{e.city_emirate}</Badge> : null}
                <Badge tone={e.test_score !== null ? "primary" : "muted"}>
                  {e.test_score !== null
                    ? t("score", { score: Math.round(Number(e.test_score)) })
                    : t("noScore")}
                </Badge>
                {Number(e.pending_videos) > 0 ? (
                  <Badge tone="warning">
                    {t("videosPending", { count: Number(e.pending_videos) })}
                  </Badge>
                ) : null}
                {e.availability.map((a) => (
                  <Badge key={a}>{ts(a)}</Badge>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {total > 20 ? (
        <nav className="mt-6 flex justify-center gap-2" aria-label="Pages">
          {page > 0 ? (
            <Link
              href={pageHref(page - 1)}
              className={buttonVariants({ size: "pill", variant: "secondary" })}
            >
              {t("prev")}
            </Link>
          ) : null}
          {(page + 1) * 20 < total ? (
            <Link
              href={pageHref(page + 1)}
              className={cn(buttonVariants({ size: "pill", variant: "secondary" }))}
            >
              {t("next")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
