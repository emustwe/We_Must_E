import "server-only";
import { after } from "next/server";
import { sendEmailToMany } from "@/lib/email/send";
import { displayTitle } from "@/lib/jobs/display";
import { SUPPORT_EMAIL } from "@/lib/legal";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

// When a job is closed: a kind "this job is now closed" email to everyone who
// sent an application with an email address, after the response is sent.
// Service role: sponsors can't read applications, and the addresses are read
// only here, right after an authorised close.
export function notifyApplicantsJobClosed(jobId: string) {
  after(() => sendJobClosedEmails(jobId));
}

// The same, waited for (the nightly job sends them before the applications
// are deleted).
export async function sendJobClosedEmails(jobId: string) {
  const db = createAdminClient();
  const [{ data: job }, { data: apps, error }] = await Promise.all([
    db.from("jobs").select("title").eq("id", jobId).maybeSingle(),
    db
      .from("applications")
      .select("contact_email")
      .eq("job_id", jobId)
      .neq("status", "in_progress")
      .not("contact_email", "is", null),
  ]);
  if (error) return logError("job-closed-applicants", error);
  const recipients = [
    ...new Set((apps ?? []).map((a) => a.contact_email?.trim().toLowerCase()).filter(Boolean)),
  ] as string[];
  await sendEmailToMany("jobClosed", recipients, {
    jobTitle: displayTitle(job?.title ?? "the job"),
    supportEmail: SUPPORT_EMAIL,
  });
}
