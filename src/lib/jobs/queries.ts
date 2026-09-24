import "server-only";
import type { JobSummary } from "@/components/jobs/job-card";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

// Open jobs for the employee map (offset pins, max 300 via the RPC).
export async function listOpenJobs(): Promise<JobSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_open_jobs", {});
  if (error) {
    logError("list-open-jobs", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    schedule: row.schedule,
    payMin: row.pay_min,
    payMax: row.pay_max,
    payPeriod: row.pay_period,
    currency: row.currency,
    area: row.area_label,
    city: row.city_emirate,
    companyName: row.company_name,
    lat: row.lat,
    lng: row.lng,
    requestStatus: row.my_request_status,
  }));
}

export async function getEmployeeStatus(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employee_profiles")
    .select("status")
    .eq("user_id", userId)
    .single();
  return data?.status ?? "draft";
}
