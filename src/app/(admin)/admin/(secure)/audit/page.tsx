import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("auditTitle") };
}

const ACTIONS = [
  "application.reviewed",
  "application.graded",
  "application.video_viewed",
  "employer.status_changed",
  "job.status_changed",
  "survey.activated",
  "test.activated",
  "test.answer_key_set",
  "video_set.activated",
  "account.deleted",
];
const PAGE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const params = await searchParams;
  const action =
    typeof params.action === "string" && ACTIONS.includes(params.action)
      ? params.action
      : undefined;
  const page =
    typeof params.page === "string" && /^\d{1,4}$/.test(params.page) ? Number(params.page) : 0;

  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_type, target_id, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (action) query = query.eq("action", action);
  const { data: rows, count } = await query;

  // Actor names (audit_logs has no FK so entries survive account deletion).
  const actorIds = [
    ...new Set((rows ?? []).map((r) => r.actor_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, role").in("id", actorIds)
    : { data: [] };
  const { data: companies } = actorIds.length
    ? await supabase
        .from("employer_profiles")
        .select("user_id, company_name")
        .in("user_id", actorIds)
    : { data: [] };
  const nameFor = (id: string | null) => {
    if (!id) return "system";
    const company = companies?.find((c) => c.user_id === id)?.company_name;
    const actor = actors?.find((a) => a.id === id);
    return company ?? (actor ? `${actor.full_name || "—"} (${actor.role})` : "deleted user");
  };
  const href = (p: number) =>
    `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), page: String(p) })}`;

  return (
    <div>
      <PageTitle title={t("auditTitle")} body={t("auditBody")} />
      <form className="mb-4 flex gap-2">
        <select
          name="action"
          defaultValue={action ?? ""}
          aria-label={t("allActions")}
          className="h-11 rounded-xl border border-input bg-background px-3"
        >
          <option value="">{t("allActions")}</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonVariants({ size: "pill" })}>
          {t("filter")}
        </button>
      </form>
      {/* Phones: one card per entry. Larger screens: the table. */}
      <ul className="space-y-2.5 sm:hidden">
        {!rows?.length ? (
          <li className="rounded-3xl bg-card p-6 text-center text-muted-foreground">
            {t("noAudit")}
          </li>
        ) : (
          rows.map((r) => (
            <li key={r.id} className="shadow-float rounded-3xl bg-card p-4 text-sm">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold break-all">
                {r.action}
              </code>
              <p className="mt-2 font-semibold">{nameFor(r.actor_id)}</p>
              <p className="text-xs text-muted-foreground">
                {format.dateTime(new Date(r.created_at), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {" · "}
                {r.target_type === "application" && r.target_id ? (
                  <Link
                    href={`/admin/applications/${r.target_id}`}
                    className="text-primary hover:underline"
                  >
                    {r.target_type}
                  </Link>
                ) : (
                  r.target_type
                )}
              </p>
              {r.metadata && Object.keys(r.metadata as object).length ? (
                <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
                  {JSON.stringify(r.metadata)}
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
      <div className="shadow-float hidden overflow-x-auto rounded-3xl bg-card sm:block">
        <table className="w-full text-sm">
          <thead className="text-start text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="p-3 text-start font-semibold">
                {t("when")}
              </th>
              <th scope="col" className="p-3 text-start font-semibold">
                {t("who")}
              </th>
              <th scope="col" className="p-3 text-start font-semibold">
                {t("what")}
              </th>
              <th scope="col" className="p-3 text-start font-semibold">
                {t("target")}
              </th>
            </tr>
          </thead>
          <tbody>
            {!rows?.length ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  {t("noAudit")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {format.dateTime(new Date(r.created_at), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="p-3">{nameFor(r.actor_id)}</td>
                  <td className="p-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.action}</code>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {r.target_type === "application" && r.target_id ? (
                      <Link
                        href={`/admin/applications/${r.target_id}`}
                        className="text-primary hover:underline"
                      >
                        {r.target_type}
                      </Link>
                    ) : (
                      r.target_type
                    )}
                    {r.metadata && Object.keys(r.metadata as object).length ? (
                      <span className="block font-mono break-all">
                        {JSON.stringify(r.metadata)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex justify-center gap-2" aria-label="Pages">
        {page > 0 ? (
          <Link
            href={href(page - 1)}
            className={buttonVariants({ size: "pill", variant: "secondary" })}
          >
            {t("prev")}
          </Link>
        ) : null}
        {(page + 1) * PAGE < (count ?? 0) ? (
          <Link
            href={href(page + 1)}
            className={buttonVariants({ size: "pill", variant: "secondary" })}
          >
            {t("next")}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
