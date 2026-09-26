"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEmployerAccount } from "@/lib/auth/employer";
import { completePasswordChange } from "@/lib/auth/password-change";
import { requireRole } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { notifyAdmins } from "@/lib/email/notify";
import { jobAreaBounds } from "@/lib/jobs/area";
import { countryName } from "@/lib/geo/countries";
import { isInside } from "@/lib/jobs/meta";
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

type JobData = ReturnType<typeof jobSchema.parse>;

// The three employer fields. The point must be inside the service area.
function toRow(job: JobData) {
  return {
    title: job.title,
    description: job.description,
    location_label: job.locationLabel,
    lat: job.lat,
    lng: job.lng,
    country_code: job.countryCode.toUpperCase(),
    country_name: countryName(job.countryCode),
    city: job.city,
  };
}

function parseJob(input: unknown): { error: ActionResult } | { data: JobData } {
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { error: fail("invalidInput", toFieldErrors(parsed.error)) };
  if (!isInside(jobAreaBounds(), parsed.data.lat, parsed.data.lng)) {
    return { error: fail("invalidInput", { lat: "validation.locationOutside" }) };
  }
  return { data: parsed.data };
}

export async function createJob(input: unknown): Promise<ActionResult> {
  const parsed = parseJob(input);
  if ("error" in parsed) return parsed.error;
  const profile = await requireRole("employer");
  if (!(await withinRateLimit("jobPostPerEmployer", profile.id))) return fail("rateLimited");

  const supabase = await createClient();
  // employer_id comes from the session; RLS also requires it to match auth.uid().
  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...toRow(parsed.data), employer_id: profile.id })
    .select("id")
    .single();
  if (error) return dbFail("create-job", error);

  // New jobs wait for an admin; tell the team.
  notifyAdmins("newJob");
  revalidatePath("/sponsor");
  redirect(`/sponsor/jobs/${data.id}?posted=1`);
}

export async function updateJob(jobId: unknown, input: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(jobId);
  if (!id.success) return fail("invalidInput");
  const parsed = parseJob(input);
  if ("error" in parsed) return parsed.error;
  await requireRole("employer");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update(toRow(parsed.data))
    .eq("id", id.data)
    .select("id, status");
  if (error) return dbFail("update-job", error);
  if (!data?.length) return fail("notFound");

  // Changes to a live job send it back for review (the database decides).
  const inReview = data[0].status === "pending";
  if (inReview) notifyAdmins("newJob");
  revalidatePath(`/sponsor/jobs/${id.data}`);
  revalidatePath("/");
  redirect(`/sponsor/jobs/${id.data}?${inReview ? "review=1" : "saved=1"}`);
}

// Employers can only close a published job (the database enforces this too).
export async function closeJob(input: unknown): Promise<ActionResult> {
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
  revalidatePath(`/sponsor/jobs/${parsed.data.jobId}`);
  revalidatePath("/sponsor");
  revalidatePath("/");
  return ok(undefined);
}

// First login for admin-created employers: replace the temporary password.
export async function setInitialPassword(input: unknown): Promise<ActionResult> {
  const parsed = setInitialPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const profile = await requireRole("employer");
  // Only while the first-login change is still due.
  const { employer } = await getEmployerAccount();
  if (!employer?.must_change_password) return fail("forbidden");

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
  if (!(await completePasswordChange(profile.id))) return fail("generic");
  // End any other session that used the temporary password.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/sponsor");
}
