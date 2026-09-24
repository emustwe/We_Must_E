import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env.server";

// The applicant's only credential: a random 32-byte token in an httpOnly
// cookie, scoped to this job's apply pages. Only its HMAC is stored.
export const TOKEN_TTL_SECONDS = 24 * 60 * 60;

const cookieName = (jobId: string) => `wm_apply_${jobId}`;
const cookiePath = (jobId: string) => `/apply/${jobId}`;

export function hashToken(token: string) {
  return createHmac("sha256", serverEnv.APP_TOKEN_SECRET).update(token).digest("base64url");
}

export async function issueToken(jobId: string) {
  const token = randomBytes(32).toString("base64url");
  (await cookies()).set(cookieName(jobId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: cookiePath(jobId),
    maxAge: TOKEN_TTL_SECONDS,
  });
  return hashToken(token);
}

// Hash of the token for this job, or null when there is none.
export async function readTokenHash(jobId: string) {
  const token = (await cookies()).get(cookieName(jobId))?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return hashToken(token);
}

export async function clearToken(jobId: string) {
  (await cookies()).set(cookieName(jobId), "", { path: cookiePath(jobId), maxAge: 0 });
}
