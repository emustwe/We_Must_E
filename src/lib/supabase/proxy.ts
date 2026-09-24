import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/types/database";

type PendingCookie = { name: string; value: string; options: Record<string, unknown> };

// Session refresh inside the proxy. Refreshed cookies are written onto the
// incoming request (so this render sees them) and, via applyTo(), onto whatever
// response the proxy finally returns, including redirects.
export function createProxyClient(request: NextRequest) {
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          pendingCookies.push(...cookiesToSet);
          Object.assign(pendingHeaders, headers);
        },
      },
    },
  );

  function applyTo(response: NextResponse) {
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    Object.entries(pendingHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }

  return { supabase, applyTo };
}
