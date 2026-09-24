import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { HOME_BY_ROLE, type UserRole } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// Identity is always taken from getUser(), which validates the session with the
// Auth server. Never trust getSession() on the server.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Role comes from public.profiles (not user_metadata, which users can edit).
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();
  return data;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!roles.includes(profile.role)) redirect(HOME_BY_ROLE[profile.role]);
  return profile;
}

// Admin pages need a completed MFA challenge in this session (aal2). RLS
// enforces the same rule, so this is about UX, not the only line of defence.
export async function requireAdminMfa() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel !== "aal2") redirect("/admin/mfa");
  return profile;
}
