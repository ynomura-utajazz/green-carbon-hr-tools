/**
 * /org-management
 *
 * 異動辞令の発行・履歴管理 + 組織変更計画。
 * 実 DB の transfers テーブルから取得。
 */

import { createClient } from "@/lib/supabase/server";
import { OrgManagementClient, type TransferRow, type EmployeeOption, type DeptOption } from "./org-management-client";

export const dynamic = "force-dynamic";

export default async function OrgManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        ログインしてください。
      </div>
    );
  }

  const [transfersRes, empsRes, deptsRes] = await Promise.all([
    supabase
      .from("transfers")
      .select("id, employee_id, transfer_type, effective_date, is_applied, from_department_id, from_manager_id, from_job_title, from_job_grade, to_department_id, to_manager_id, to_job_title, to_job_grade, reason, created_at")
      .order("effective_date", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name, department_id, manager_id, job_title, job_grade")
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),
    supabase
      .from("departments")
      .select("id, name")
      .order("display_order", { ascending: true }),
  ]);
  if (transfersRes.error) console.error("[org-management] transfers query failed:", transfersRes.error.message);
  if (empsRes.error) console.error("[org-management] employees query failed:", empsRes.error.message);
  if (deptsRes.error) console.error("[org-management] departments query failed:", deptsRes.error.message);
  const transfers = transfersRes.data;
  const emps = empsRes.data;
  const depts = deptsRes.data;

  const transferRows: TransferRow[] = (transfers ?? []).map((t) => ({
    id: t.id as string,
    employee_id: t.employee_id as string,
    transfer_type: t.transfer_type as TransferRow["transfer_type"],
    effective_date: t.effective_date as string,
    is_applied: (t.is_applied as boolean) ?? false,
    from_department_id: (t.from_department_id as string | null) ?? null,
    from_manager_id: (t.from_manager_id as string | null) ?? null,
    from_job_title: (t.from_job_title as string | null) ?? null,
    from_job_grade: (t.from_job_grade as string | null) ?? null,
    to_department_id: (t.to_department_id as string | null) ?? null,
    to_manager_id: (t.to_manager_id as string | null) ?? null,
    to_job_title: (t.to_job_title as string | null) ?? null,
    to_job_grade: (t.to_job_grade as string | null) ?? null,
    reason: (t.reason as string | null) ?? null,
  }));

  const employees: EmployeeOption[] = (emps ?? []).map((e) => ({
    id: e.id as string,
    full_name: (e.full_name as string) ?? "",
    department_id: (e.department_id as string | null) ?? null,
    manager_id: (e.manager_id as string | null) ?? null,
    job_title: (e.job_title as string | null) ?? null,
    job_grade: (e.job_grade as string | null) ?? null,
  }));

  const departments: DeptOption[] = (depts ?? []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
  }));

  return <OrgManagementClient
    initialTransfers={transferRows}
    employees={employees}
    departments={departments}
  />;
}
