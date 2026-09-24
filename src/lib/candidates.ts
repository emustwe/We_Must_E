import "server-only";
import { notFound } from "next/navigation";
import { getEmployerAccount } from "@/lib/auth/employer";
import { logError } from "@/lib/log";
import { getIpHash } from "@/lib/security/ip";
import { createClient } from "@/lib/supabase/server";

// Everything an employer may see about one job seeker, read with the
// employer's own session: RLS decides each section (admin grant scopes, or the
// job seeker's request to one of this employer's jobs). Opening the page is
// recorded in the audit log.
export async function loadCandidate(employeeId: string) {
  const { profile, employer } = await getEmployerAccount();
  if (employer?.status !== "approved") notFound();
  const supabase = await createClient();

  const { data: base } = await supabase
    .from("employee_profiles")
    .select("user_id, headline, city_emirate, languages, skills, availability, expected_pay_range")
    .eq("user_id", employeeId)
    .maybeSingle();
  // No `profile` access at all: behave as if the person doesn't exist.
  if (!base) notFound();

  const { error: logErrorResult } = await supabase.rpc("log_candidate_access", {
    p_employee_id: employeeId,
    p_scope: "profile",
    p_ip_hash: await getIpHash(),
  });
  if (logErrorResult) logError("log-candidate-access", logErrorResult);

  const [person, contact, attempt, videos, cv, responses, applications, meetings] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", employeeId).maybeSingle(),
      supabase
        .from("employee_contacts")
        .select("phone, email, whatsapp")
        .eq("user_id", employeeId)
        .maybeSingle(),
      supabase
        .from("test_attempts")
        .select("score, submitted_at, tests(title, pass_score)")
        .eq("employee_id", employeeId)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("video_resumes")
        .select("id, duration_seconds, video_prompts(prompt)")
        .eq("employee_id", employeeId),
      supabase
        .from("cv_documents")
        .select("id, mime_type, size_bytes")
        .eq("employee_id", employeeId)
        .maybeSingle(),
      supabase
        .from("survey_responses")
        .select("id, survey_answers(answer, survey_questions(prompt, position))")
        .eq("employee_id", employeeId)
        .not("submitted_at", "is", null),
      supabase
        .from("job_applications")
        .select("id, status, jobs(title)")
        .eq("employee_id", employeeId)
        .eq("employer_id", profile.id),
      supabase
        .from("meeting_requests")
        .select("id, status, proposed_slots, chosen_slot, meeting_link, created_at")
        .eq("employee_id", employeeId)
        .eq("employer_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);

  return {
    id: employeeId,
    profile: base,
    name: person.data?.full_name ?? null,
    contact: contact.data,
    test: attempt.data,
    videos: videos.data ?? [],
    cv: cv.data,
    survey: (responses.data ?? []).flatMap((r) =>
      [...r.survey_answers]
        .sort((a, b) => (a.survey_questions?.position ?? 0) - (b.survey_questions?.position ?? 0))
        .map((a) => ({ prompt: a.survey_questions?.prompt ?? "", answer: a.answer })),
    ),
    applications: applications.data ?? [],
    meetings: meetings.data ?? [],
  };
}
