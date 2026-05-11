import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_POSITIONS, DEMO_CANDIDATES, DEMO_INTERVIEWS } from "@/lib/demo/recruiting";
import { RecruitingClient } from "./recruiting-client";

export const dynamic = "force-dynamic";

export default async function RecruitingPage() {
  return (
    <RecruitingClient
      positions={DEMO_POSITIONS}
      candidates={DEMO_CANDIDATES}
      interviews={DEMO_INTERVIEWS}
      employees={DEMO_EMPLOYEES}
    />
  );
}
