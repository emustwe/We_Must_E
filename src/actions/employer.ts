"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { logError } from "@/lib/log";
import { fail, ok, type ActionResult } from "@/lib/result";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import {
  idSchema,
  jobSchema,
  jobStatusSchema,
  setInitialPasswordSchema,
} from "@/lib/validations/jobs";

function toRow(job: ReturnType<typeof jobSchema.parse>) {
  return {
    title: job.title,
    description: job.description,
    category: job.category,
    schedule: job.schedule,
    pay_min: job.payMin,
    pay_max: job.payMax ?? null,
    pay_period: job.payPeriod,
    spots: job.spots,
    city_emirate: job.cityEmirate,
    area_label: job.areaLabel,
    address: job.address || null,
    lat: job.lat,
    lng: job.lng,
    starts_on: job.startsOn ?? null,
    expires_at: new Date(Date.now() + job.expiresInDays * 86_400_000).toISOString(),
  };
}

export async function createJob(input: unknown): Promise<ActionResult> {
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const profile = await requireRole("employer");
  if (!(await withinRateLimit("jobPostPerEmployer", profile.id))) return fail("rateLimited");

  const supabase = await createClient();
  // employer_id comes from the session; RLS also requires it to match auth.uid().
  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...toRow(parsed.data), employer_id: profile.id, status: "open" })
    .select("id")
    .single();
  if (error) return dbFail("create-job", error);

  revalidatePath("/employer");
  redirect(`/employer/jobs/${data.id}?posted=1`);
}

export async function updateJob(jobId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(jobId);
  const parsed = jobSchema.safeParse(input);
  if (!id.success) return fail("invalidInput");
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  await requireRole("employer");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update(toRow(parsed.data))
    .eq("id", id.data)
    .select("id");
  if (error) return dbFail("update-job", error);
  if (!data?.length) return fail("notFound");

  revalidatePath(`/employer/jobs/${id.data}`);
  redirect(`/employer/jobs/${id.data}?saved=1`);
}

export async function setJobStatus(input: unknown): Promise<ActionResult> {
  const parsed = jobStatusSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireRole("employer");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.jobId)
    .select("id");
  if (error) return dbFail("job-status", error);
  if (!data?.length) return fail("notFound");
  revalidatePath(`/employer/jobs/${parsed.data.jobId}`);
  revalidatePath("/employer");
  return ok(undefined);
}

// First login for admin-created employers: replace the temporary password.
export async function setInitialPassword(input: unknown): Promise<ActionResult> {
  const parsed = setInitialPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  await requireRole("employer");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password")
      return fail("samePassword", { password: "validation.passwordSame" });
    if (error.code === "weak_password")
      return fail("weakPassword", { password: "validation.passwordWeak" });
    logError("employer-initial-password", error);
    return fail("generic");
  }
  const { error: flagError } = await supabase.rpc("complete_password_change");
  if (flagError) return dbFail("complete-password-change", flagError);
  // End any other session that used the temporary password.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/employer");
}
