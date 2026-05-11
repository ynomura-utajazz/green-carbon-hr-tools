import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import { DEMO_RETENTION } from "@/lib/demo/retention";
import { RetentionClient } from "./retention-client";

export const dynamic = "force-dynamic";

export default async function RetentionPage() {
  return (
    <RetentionClient
      records={DEMO_RETENTION}
      employees={DEMO_EMPLOYEES}
      departments={DEMO_DEPARTMENTS}
    />
  );
}
