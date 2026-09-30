import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader, StatusPill } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { BuyPackButton } from "@/components/sponsors/buy-pack-button";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
import { getEmployerAccount } from "@/lib/auth/employer";
import { canBuy, formatUsd, formatUsdt, MIN_PAYMENT_CENTS, PACKS } from "@/lib/payments/config";
import { createClient } from "@/lib/supabase/server";
import { paymentsConfigured } from "@/server/payments/solana";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payments");
  return { title: t("title") };
}

const TONE = { pending: "warn", paid: "ok", expired: "idle" } as const;

// Buy Era: the packs, and the sponsor's own payments.
export default async function CoinsPage() {
  const { profile, employer } = await getEmployerAccount();
  const t = await getTranslations("payments");
  const tc = await getTranslations("ecoins");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("payment_orders")
    .select("id, coins, usd_cents, amount_micro, status, created_at, expires_at")
    .eq("employer_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const configured = paymentsConfigured();
  const shownStatus = (o: { status: string; expires_at: string }) =>
    o.status === "pending" && new Date(o.expires_at) < new Date() ? "expired" : o.status;

  return (
    <>
      <Crumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        body={`${tc("balanceLabel", { count: employer?.ecoin_balance ?? 0 })}. ${t("body")}`}
      />
      {!configured ? (
        <p className="m-0 rounded-3xl bg-wm-land p-5 text-sm font-semibold text-wm-body">
          {t("notSetUp")}
        </p>
      ) : null}
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
        {PACKS.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-wm-1"
            data-pack={p.id}
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-wm-tint text-wm-blue">
              <WmIcon name="coin" size={20} stroke={2.2} />
            </span>
            <span className="text-2xl font-extrabold tracking-[-0.6px]">
              {t("packCoins", { count: p.coins })}
            </span>
            <span className="text-lg font-bold">{formatUsd(p.usdCents)}</span>
            <span className="text-[13px] font-medium text-wm-slate">
              {t("perCoin", { price: formatUsd(Math.round(p.usdCents / p.coins)) })}
            </span>
            {!configured ? null : canBuy(p) ? (
              <BuyPackButton packId={p.id} />
            ) : (
              <span className="rounded-2xl bg-wm-land px-3.5 py-3 text-[13px] font-semibold text-wm-body">
                {t("belowMinimum", { amount: formatUsd(MIN_PAYMENT_CENTS) })}
              </span>
            )}
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-wm-1">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("historyTitle")}</h2>
        {!orders?.length ? (
          <p className="m-0 text-sm font-medium text-wm-caption">{t("historyEmpty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {orders.map((o) => {
              const status = shownStatus(o) as keyof typeof TONE;
              return (
                <li key={o.id} className="border-b border-wm-line last:border-0">
                  <Link
                    href={`/sponsor/coins/${o.id}`}
                    className="flex flex-wrap items-center gap-3 py-3 text-wm-ink no-underline"
                  >
                    <span className="grow text-sm font-bold">
                      {t("packCoins", { count: o.coins })} · {formatUsdt(o.amount_micro)} USDT
                    </span>
                    <span className="text-xs font-semibold text-wm-caption">
                      {format.dateTime(new Date(o.created_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <StatusPill tone={TONE[status]}>{t(`status.${status}`)}</StatusPill>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
