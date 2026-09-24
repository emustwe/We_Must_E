import "server-only";
import { notFound } from "next/navigation";
import type { Applicant } from "@/components/employer/applicant-list";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

// RLS returns only the signed-in employer's own jobs.
export async function getOwnJob(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!data) notFound();
  return data;
}

export async function listApplicants(jobId: string): Promise<Applicant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("employer_list_applications", { p_job_id: jobId });
  if (error) {
    logError("employer-list-applications", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    headline: row.headline,
    city: row.city_emirate,
    languages: row.languages ?? [],
    skills: row.skills ?? [],
    availability: row.availability ?? [],
    testScore: row.test_score,
    videoCount: Number(row.video_count ?? 0),
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    whatsapp: row.whatsapp,
  }));
}
