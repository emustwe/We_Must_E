import { USDT_MINT } from "@/lib/payments/config";

// Reading a Solana transaction (the "jsonParsed" form of getTransaction):
// how much USDT one wallet received in it. Pure, so it is unit-tested.

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string };
};
export type SolanaTx = {
  blockTime: number | null;
  meta: {
    err: unknown;
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  } | null;
} | null;

export type IncomingTransfer = { amountMicro: bigint; blockTime: Date; from: string | null };

// The USDT that `owner` received in a transaction (null if none, or failed).
export function incomingUsdt(tx: SolanaTx, owner: string): IncomingTransfer | null {
  if (!tx?.meta || tx.meta.err || !tx.blockTime) return null;
  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];
  const sum = (list: TokenBalance[]) =>
    list
      .filter((b) => b.mint === USDT_MINT && b.owner === owner)
      .reduce((a, b) => a + BigInt(b.uiTokenAmount.amount), BigInt(0));
  const received = sum(post) - sum(pre);
  if (received <= BigInt(0)) return null;
  // The sender: another owner whose USDT went down.
  const from =
    pre.find((b) => {
      if (b.mint !== USDT_MINT || !b.owner || b.owner === owner) return false;
      const after = post.find((p) => p.accountIndex === b.accountIndex);
      return BigInt(after?.uiTokenAmount.amount ?? "0") < BigInt(b.uiTokenAmount.amount);
    })?.owner ?? null;
  return { amountMicro: received, blockTime: new Date(tx.blockTime * 1000), from };
}

// A Solana transaction signature (base58, 64 bytes).
export const isSignature = (s: unknown): s is string =>
  typeof s === "string" && /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(s);
