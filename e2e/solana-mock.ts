import { createServer, type Server } from "node:http";

// A fake Solana JSON-RPC service for the payment tests: it answers the three
// calls the app makes, with transactions the test adds ("the sponsor paid").
export const WALLET = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
export const WEBHOOK_SECRET = "e2e-helius-webhook-secret-0123456789";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const TOKEN_ACCOUNT = "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T";
const SENDER = "7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2";

const txs = new Map<string, { amountMicro: number; blockTime: number }>();

export function addPayment(signature: string, amountMicro: number) {
  txs.set(signature, { amountMicro, blockTime: Math.floor(Date.now() / 1000) });
}

function answer(method: string, params: unknown[]) {
  if (method === "getTokenAccountsByOwner") return { value: [{ pubkey: TOKEN_ACCOUNT }] };
  if (method === "getSignaturesForAddress")
    return [...txs.keys()].reverse().map((signature) => ({ signature, err: null }));
  if (method === "getTransaction") {
    const t = txs.get(params[0] as string);
    if (!t) return null;
    return {
      blockTime: t.blockTime,
      meta: {
        err: null,
        preTokenBalances: [
          {
            accountIndex: 1,
            mint: USDT,
            owner: SENDER,
            uiTokenAmount: { amount: String(t.amountMicro + 1_000_000) },
          },
          { accountIndex: 2, mint: USDT, owner: WALLET, uiTokenAmount: { amount: "0" } },
        ],
        postTokenBalances: [
          { accountIndex: 1, mint: USDT, owner: SENDER, uiTokenAmount: { amount: "1000000" } },
          {
            accountIndex: 2,
            mint: USDT,
            owner: WALLET,
            uiTokenAmount: { amount: String(t.amountMicro) },
          },
        ],
      },
    };
  }
  return null;
}

export function startSolanaMock(): Promise<Server> {
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { id, method, params } = JSON.parse(body || "{}");
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result: answer(method, params ?? []) }));
    });
  });
  return new Promise((resolve) => server.listen(3199, "127.0.0.1", () => resolve(server)));
}
