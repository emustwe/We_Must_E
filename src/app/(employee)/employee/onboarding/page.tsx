import { redirect } from "next/navigation";
import { getOnboardingState } from "@/lib/onboarding/state";

// Resume where the employee left off.
export default async function OnboardingIndex() {
  const state = await getOnboardingState();
  redirect(`/employee/onboarding/${state.next}`);
}
