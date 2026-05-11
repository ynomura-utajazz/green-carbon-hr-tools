import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_CONTRACTORS } from "@/lib/demo/contractors";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { ContractorsClient } from "./contractors-client";

export const dynamic = "force-dynamic";

export default async function ContractorsPage() {
  // 本番では Supabase から fetch する想定
  const contractors = isDemoMode() ? DEMO_CONTRACTORS : DEMO_CONTRACTORS;
  const employees = DEMO_EMPLOYEES;
  return <ContractorsClient contractors={contractors} employees={employees} />;
}
