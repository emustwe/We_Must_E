import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";
import { GUEST_ONLY_PATHS, HOME_BY_ROLE, PROTECTED_PREFIXES, matchesPrefix } from "@/lib/routes";
import { createProxyClient } from "@/lib/supabase/proxy";

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
// MapTiler: raster map tiles and place search (geocoding).
const MAP_ORIGIN = "https://api.maptiler.com";

function buildCsp(nonce: string) {
  const supabase = new URL(clientEnv.NEXT_PUBLIC_SUPABASE_URL);
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE_ORIGIN}${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (Radix, Sonner, Turnstile) cannot carry a nonce.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${supabase.origin} ${MAP_ORIGIN}`,
    "font-src 'self'",
    // Live map updates use Supabase Realtime over a websocket (ws:// only locally).
    `connect-src 'self' ${supabase.origin} ${supabase.protocol === "https:" ? "wss" : "ws"}://${supabase.host} ${TURNSTILE_ORIGIN} ${MAP_ORIGIN}`,
    `media-src 'self' blob: ${supabase.origin}`,
    `frame-src ${TURNSTILE_ORIGIN}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

// UX routing only. Every page, server action and query enforces access on its
// own (requireRole + RLS); nothing relies on this file for security.
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const { pathname } = request.nextUrl;

  const { supabase, applyTo } = createProxyClient(request);
  // Verifies the JWT and refreshes the session cookies when needed.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  let response: NextResponse;

  if (!userId && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    response = NextResponse.redirect(new URL("/login", request.url));
  } else if (userId && matchesPrefix(pathname, GUEST_ONLY_PATHS)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    response = NextResponse.redirect(
      new URL(profile ? HOME_BY_ROLE[profile.role] : "/", request.url),
    );
  } else {
    // Built after getClaims() so refreshed cookies are forwarded to this render.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set("Content-Security-Policy", csp);
  return applyTo(response);
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
