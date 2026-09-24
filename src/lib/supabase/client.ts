import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/types/database";

// Browser client: publishable (anon) key only. Every query is subject to RLS.
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
