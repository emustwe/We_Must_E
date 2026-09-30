import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { CopyButton } from "@/components/sponsors/candidate-media";
import { PaymentWaiter } from "@/components/sponsors/payment-waiter";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
import { requireRole } from "@/lib/auth/session";
import { formatUsd, formatUsdt, solanaPayUrl } from "@/lib/payments/config";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";
import { paymentWallet } from "@/server/payments/solana";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payments");
  return { title: t("title"), robots: { index: false, follow: false } };
}

// One order: what to send and where, until it's paid or expires.
export default async function OrderPage({ params }: PageProps<"/sponsor/coins/[orderId]">) {
  const { orderId } = await params;
  if (!idSchema.safeParse(orderId).success) notFound();
  const profile = await requireRole("employer");
  const t = await getTranslations("payments");
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("payment_orders")
    .select("id, coins, usd_cents, amount_micro, status, expires_at")
    .eq("id", orderId)
    .eq("employer_id", profile.id)
    .maybeSingle();
  if (!order) notFound();
  const address = paymentWallet();
  const amount = formatUsdt(order.amount_micro);
  const expired = order.status === "expired" || new Date(order.expires_at) < new Date();
  const crumbs = (
    <Crumbs items={[{ label: t("title"), href: "/sponsor/coins" }, { label: `${amount} USDT` }]} />
  );

  if (order.status === "paid") {
    return (
      <>
        {crumbs}
        <Notice icon="check" title={t("paidTitle")} body={t("paidBody", { coins: order.coins })}>
          <Link href="/sponsor/candidates" className={btn("primary")}>
            {t("seeCandidates")}
          </Link>
          <Link href="/sponsor/coins" className={btn("secondary")}>
            {t("backToCoins")}
          </Link>
        </Notice>
      </>
    );
  }
  if (expired || !address) {
    return (
      <>
        {crumbs}
        <Notice icon="info" title={t("expiredTitle")} body={t("expiredBody")}>
          <Link href="/sponsor/coins" className={btn("primary")}>
            {t("newOrder")}
          </Link>
        </Notice>
      </>
    );
  }

  const qr = await QRCode.toString(solanaPayUrl(address, order.amount_micro, "WemustE Era"), {
    type: "svg",
    margin: 1,
    width: 200,
  });
  return (
    <>
      {crumbs}
      <div className="flex flex-col gap-4 xl:flex-row">
        <section className="box-border flex w-full flex-col gap-5 self-start rounded-3xl bg-white p-6 shadow-wm-1 xl:max-w-[560px]">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.7px]">
              {t("orderTitle", { amount })}
            </h1>
            <span className="text-[13px] font-medium text-wm-slate">
              {t("orderFor", { coins: order.coins, price: formatUsd(order.usd_cents) })}
            </span>
          </div>
          <dl className="m-0 flex flex-col gap-2.5">
            <Row
              label={t("sendExactly")}
              value={`${amount} USDT`}
              copy={amount}
              copyLabel={t("copyAmount")}
              big
            />
            <Row label={t("token")} value={t("tokenValue")} />
            <Row label={t("network")} value={t("networkValue")} />
            <Row
              label={t("address")}
              value={address}
              copy={address}
              copyLabel={t("copyAddress")}
              mono
            />
          </dl>
          <div className="rounded-2xl bg-[#FEF6E4] p-4 text-[13px] font-semibold text-[#7A4B06]">
            <p className="m-0 mb-1.5 font-extrabold">{t("warnTitle")}</p>
            <ul className="m-0 flex list-disc flex-col gap-1 ps-5">
              <li>{t("warn1")}</li>
              <li>{t("warn2")}</li>
              <li>{t("warn3")}</li>
            </ul>
          </div>
          <PaymentWaiter orderId={order.id} expiresAt={order.expires_at} />
        </section>
        <section className="flex flex-col items-center gap-3 self-start rounded-3xl bg-white p-6 shadow-wm-1">
          <div
            className="size-[200px]"
            role="img"
            aria-label={t("scan")}
            // A QR code made on the server from our own values (an SVG, no script).
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <span className="max-w-[220px] text-center text-[13px] font-medium text-wm-slate">
            {t("scan")}
          </span>
        </section>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  copy,
  copyLabel,
  big,
  mono,
}: {
  label: string;
  value: string;
  copy?: string;
  copyLabel?: string;
  big?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-wm-land px-3.5 py-2.5">
      <span className="flex min-w-0 grow flex-col">
        <dt className="text-[11px] font-semibold text-wm-slate">{label}</dt>
        <dd
          className={`m-0 font-bold break-all ${big ? "text-xl" : "text-sm"} ${mono ? "font-mono" : ""}`}
          dir="ltr"
        >
          {value}
        </dd>
      </span>
      {copy && copyLabel ? <CopyButton value={copy} label={copyLabel} /> : null}
    </div>
  );
}

function Notice({
  icon,
  title,
  body,
  children,
}: {
  icon: "check" | "info";
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex max-w-xl flex-col items-start gap-3 rounded-3xl bg-white p-6 shadow-wm-1">
      <span className="flex size-12 items-center justify-center rounded-full bg-wm-tint text-wm-blue">
        <WmIcon name={icon} size={22} stroke={2.4} />
      </span>
      <h1 className="m-0 text-2xl font-extrabold tracking-[-0.6px]">{title}</h1>
      <p className="m-0 text-sm font-medium text-wm-slate">{body}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
