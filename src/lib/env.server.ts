import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  IP_HASH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().optional(),
});

const parsed = serverSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  IP_HASH_SECRET: process.env.IP_HASH_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
});

if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid or missing server environment variables: ${names}`);
}

export const serverEnv = parsed.data;
