"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import type { ApplicationStatus, Availability, JobCategory, PayPeriod } from "@/lib/jobs/meta";
import { fail, ok, type ActionResult } from "@/lib/result";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import { idSchema, jobRequestSchema } from "@/lib/validations/jobs";

export type JobDetail = {
  id: string;
  title: string;
  description: string;
  category: JobCategory;
  schedule: Availability[];
  payMin: number;
  payMax: number | null;
  payPeriod: PayPeriod;
  currency: string;
  spots: number;
  city: string;
  area: string;
  startsOn: string | null;
  companyName: string;
  requestId: string | null;
  requestStatus: ApplicationStatus | null;
  // Only after the employer accepts this employee's request.
  exactAddress: string | null;
  exactLat: number | null;
  exactLng: number | null;
};

export async function getJobDetail(jobId: unknown): Promise<ActionResult<JobDetail>> {
  const parsed = idSchema.safeParse(jobId);
  if (!parsed.success) return fail("invalidInput");
  await requireRole("employee");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_job", { p_job_id: parsed.data }).maybeSingle();
  if (error) return dbFail("get-job", error);
  if (!data) return fail("notFound");

  return ok({
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    schedule: data.schedule,
    payMin: data.pay_min,
    payMax: data.pay_max,
    payPeriod: data.pay_period,
    currency: data.currency,
    spots: data.spots,
    city: data.city_emirate,
    area: data.area_label,
    startsOn: data.starts_on,
    companyName: data.company_name,
    requestId: data.my_request_id,
    requestStatus: data.my_request_status,
    exactAddress: data.exact_address,
    exactLat: data.exact_lat,
    exactLng: data.exact_lng,
  });
}

export async function requestJob(input: unknown): Promise<ActionResult> {
  const parsed = jobRequestSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const profile = await requireRole("employee");
  if (!(await withinRateLimit("jobRequestPerUser", profile.id))) return fail("rateLimited");

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_job", {
    p_job_id: parsed.data.jobId,
    p_message: parsed.data.message || undefined,
  });
  if (error) return dbFail("request-job", error);
  revalidatePath("/employee", "layout");
  return ok(undefined);
}

export async function withdrawJobRequest(requestId: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(requestId);
  if (!parsed.success) return fail("invalidInput");
  await requireRole("employee");

  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_job_request", { p_application_id: parsed.data });
  if (error) return dbFail("withdraw-request", error);
  revalidatePath("/employee", "layout");
  return ok(undefined);
}
