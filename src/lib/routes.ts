import type { Database } from "@/types/database";

export type UserRole = Database["public"]["Enums"]["user_role"];

export const HOME_BY_ROLE: Record<UserRole, string> = {
  employee: "/employee",
  employer: "/employer",
  admin: "/admin",
};

export const PROTECTED_PREFIXES = ["/employee", "/employer", "/admin"] as const;

// Pages a signed-in user has no reason to see; the proxy sends them home.
export const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"] as const;

export function matchesPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// Only same-origin absolute paths; rejects "//evil.com", "/\evil.com" and schemes.
export function safeNextPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
