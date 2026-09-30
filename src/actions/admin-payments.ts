"use server";

import { revalidatePath } from "next/cache";
import { requireAdminMfa } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { notifySponsor } from "@/lib/email/notify";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";
import { isSignature } from "@/server/payments/solana";

// An MFA admin pays an order with a USDT transfer that didn't match (wrong
// amount, or too late): the order's Vera go to its sponsor. Audited.
export async function settleTransfer(signature: unknown, orderId: unknown): Promise<ActionResult> {
  const order = idSchema.safeParse(orderId);
  if (!isSignature(signature) || !order.success) return fail("invalidInput");
  await requireAdminMfa();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_settle_transfer", {
    p_signature: signature,
    p_order_id: order.data,
  });
  if (error) return dbFail("admin-settle-payment", error);
  const { data } = await supabase
    .from("payment_orders")
    .select("employer_id")
    .eq("id", order.data)
    .single();
  if (data) notifySponsor("paymentReceived", data.employer_id);
  revalidatePath("/admin/payments");
  return ok(undefined);
}
