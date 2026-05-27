import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_DEPARTMENTS, DEMO_EMPLOYEES, type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import { OrgChartClient } from "./orgchart-client";

export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  let employees: DemoEmployee[];
  let departments: DemoDept[];

  if (isDemoMode()) {
    employees = DEMO_EMPLOYEES;
    departments = DEMO_DEPARTMENTS;
  } else {
    const supabase = await createClient();
    // RLS バイパス（hr_admin 未連携テスター対応）
    const admin = createServiceClient();
    const reader = admin ?? supabase;
    const [{ data: emps }, { data: depts }] = await Promise.all([
      reader
        .from("employees")
        .select("id, employee_code, full_name, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national")
        .eq("status", "active").is("deleted_at", null),
      reader.from("departments").select("id, name, parent_id, display_order").order("display_order"),
    ]);
    employees = (emps ?? []) as DemoEmployee[];
    departments = (depts ?? []) as DemoDept[];
  }

  return <OrgChartClient employees={employees} departments={departments} />;
}
