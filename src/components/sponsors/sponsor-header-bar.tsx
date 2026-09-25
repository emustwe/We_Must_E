import { Bell, Coins } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

// The sponsor's E-coin balance and new (still locked) candidates, in the header.
export async function SponsorHeaderBar({ balance }: { balance: number }) {
  const t = await getTranslations("ecoins");
  const supabase = await createClient();
  const { data } = await supabase.rpc("sponsor_all_candidates", { p_page: 0 });
  const locked = Number(data?.[0]?.locked_total ?? 0);
  return (
    <>
      <Link
        href="/sponsor/account#ecoins"
        className="flex h-9 items-center gap-1.5 rounded-full bg-brand-accent/15 px-3 text-sm font-bold"
        aria-label={t("balanceLabel", { count: balance })}
      >
        <Coins className="size-4 text-brand-accent" aria-hidden="true" />
        <span aria-hidden="true">{balance}</span>
      </Link>
      <Link
        href="/sponsor/candidates"
        className="relative flex size-9 items-center justify-center rounded-full hover:bg-muted"
        aria-label={t("newCandidates", { count: locked })}
      >
        <Bell className="size-5" aria-hidden="true" />
        {locked ? (
          <span className="absolute -end-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
            {locked > 99 ? "99+" : locked}
          </span>
        ) : null}
      </Link>
    </>
  );
}
