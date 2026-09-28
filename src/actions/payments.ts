"use server";

import { revalidatePath } from "next/cache";
import { getEmployerAccount } from "@/lib/auth/employer";
import { requireRole } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { packById } from "@/lib/payments/config";
import { fail, ok, type ActionResult } from "@/lib/result";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";
import { z } from "@/lib/validations/zod";
import { createOrder, scanWallet } from "@/server/payments";
import { paymentsConfigured } from "@/server/payments/solana";

// A sponsor starts paying for a pack: an order with its own exact USDT amount.
export async function buyPack(packId: unknown): Promise<ActionResult<{ orderId: string }>> {
  const pack = typeof packId === "string" ? packById(packId) : undefined;
  if (!pack) return fail("invalidInput");
  const { profile, employer } = await getEmployerAccount();
  if (employer?.status !== "approved") return fail("forbidden");
  if (!paymentsConfigured()) return fail("paymentsOff");
  if (!(await withinRateLimit("paymentOrderPerEmployer", profile.id))) return fail("rateLimited");
  const { order, error } = await createOrder(profile.id, pack);
  if (error) return dbFail("payment-order", error);
  if (!order) return fail("generic");
  return ok({ orderId: order.id });
}

export type OrderStatus = "pending" | "paid" | "expired";

// The order's status for the waiting page. `check` is the sponsor pressing
// "I've paid — check now"; otherwise the page asks every few seconds and the
// server looks at the blockchain at most every 15 seconds for everyone.
export async function paymentStatus(
  orderId: unknown,
  check: unknown = false,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const parsed = idSchema.safeParse(orderId);
  const wantsCheck = z.boolean().safeParse(check);
  if (!parsed.success || !wantsCheck.success) return fail("invalidInput");
  const profile = await requireRole("employer");
  const supabase = await createClient();
  const read = () =>
    supabase.from("payment_orders").select("status").eq("id", parsed.data).maybeSingle();
  let { data } = await read();
  if (!data) return fail("notFound");
  if (data.status === "pending") {
    if (wantsCheck.data && !(await withinRateLimit("paymentCheckPerEmployer", profile.id))) {
      return fail("rateLimited");
    }
    const scan = await scanWallet();
    if (scan?.paid) {
      ({ data } = await read());
      revalidatePath("/sponsor", "layout");
    }
  }
  return ok({ status: (data?.status ?? "pending") as OrderStatus });
}
