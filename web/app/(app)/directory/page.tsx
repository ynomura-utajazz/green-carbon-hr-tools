import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_DEPARTMENTS, DEMO_EMPLOYEES, type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import { DirectoryClient } from "./directory-client";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  let employees: DemoEmployee[];
  let departments: DemoDept[];

  if (isDemoMode()) {
    employees = DEMO_EMPLOYEES;
    departments = DEMO_DEPARTMENTS;
  } else {
    const supabase = await createClient();
    const [empsRes, deptsRes] = await Promise.all([
      supabase
        .from("employees")
        .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("employee_code"),
      supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
    ]);
    if (empsRes.error) console.error("[directory] employees query failed:", empsRes.error.message);
    if (deptsRes.error) console.error("[directory] departments query failed:", deptsRes.error.message);
    employees = (empsRes.data ?? []) as DemoEmployee[];
    departments = (deptsRes.data ?? []) as DemoDept[];
  }

  return (
    <Suspense fallback={null}>
      <DirectoryClient employees={employees} departments={departments} />
    </Suspense>
  );
}
