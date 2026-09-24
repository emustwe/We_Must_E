import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/log";
import { cleanupAbandoned } from "@/server/public-application";

// Vercel Cron (vercel.json): removes applications that were never submitted,
// and their videos, 48 hours after they were started.
export async function GET(request: Request) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const result = await cleanupAbandoned();
    return Response.json(result);
  } catch (error) {
    logError("cron-cleanup", error);
    return new Response("Cleanup failed", { status: 500 });
  }
}
