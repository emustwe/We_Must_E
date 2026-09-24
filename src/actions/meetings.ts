"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { dbFail } from "@/lib/db-errors";
import { notifyUser } from "@/lib/email/notify";
import { fail, ok, type ActionResult } from "@/lib/result";
import { getIpHash } from "@/lib/security/ip";
import { withinRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validations/auth";
import {
  mediaRequestSchema,
  meetingRequestSchema,
  meetingResponseSchema,
  meetingUpdateSchema,
} from "@/lib/validations/meetings";

// ---------------------------------------------------------------- employer
export async function requestMeeting(input: unknown): Promise<ActionResult> {
  const parsed = meetingRequestSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  const profile = await requireRole("employer");
  if (!(await withinRateLimit("meetingPerEmployer", profile.id))) return fail("rateLimited");

  const supabase = await createClient();
  // RLS: only with `profile` access (grant or the job seeker's request) to this person.
  const { error } = await supabase.from("meeting_requests").insert({
    employer_id: profile.id,
    employee_id: parsed.data.employeeId,
    proposed_slots: parsed.data.slots,
  });
  if (error?.code === "23505") return fail("meetingOpen");
  if (error) return dbFail("request-meeting", error);
  notifyUser("meetingRequested", parsed.data.employeeId);
  revalidatePath("/employer", "layout");
  return ok(undefined);
}

export async function updateMeeting(input: unknown): Promise<ActionResult> {
  const parsed = meetingUpdateSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput", toFieldErrors(parsed.error));
  await requireRole("employer");
  const supabase = await createClient();
  const { error } = await supabase.rpc("employer_update_meeting_request", {
    p_request_id: parsed.data.requestId,
    p_status: parsed.data.status,
    p_meeting_link: parsed.data.meetingLink,
  });
  if (error) return dbFail("update-meeting", error);
  revalidatePath("/employer", "layout");
  return ok(undefined);
}

// A 5-minute link to one video or CV. Storage RLS checks access; every link
// handed out is recorded in the audit log.
export async function getCandidateMediaUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = mediaRequestSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  const profile = await requireRole("employer");
  if (!(await withinRateLimit("mediaViewPerEmployer", profile.id))) return fail("rateLimited");
  const { employeeId, kind, id } = parsed.data;
  const supabase = await createClient();

  const row =
    kind === "video"
      ? await supabase
          .from("video_resumes")
          .select("storage_path")
          .eq("id", id)
          .eq("employee_id", employeeId)
          .maybeSingle()
      : await supabase
          .from("cv_documents")
          .select("storage_path")
          .eq("id", id)
          .eq("employee_id", employeeId)
          .maybeSingle();
  if (!row.data) return fail("notFound");

  const { error: logError } = await supabase.rpc("log_candidate_access", {
    p_employee_id: employeeId,
    p_scope: kind,
    p_ip_hash: await getIpHash(),
  });
  if (logError) return dbFail("log-media-access", logError);

  const bucket = kind === "video" ? "video-resumes" : "cv-documents";
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(row.data.storage_path, 300);
  if (error || !data) return fail("forbidden");
  return ok({ url: data.signedUrl });
}

// ---------------------------------------------------------------- employee
export async function respondToMeeting(input: unknown): Promise<ActionResult> {
  const parsed = meetingResponseSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");
  await requireRole("employee");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_meeting_request", {
    p_request_id: parsed.data.requestId,
    p_accept: parsed.data.accept,
    p_slot: parsed.data.slot,
  });
  if (error) return dbFail("respond-meeting", error);
  const { data: meeting } = await supabase
    .from("meeting_requests")
    .select("employer_id")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  if (meeting) notifyUser("meetingAnswered", meeting.employer_id);
  revalidatePath("/employee", "layout");
  return ok(undefined);
}
