// Vera packs and the USDT payment settings (no secrets: safe in the browser).

// The packs (USD; sponsors pay the same number of USDT, plus a few hundredths
// that identify the order).
export const PACKS = [
  { id: "pack-10", coins: 10, usdCents: 1000 },
  { id: "pack-200", coins: 200, usdCents: 18000 },
] as const;
export type Pack = { id: string; coins: number; usdCents: number };
export const packById = (id: string): Pack | undefined => PACKS.find((p) => p.id === id);

// Larger amounts: the sponsor types any number of Vera above 300, at $0.80 each.
export const CUSTOM_PACK_ID = "custom";
export const CUSTOM_MIN_COINS = 301;
export const CUSTOM_MAX_COINS = 100_000;
export const CUSTOM_CENTS_PER_COIN = 80;
export function customPack(coins: number): Pack | undefined {
  if (!Number.isInteger(coins) || coins < CUSTOM_MIN_COINS || coins > CUSTOM_MAX_COINS) {
    return undefined;
  }
  return { id: CUSTOM_PACK_ID, coins, usdCents: coins * CUSTOM_CENTS_PER_COIN };
}

// The smallest payment the receiving wallet accepts (Bybit's minimum deposit,
// as set by WemustE: $10, the basic pack). Smaller packs are shown but can't
// be bought, so no sponsor sends an amount that would never arrive.
export const MIN_PAYMENT_CENTS = 1000;
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
