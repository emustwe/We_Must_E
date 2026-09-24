import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { VideoStep, type PromptWithVideo } from "@/components/onboarding/video-step";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { nextStepHref } from "@/lib/onboarding/nav";
import { getOnboardingState } from "@/lib/onboarding/state";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.video");
  return { title: t("title") };
}

export default async function VideoStepPage() {
  const state = await getOnboardingState();
  if (!state.prompts.length) redirect(nextStepHref(state.steps, "test"));
  const t = await getTranslations("onboarding.video");
  const supabase = await createClient();

  // Short-lived signed URLs so the employee can watch their own answers.
  const paths = state.videos.map((v) => v.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("video-resumes").createSignedUrls(paths, 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const prompts: PromptWithVideo[] = state.prompts.map((p) => {
    const video = state.videos.find((v) => v.prompt_id === p.id);
    return {
      id: p.id,
      prompt: p.prompt,
      maxSeconds: p.max_seconds,
      video: video ? { id: video.id, url: urlByPath.get(video.storage_path) ?? null } : null,
    };
  });

  return (
    <WizardShell step="video" state={state} title={t("title")} subtitle={t("subtitle")}>
      <VideoStep
        userId={state.profile.id}
        prompts={prompts}
        nextHref={nextStepHref(state.steps, "video")}
      />
    </WizardShell>
  );
}
