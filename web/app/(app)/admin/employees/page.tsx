/**
 * /admin/employees
 *
 * HR 管理者用の社員 CRUD ページ（Phase B）。
 *
 * - 一覧表示（検索・部署フィルタ）
 * - 「社員を追加」モーダル
 * - 各行に編集・削除ボタン（部下持ちは削除不可）
 *
 * 認可：認証済み + service role（hr_admin RLS は Phase B.2 で有効化）
 */

import { createClient } from "@/lib/supabase/server";
import { EmployeesClient, type EmployeeRow, type DeptOption } from "./employees-client";

export const dynamic = "force-dynamic";

export default async function EmployeesAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        ログインしてください。
      </div>
    );
  }

  const [{ data: emps }, { data: depts }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, employee_code, email, full_name, full_name_kana, preferred_name, display_name_en, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, resign_date, nationality")
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),
    supabase
      .from("departments")
      .select("id, name, parent_id")
      .order("display_order", { ascending: true }),
  ]);

  const employees: EmployeeRow[] = (emps ?? []).map((e) => ({
    id: e.id as string,
    employee_code: (e.employee_code as string) ?? "",
    email: (e.email as string) ?? "",
    full_name: (e.full_name as string) ?? "",
    full_name_kana: (e.full_name_kana as string | null) ?? null,
    preferred_name: (e.preferred_name as string | null) ?? null,
    display_name_en: (e.display_name_en as string | null) ?? null,
    department_id: (e.department_id as string | null) ?? null,
    manager_id: (e.manager_id as string | null) ?? null,
    job_title: (e.job_title as string | null) ?? null,
    job_grade: (e.job_grade as string | null) ?? null,
    employment_type: (e.employment_type as EmployeeRow["employment_type"]) ?? "full_time",
    status: (e.status as EmployeeRow["status"]) ?? "active",
    hire_date: (e.hire_date as string | null) ?? null,
    resign_date: (e.resign_date as string | null) ?? null,
    nationality: (e.nationality as string | null) ?? null,
  }));

  const departments: DeptOption[] = (depts ?? []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    parent_id: (d.parent_id as string | null) ?? null,
  }));

  return <EmployeesClient initialEmployees={employees} departments={departments} />;
}
