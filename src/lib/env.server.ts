import "server-only";
import { z } from "@/lib/validations/zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  IP_HASH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().optional(),
  // Verified Resend sender, e.g. "Wemuste <no-reply@wemuste.com>".
  EMAIL_FROM: z.string().min(3).default("Wemuste <no-reply@wemuste.example>"),
  // Local development only: deliver app emails to Mailpit instead of Resend.
  SMTP_URL: z.url().optional(),
  // Where jobs may be placed: "south,west,north,east". Default: the UAE.
  JOB_AREA_BOUNDS: z
    .string()
    .regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/)
    .default("22.5,51.0,26.5,56.6"),
  // Cloudflare Turnstile secret for public applications. Required in production.
  TURNSTILE_SECRET_KEY: z.string().optional(),
  // HMAC key for application draft tokens (stored hashed). At least 32 characters.
  APP_TOKEN_SECRET: z.string().min(32),
  // Vercel Cron sends it as a Bearer token to /api/cron/cleanup.
  CRON_SECRET: z.string().min(16).optional(),
  // Who is told about new applications (no personal data in the email).
  ADMIN_NOTIFY_EMAIL: z.email().optional(),
  // Ask applicants to confirm their phone with a code (needs an SMS provider).
  REQUIRE_PHONE_OTP: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = serverSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  IP_HASH_SECRET: process.env.IP_HASH_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  SMTP_URL: process.env.SMTP_URL || undefined,
  JOB_AREA_BOUNDS: process.env.JOB_AREA_BOUNDS || undefined,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
  APP_TOKEN_SECRET: process.env.APP_TOKEN_SECRET,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  ADMIN_NOTIFY_EMAIL: process.env.ADMIN_NOTIFY_EMAIL || undefined,
  REQUIRE_PHONE_OTP: process.env.REQUIRE_PHONE_OTP || undefined,
});

if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid or missing server environment variables: ${names}`);
}

export const serverEnv = parsed.data;
