import type { OnboardingStep } from "@/lib/onboarding/constants";

export function nextStepHref(steps: readonly OnboardingStep[], current: OnboardingStep) {
  const next = steps[steps.indexOf(current) + 1] ?? "done";
  return `/employee/onboarding/${next}`;
}

// Server clock snapshot (kept out of components so render stays pure).
export function serverNow() {
  return Date.now();
}
