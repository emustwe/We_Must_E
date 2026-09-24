import "server-only";
import { cache } from "react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingStep } from "@/lib/onboarding/constants";

// Everything the wizard needs, read with the employee's own session (RLS).
export const getOnboardingState = cache(async () => {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const [employee, contact, survey, test, prompts, videos, cv, consent] = await Promise.all([
    supabase
      .from("employee_profiles")
      .select(
        "headline, city_emirate, languages, skills, availability, expected_pay_range, status, onboarding_step",
      )
      .eq("user_id", profile.id)
      .single(),
    supabase.from("employee_contacts").select("phone, whatsapp").eq("user_id", profile.id).single(),
    supabase.from("surveys").select("id, title").eq("is_active", true).maybeSingle(),
    supabase
      .from("tests")
      .select("id, title, time_limit_seconds, pass_score")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("video_prompts")
      .select("id, prompt, max_seconds, position")
      .eq("is_active", true)
      .order("position"),
    supabase
      .from("video_resumes")
      .select("id, prompt_id, storage_path, status, duration_seconds")
      .eq("employee_id", profile.id),
    supabase
      .from("cv_documents")
      .select("id, storage_path, mime_type, size_bytes")
      .eq("employee_id", profile.id)
      .maybeSingle(),
    supabase
      .from("consents")
      .select("id")
      .eq("user_id", profile.id)
      .eq("type", "data_sharing")
      .limit(1),
  ]);

  const [surveyResponse, testAttempt] = await Promise.all([
    survey.data
      ? supabase
          .from("survey_responses")
          .select("id, submitted_at")
          .eq("survey_id", survey.data.id)
          .eq("employee_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    test.data
      ? supabase
          .from("test_attempts")
          .select("id, started_at, submitted_at")
          .eq("test_id", test.data.id)
          .eq("employee_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const e = employee.data;
  const activePrompts = prompts.data ?? [];
  const recorded = new Set((videos.data ?? []).map((v) => v.prompt_id));

  const done = {
    basics: Boolean(
      e?.city_emirate &&
      e.languages.length &&
      e.availability.length &&
      e.headline &&
      contact.data?.phone,
    ),
    survey: !survey.data || Boolean(surveyResponse.data?.submitted_at),
    test: !test.data || Boolean(testAttempt.data?.submitted_at),
    video: activePrompts.every((p) => recorded.has(p.id)),
    cv: true, // optional
  };

  const steps: OnboardingStep[] = ["basics"];
  if (survey.data) steps.push("survey");
  if (test.data) steps.push("test");
  if (activePrompts.length) steps.push("video");
  steps.push("cv", "done");

  const submitted = e?.status === "submitted" || e?.status === "approved";
  const next: OnboardingStep = submitted
    ? "done"
    : (steps.find((s) => s !== "done" && s !== "cv" && !done[s]) ?? "cv");

  return {
    profile,
    employee: e,
    contact: contact.data,
    survey: survey.data,
    surveyResponse: surveyResponse.data,
    test: test.data,
    testAttempt: testAttempt.data,
    prompts: activePrompts,
    videos: videos.data ?? [],
    cv: cv.data,
    hasDataSharingConsent: Boolean(consent.data?.length),
    done,
    steps,
    next,
    submitted,
    allRequiredDone: done.basics && done.survey && done.test && done.video,
  };
});

export type OnboardingState = Awaited<ReturnType<typeof getOnboardingState>>;
