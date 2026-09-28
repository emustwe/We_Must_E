import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { SettleTransfer } from "@/components/admin/settle-transfer";
import { PageHeader, StatusPill } from "@/components/admin/wm";
import { formatUsd, formatUsdt } from "@/lib/payments/config";
import { createClient } from "@/lib/supabase/server";
import { paymentsConfigured } from "@/server/payments/solana";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPayments");
  return { title: t("title") };
}

const TONE = { pending: "warn", paid: "ok", expired: "idle" } as const;
const solscan = (sig: string) => `https://solscan.io/tx/${sig}`;
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

// USDT payments: transfers that need an admin, and every order.
export default async function AdminPaymentsPage() {
  const t = await getTranslations("adminPayments");
  const tp = await getTranslations("payments");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: transfers }, { data: orders }] = await Promise.all([
    supabase
      .from("payment_transfers")
      .select("signature, amount_micro, block_time, from_owner")
      .is("order_id", null)
      .order("block_time", { ascending: false })
      .limit(50),
    supabase
      .from("payment_orders")
      .select(
        "id, pack, coins, usd_cents, amount_micro, status, created_at, expires_at, paid_at, tx_signature, employer_profiles(company_name)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const when = (d: string) =>
    format.dateTime(new Date(d), { dateStyle: "medium", timeStyle: "short" });
  const unpaid = (orders ?? [])
    .filter((o) => o.status !== "paid")
    .map((o) => ({
      id: o.id,
      label: `${o.employer_profiles?.company_name ?? "—"} · ${formatUsdt(o.amount_micro)} USDT · ${when(o.created_at)}`,
    }));
  const shown = (o: { status: string; expires_at: string }) =>
    (o.status === "pending" && new Date(o.expires_at) < new Date()
      ? "expired"
      : o.status) as keyof typeof TONE;

  return (
    <>
      <PageHeader title={t("title")} body={t("body")} />
      {!paymentsConfigured() ? (
        <p className="m-0 rounded-3xl bg-wm-land p-5 text-sm font-semibold text-wm-body">
          {t("notSetUp")}
        </p>
      ) : null}

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-wm-1">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("toCheckTitle")}</h2>
        <p className="m-0 text-[13px] font-medium text-wm-slate">{t("toCheckBody")}</p>
        {!transfers?.length ? (
          <p className="m-0 text-sm font-medium text-wm-caption">{t("noneToCheck")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {transfers.map((x) => (
              <li
                key={x.signature}
                className="flex flex-col gap-2 border-b border-wm-line py-3 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-extrabold">{formatUsdt(x.amount_micro)} USDT</span>
                  <span className="font-medium text-wm-slate">{when(x.block_time)}</span>
                  {x.from_owner ? (
                    <span className="font-mono text-xs text-wm-caption">
                      {t("from")} {short(x.from_owner)}
                    </span>
                  ) : null}
                  <a
                    href={solscan(x.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-wm-blue"
                  >
                    {t("explorer")}
                  </a>
                </div>
                <SettleTransfer signature={x.signature} orders={unpaid} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-wm-1">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("ordersTitle")}</h2>
        {!orders?.length ? (
          <p className="m-0 text-sm font-medium text-wm-caption">{t("noneOrders")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-xs text-wm-slate">
                  <th className="py-2 font-semibold">{t("sponsor")}</th>
                  <th className="py-2 font-semibold">{t("pack")}</th>
                  <th className="py-2 font-semibold">{t("expected")}</th>
                  <th className="py-2 font-semibold">{t("when")}</th>
                  <th className="py-2 font-semibold">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const status = shown(o);
                  return (
                    <tr key={o.id} className="border-t border-wm-line">
                      <td className="py-2.5 font-bold">
                        {o.employer_profiles?.company_name ?? "—"}
                      </td>
                      <td className="py-2.5">
                        {tp("packCoins", { count: o.coins })} · {formatUsd(o.usd_cents)}
                      </td>
                      <td className="py-2.5 font-mono">{formatUsdt(o.amount_micro)}</td>
                      <td className="py-2.5 text-wm-slate">{when(o.paid_at ?? o.created_at)}</td>
                      <td className="py-2.5">
                        <span className="flex items-center gap-2">
                          <StatusPill tone={TONE[status]}>{tp(`status.${status}`)}</StatusPill>
                          {o.tx_signature ? (
                            <a
                              href={solscan(o.tx_signature)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-wm-blue"
                            >
                              {t("explorer")}
                            </a>
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
