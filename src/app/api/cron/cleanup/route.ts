import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanupAbandoned, cleanupExpired } from "@/server/public-application";

// Vercel Cron (vercel.json), every night: removes applications that were never
// submitted (48 hours after they were started), and sent applications whose
// job closed or that are older than the retention period, with their files.
export async function GET(request: Request) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const abandoned = await cleanupAbandoned();
    const expired = await cleanupExpired();
    // Handled "become a sponsor" requests, 90 days on.
    const { data: requests } = await createAdminClient().rpc("app_delete_old_sponsor_requests", {
      p_days: 90,
    });
    return Response.json({ abandoned, expired, sponsorRequests: requests ?? 0 });
  } catch (error) {
    logError("cron-cleanup", error);
    return new Response("Cleanup failed", { status: 500 });
  }
}
