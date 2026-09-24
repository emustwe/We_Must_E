import "server-only";
import { cache } from "react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const getEmployerAccount = cache(async () => {
  const profile = await requireRole("employer");
  const supabase = await createClient();
  const { data } = await supabase
    .from("employer_profiles")
    .select("company_name, status")
    .eq("user_id", profile.id)
    .single();
  return { profile, employer: data };
});
