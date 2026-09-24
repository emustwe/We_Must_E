import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SurveyRunner, type SurveyQuestion } from "@/components/onboarding/survey-runner";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { nextStepHref } from "@/lib/onboarding/nav";
import { getOnboardingState } from "@/lib/onboarding/state";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.survey");
  return { title: t("title") };
}

export default async function SurveyStep() {
  const state = await getOnboardingState();
  if (!state.survey) redirect(nextStepHref(state.steps, "basics"));
  const t = await getTranslations("onboarding.survey");
  const supabase = await createClient();

  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase
      .from("survey_questions")
      .select("id, type, prompt, options, required")
      .eq("survey_id", state.survey.id)
      .order("position"),
    state.surveyResponse
      ? supabase
          .from("survey_answers")
          .select("question_id, answer")
          .eq("response_id", state.surveyResponse.id)
      : Promise.resolve({ data: [] as { question_id: string; answer: unknown }[] }),
  ]);
  const list: SurveyQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: Array.isArray(q.options) ? q.options.map(String) : [],
    required: q.required,
  }));

  return (
    <WizardShell
      step="survey"
      state={state}
      title={t("title")}
      subtitle={t("subtitle", { count: list.length })}
    >
      <SurveyRunner
        started={Boolean(state.surveyResponse)}
        submitted={Boolean(state.surveyResponse?.submitted_at)}
        questions={list}
        initialAnswers={Object.fromEntries(
          (answers ?? []).map((a) => [a.question_id, a.answer as string | number | string[]]),
        )}
        nextHref={nextStepHref(state.steps, "survey")}
      />
    </WizardShell>
  );
}
