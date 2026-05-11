import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_REPORTS } from "@/lib/demo/voice-box";
import { VoiceBoxClient } from "./voice-box-client";

export const dynamic = "force-dynamic";

export default async function VoiceBoxPage() {
  return <VoiceBoxClient reports={DEMO_REPORTS} employees={DEMO_EMPLOYEES} />;
}
