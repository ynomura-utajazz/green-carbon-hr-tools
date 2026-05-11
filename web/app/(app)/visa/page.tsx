import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_VISA_RECORDS } from "@/lib/demo/visa";
import { VisaClient } from "./visa-client";

export const dynamic = "force-dynamic";

export default async function VisaPage() {
  return <VisaClient records={DEMO_VISA_RECORDS} employees={DEMO_EMPLOYEES} />;
}
