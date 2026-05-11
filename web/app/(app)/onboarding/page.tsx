import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import { DEMO_ONBOARDING_RUNS, DEMO_TEMPLATES } from "@/lib/demo/onboarding";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  return (
    <OnboardingClient
      runs={DEMO_ONBOARDING_RUNS}
      templates={DEMO_TEMPLATES}
      employees={DEMO_EMPLOYEES}
      departments={DEMO_DEPARTMENTS}
    />
  );
}
