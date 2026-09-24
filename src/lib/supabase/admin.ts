import "server-only";
import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

// Service-role client: BYPASSES RLS. Only for narrow operations that cannot run
// as the user (rate limiting, account deletion, admin invites). Every call site
// must explain why it needs this client.
export function createAdminClient() {
  return createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
