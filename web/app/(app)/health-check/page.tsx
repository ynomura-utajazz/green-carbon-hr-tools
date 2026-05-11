import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import { DEMO_HEALTH_RECORDS, DEMO_LAW_COMPLIANCE } from "@/lib/demo/health-check";
import { HealthCheckClient } from "./health-check-client";

export const dynamic = "force-dynamic";

export default async function HealthCheckPage() {
  return (
    <HealthCheckClient
      records={DEMO_HEALTH_RECORDS}
      compliance={DEMO_LAW_COMPLIANCE}
      employees={DEMO_EMPLOYEES}
      departments={DEMO_DEPARTMENTS}
    />
  );
}
