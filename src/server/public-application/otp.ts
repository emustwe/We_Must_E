import "server-only";
import { randomInt } from "node:crypto";
import { hmac } from "@/lib/security/ip";

// Phone confirmation codes, used only when REQUIRE_PHONE_OTP=true.
// To switch it on, implement SmsProvider for an SMS/WhatsApp service and
// return it from getSmsProvider().
export interface SmsProvider {
  send(toE164: string, message: string): Promise<void>;
}

// Local development: prints the code (never the number) to the server log.
const devProvider: SmsProvider = {
  async send(_to, message) {
    console.info(JSON.stringify({ level: "info", context: "otp-dev", message }));
  },
};

export function getSmsProvider(): SmsProvider | null {
  if (process.env.NODE_ENV !== "production") return devProvider;
  return null; // No provider configured yet: sending fails closed.
}

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export function newCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export const hashCode = (applicationId: string, code: string) =>
  hmac(`otp:${applicationId}:${code}`);
