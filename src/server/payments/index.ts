import "server-only";
import { notifyAdmins, notifySponsor } from "@/lib/email/notify";
import { logError } from "@/lib/log";
import { ORDER_MINUTES, type Pack } from "@/lib/payments/config";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { readTransfer, recentSignatures } from "@/server/payments/solana";

// USDT payments. The service role is used because orders and transfers are
// written only by the server: prices come from the pack list, transfers are
// read from the blockchain, so no sponsor can set a price or claim a payment
// (the database functions are executable by the service role only).

export async function createOrder(employerId: string, pack: Pack) {
  const { data, error } = await createAdminClient().rpc("payment_create_order", {
    p_employer_id: employerId,
    p_pack: pack.id,
    p_coins: pack.coins,
    p_usd_cents: pack.usdCents,
    p_minutes: ORDER_MINUTES,
  });
  return { order: data?.[0] ?? null, error };
}

export type ScanResult = { checked: number; paid: number; unmatched: number };

// Checks these transactions on the blockchain and records the USDT that came
// in: an exact order amount pays the order (Vera added once); anything else
// waits for an admin. Transactions already recorded are skipped.
export async function processSignatures(signatures: string[]): Promise<ScanResult> {
  const result: ScanResult = { checked: 0, paid: 0, unmatched: 0 };
  if (!signatures.length) return result;
  const db = createAdminClient();
  const { data: known } = await db
    .from("payment_transfers")
    .select("signature")
    .in("signature", signatures);
  const seen = new Set((known ?? []).map((k) => k.signature));
  for (const signature of signatures.slice(0, 50)) {
    if (seen.has(signature)) continue;
    let transfer;
    try {
      transfer = await readTransfer(signature);
    } catch (error) {
      logError("payment-read", error);
      continue;
    }
    result.checked++;
    if (!transfer || transfer === "not_final") continue;
    const { data, error } = await db.rpc("payment_record_transfer", {
      p_signature: signature,
      p_amount_micro: Number(transfer.amountMicro),
      p_block_time: transfer.blockTime.toISOString(),
      p_from: transfer.from ?? "",
    });
    if (error) {
      logError("payment-record", error);
      continue;
    }
    const row = data?.[0];
    if (row?.result === "paid" && row.order_id) {
      result.paid++;
      const { data: order } = await db
        .from("payment_orders")
        .select("employer_id")
        .eq("id", row.order_id)
        .single();
      if (order) notifySponsor("paymentReceived", order.employer_id);
      notifyAdmins("newPayment");
    } else if (row?.result === "unmatched") {
      result.unmatched++;
      notifyAdmins("newPayment");
    }
  }
  return result;
}

// Reads the wallet's newest transactions. At most once every 15 seconds for
// everyone together (sponsors' pages ask while they wait), so the blockchain
// service is never flooded.
export async function scanWallet(): Promise<ScanResult | null> {
  if (!(await withinRateLimit("paymentScanGlobal", "wallet"))) return null;
  try {
    return await processSignatures(await recentSignatures());
  } catch (error) {
    logError("payment-scan", error);
    return null;
  }
}
