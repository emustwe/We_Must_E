import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env.server";

// Keyed hash so stored values cannot be reversed by brute-forcing the IPv4 space.
export function hmac(value: string) {
  return createHmac("sha256", serverEnv.IP_HASH_SECRET).update(value).digest("base64url");
}

// Vercel sets x-forwarded-for; its first entry is the client.
export async function getClientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function getIpHash() {
  return hmac(await getClientIp());
}
