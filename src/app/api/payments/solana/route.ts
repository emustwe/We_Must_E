import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";
import { processSignatures } from "@/server/payments";
import { isSignature } from "@/server/payments/solana";

// Helius calls this when a transaction touches the payment wallet. The notice
// carries the secret we set in Helius (its "Authentication header"); only the
// transaction signatures are taken from it, and each transaction is read back
// from the blockchain before anything is recorded.
export async function POST(request: Request) {
  const secret = serverEnv.HELIUS_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const items = Array.isArray(body) ? body.slice(0, 100) : [body];
  const signatures = items
    .map((item) => {
      const tx = item as { signature?: unknown; transaction?: { signatures?: unknown[] } };
      return tx?.signature ?? tx?.transaction?.signatures?.[0];
    })
    .filter(isSignature);
  try {
    const result = await processSignatures([...new Set(signatures)]);
    return Response.json(result);
  } catch (error) {
    logError("payment-webhook", error);
    return new Response("Failed", { status: 500 });
  }
}
