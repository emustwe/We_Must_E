import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// RLS returns only the signed-in employer's own jobs.
export async function getOwnJob(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!data) notFound();
  return data;
}
