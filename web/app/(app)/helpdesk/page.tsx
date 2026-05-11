import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_TICKETS, DEMO_FAQS } from "@/lib/demo/helpdesk";
import { DEMO_CURRENT_EMPLOYEE_ID } from "@/lib/demo/mock-data";
import { HelpdeskClient } from "./helpdesk-client";

export const dynamic = "force-dynamic";

export default async function HelpdeskPage() {
  return (
    <HelpdeskClient
      tickets={DEMO_TICKETS}
      faqs={DEMO_FAQS}
      employees={DEMO_EMPLOYEES}
      currentEmployeeId={DEMO_CURRENT_EMPLOYEE_ID}
    />
  );
}
