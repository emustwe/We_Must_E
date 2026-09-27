import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";
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
    return Response.json({ abandoned, expired });
  } catch (error) {
    logError("cron-cleanup", error);
    return new Response("Cleanup failed", { status: 500 });
  }
}
