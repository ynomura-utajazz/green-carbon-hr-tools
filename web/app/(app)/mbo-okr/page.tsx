import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import { DEMO_OBJECTIVES, DEMO_CYCLES, DEMO_MBO_REVIEWS } from "@/lib/demo/okr";
import { DEMO_CURRENT_EMPLOYEE_ID } from "@/lib/demo/mock-data";
import { MboOkrClient } from "./mbo-okr-client";

export const dynamic = "force-dynamic";

export default async function MboOkrPage() {
  return (
    <MboOkrClient
      objectives={DEMO_OBJECTIVES}
      cycles={DEMO_CYCLES}
      reviews={DEMO_MBO_REVIEWS}
      employees={DEMO_EMPLOYEES}
      departments={DEMO_DEPARTMENTS}
      currentEmployeeId={DEMO_CURRENT_EMPLOYEE_ID}
    />
  );
}
