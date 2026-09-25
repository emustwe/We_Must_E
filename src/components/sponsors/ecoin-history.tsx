import { getFormatter, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// The last E-coin movements for a sponsor (RLS: the sponsor or an MFA admin).
export async function EcoinHistory({ employerId }: { employerId: string }) {
  const t = await getTranslations("ecoins");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("ecoin_ledger")
    .select("id, delta, reason, note, created_at")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (!rows?.length) return <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>;
  return (
    <ul className="divide-y text-sm">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="block font-medium">
              {t(`reason.${r.reason as "admin_grant" | "unlock"}`)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {format.dateTime(new Date(r.created_at), { dateStyle: "medium", timeStyle: "short" })}
              {r.note ? ` · ${r.note}` : ""}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 font-bold tabular-nums",
              r.delta > 0 ? "text-success" : "text-foreground",
            )}
          >
            {r.delta > 0 ? `+${r.delta}` : r.delta}
          </span>
        </li>
      ))}
    </ul>
  );
}
