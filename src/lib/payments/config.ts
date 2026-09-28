// E-coin packs and the USDT payment settings (no secrets: safe in the browser).

// PLACEHOLDER prices: set the real packs and prices here (USD; sponsors pay
// the same number of USDT, plus a few hundredths that identify the order).
export const PACKS = [
  { id: "pack-10", coins: 10, usdCents: 1000 },
  { id: "pack-50", coins: 50, usdCents: 4500 },
  { id: "pack-200", coins: 200, usdCents: 16000 },
] as const;
export type Pack = (typeof PACKS)[number];
export const packById = (id: string) => PACKS.find((p) => p.id === id);

// The smallest payment the receiving wallet accepts (Bybit's minimum deposit,
// as set by Muste: $20). Smaller packs are shown but can't be bought, so no
// sponsor sends an amount that would never arrive.
export const MIN_PAYMENT_CENTS = 2000;
export const canBuy = (pack: Pack) => pack.usdCents >= MIN_PAYMENT_CENTS;

// Tether's USDT on Solana (the official mint; fakes with the same name exist).
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const USDT_DECIMALS = 6;
// How long an order stays open for payment.
export const ORDER_MINUTES = 30;

// 50013700 micro-USDT -> "50.0137" (4 decimals are always enough: orders
// differ by 0.0001).
export function formatUsdt(micro: number | bigint) {
  const n = Number(micro) / 10 ** USDT_DECIMALS;
  return n.toFixed(4);
}

export const formatUsd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

// A Solana Pay link for wallets that scan it (Phantom, Solflare, ...).
export function solanaPayUrl(address: string, micro: number | bigint, label: string) {
  const params = new URLSearchParams({
    amount: formatUsdt(micro),
    "spl-token": USDT_MINT,
    label,
  });
  return `solana:${address}?${params}`;
}
