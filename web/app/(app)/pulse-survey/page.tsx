import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import {
  DEMO_CAMPAIGNS, DEMO_ACTION_PLANS, PULSE_TREND,
} from "@/lib/demo/surveys";
import { PulseSurveyClient } from "./pulse-survey-client";

export const dynamic = "force-dynamic";

export default async function PulseSurveyPage() {
  return (
    <PulseSurveyClient
      campaigns={DEMO_CAMPAIGNS}
      actionPlans={DEMO_ACTION_PLANS}
      employees={DEMO_EMPLOYEES}
      departments={DEMO_DEPARTMENTS}
      trend={PULSE_TREND}
    />
  );
}
