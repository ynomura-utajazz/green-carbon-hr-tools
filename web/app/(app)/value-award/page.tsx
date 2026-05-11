import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_AWARDS } from "@/lib/demo/awards";
import { ValueAwardClient } from "./value-award-client";

export const dynamic = "force-dynamic";

export default async function ValueAwardPage() {
  return <ValueAwardClient awards={DEMO_AWARDS} employees={DEMO_EMPLOYEES} />;
}
