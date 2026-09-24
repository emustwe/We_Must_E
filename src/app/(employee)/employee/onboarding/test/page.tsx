import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TestRunner, type TestQuestion } from "@/components/onboarding/test-runner";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { nextStepHref, serverNow } from "@/lib/onboarding/nav";
import { getOnboardingState } from "@/lib/onboarding/state";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.test");
  return { title: t("title") };
}

export default async function TestStep() {
  const state = await getOnboardingState();
  if (!state.test) redirect(nextStepHref(state.steps, "survey"));
  const t = await getTranslations("onboarding.test");
  const supabase = await createClient();
  const attempt = state.testAttempt;

  // Questions are only readable after the attempt starts (RLS) and correct
  // answers never leave the database; the intro only needs the count.
  const [{ data: questionCount }, questions, answers] = await Promise.all([
    supabase.rpc("test_question_count", { p_test_id: state.test.id }),
    attempt && !attempt.submitted_at
      ? supabase
          .from("test_questions")
          .select("id, prompt, options")
          .eq("test_id", state.test.id)
          .order("position")
      : Promise.resolve({ data: [] }),
    attempt
      ? supabase.from("test_attempts").select("answers").eq("id", attempt.id).single()
      : Promise.resolve({ data: null }),
  ]);
  const list: TestQuestion[] = (questions.data ?? []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: Array.isArray(q.options) ? q.options.map(String) : [],
  }));
  const deadline = attempt
    ? new Date(attempt.started_at).getTime() + state.test.time_limit_seconds * 1000
    : null;

  return (
    <WizardShell
      step="test"
      state={state}
      title={state.test.title}
      subtitle={t("subtitle", {
        count: questionCount ?? 0,
        minutes: Math.ceil(state.test.time_limit_seconds / 60),
      })}
    >
      <TestRunner
        attempt={
          attempt
            ? {
                id: attempt.id,
                submitted: Boolean(attempt.submitted_at),
                answers: (answers.data?.answers ?? {}) as Record<string, number>,
              }
            : null
        }
        questions={list}
        deadline={deadline}
        serverNow={serverNow()}
        nextHref={nextStepHref(state.steps, "test")}
      />
    </WizardShell>
  );
}
