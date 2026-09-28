import "server-only";
import { serverEnv } from "@/lib/env.server";
import { USDT_MINT } from "@/lib/payments/config";
import { incomingUsdt, type IncomingTransfer, type SolanaTx } from "@/lib/payments/solana-tx";

export { isSignature } from "@/lib/payments/solana-tx";

// Reads the Solana blockchain (JSON-RPC, through Helius) to see what USDT
// reached the payment wallet. Nothing a sender or a notice claims is trusted:
// every transfer is read back from the chain, final ("finalized") only.

export const paymentWallet = () => serverEnv.PAYMENT_SOLANA_ADDRESS ?? null;

function rpcUrl() {
  if (serverEnv.SOLANA_RPC_URL) return serverEnv.SOLANA_RPC_URL;
  if (serverEnv.HELIUS_API_KEY)
    return `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(serverEnv.HELIUS_API_KEY)}`;
  return null;
}

// Payments are on only when the wallet and the blockchain reader are set.
export const paymentsConfigured = () => Boolean(paymentWallet() && rpcUrl());

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const url = rpcUrl();
  if (!url) throw new Error("solana_not_configured");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`solana_http_${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { code: number } };
  if (body.error) throw new Error(`solana_rpc_${body.error.code}`);
  return body.result as T;
}

// One transaction, final only: the USDT it brought in, "not_final" (try
// again later) or null (nothing for us).
export async function readTransfer(
  signature: string,
): Promise<IncomingTransfer | "not_final" | null> {
  const owner = paymentWallet();
  if (!owner) return null;
  const tx = await rpc<SolanaTx>("getTransaction", [
    signature,
    { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
  ]);
  if (tx === null) return "not_final";
  return incomingUsdt(tx, owner);
}

// The newest transactions of the wallet's USDT account(s).
export async function recentSignatures(limit = 25): Promise<string[]> {
  const owner = paymentWallet();
  if (!owner) return [];
  const accounts = await rpc<{ value: { pubkey: string }[] }>("getTokenAccountsByOwner", [
    owner,
    { mint: USDT_MINT },
    { encoding: "jsonParsed", commitment: "finalized" },
  ]);
  const signatures: string[] = [];
  for (const { pubkey } of accounts.value.slice(0, 3)) {
    const list = await rpc<{ signature: string; err: unknown }[]>("getSignaturesForAddress", [
      pubkey,
      { limit, commitment: "finalized" },
    ]);
    for (const s of list) if (!s.err) signatures.push(s.signature);
  }
  return [...new Set(signatures)];
}
