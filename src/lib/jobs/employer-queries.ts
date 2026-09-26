import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// RLS returns only the signed-in employer's own jobs. Only the columns the
// sponsor pages use (not who reviewed it).
export async function getOwnJob(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      "id, title, description, location_label, lat, lng, status, review_note, published_at, created_at, country_code, city",
    )
    .eq("id", jobId)
    .maybeSingle();
  if (!data) notFound();
  return data;
}
