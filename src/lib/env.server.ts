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
});

const parsed = serverSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  IP_HASH_SECRET: process.env.IP_HASH_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  SMTP_URL: process.env.SMTP_URL || undefined,
});

if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid or missing server environment variables: ${names}`);
}

export const serverEnv = parsed.data;
