import "server-only";
import { cookies } from "next/headers";

// Lets /verify-email offer "resend" without putting the address in the URL.
const PENDING_EMAIL_COOKIE = "wm_pending_email";

export async function rememberPendingEmail(email: string) {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function readPendingEmail() {
  return (await cookies()).get(PENDING_EMAIL_COOKIE)?.value ?? null;
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  return `${local.slice(0, 1)}${"•".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}
