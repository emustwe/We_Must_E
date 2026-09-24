import { ChevronRight, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("candidates");
  return { title: t("title") };
}

// Candidates an admin shared with this employer (paginated: 20, no export).
export default async function CandidatesPage({ searchParams }: PageProps<"/employer/candidates">) {
  const t = await getTranslations("candidates");
  const ts = await getTranslations("schedule");
  const format = await getFormatter();
  const params = await searchParams;
  const page =
    typeof params.page === "string" && /^\d{1,3}$/.test(params.page) ? Number(params.page) : 0;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("employer_list_candidates", { p_page: page });
  if (error) logError("employer-list-candidates", error);
  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mt-1 mb-6 max-w-2xl text-muted-foreground">{t("body")}</p>
      {!rows.length ? (
        <div className="flex flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed p-10 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="max-w-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((c) => (
            <li key={c.employee_id}>
              <Link
                href={`/employer/candidates/${c.employee_id}`}
                className="shadow-float flex items-center gap-3 rounded-3xl bg-card p-4 transition-transform active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.headline ?? t("anonymous")}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[c.city_emirate, c.availability.map((a) => ts(a)).join(", ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {c.test_score !== null ? (
                      <Badge tone="primary">{Math.round(Number(c.test_score))}%</Badge>
                    ) : null}
                    {c.skills.slice(0, 3).map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {t("shared", {
                      date: format.dateTime(new Date(c.granted_at), { dateStyle: "medium" }),
                    })}
                    {c.expires_at
                      ? ` ${t("expires", { date: format.dateTime(new Date(c.expires_at), { dateStyle: "medium" }) })}`
                      : ""}
                  </span>
                </span>
                <ChevronRight
                  className="size-5 text-muted-foreground rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > 20 ? (
        <nav className="mt-6 flex justify-center gap-2" aria-label="Pages">
          {page > 0 ? (
            <Link
              href={`/employer/candidates?page=${page - 1}`}
              className={buttonVariants({ size: "pill", variant: "secondary" })}
            >
              {t("prev")}
            </Link>
          ) : null}
          {(page + 1) * 20 < total ? (
            <Link
              href={`/employer/candidates?page=${page + 1}`}
              className={buttonVariants({ size: "pill", variant: "secondary" })}
            >
              {t("next")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
