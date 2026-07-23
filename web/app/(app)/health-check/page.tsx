import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS, type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import {
  DEMO_HEALTH_RECORDS,
  DEMO_LAW_COMPLIANCE,
  type HealthRecord,
  type HealthResult,
  type LawComplianceItem,
} from "@/lib/demo/health-check";
import { HealthCheckClient } from "./health-check-client";

export const dynamic = "force-dynamic";

// health_checks.result は review_grade enum。想定リテラル(A/B/C/D)以外は null に丸める。
const HEALTH_RESULTS = new Set(["A", "B", "C", "D"]);

// select() で取得する health_checks 行の形（実スキーマに存在する列のみ）。
type HealthCheckRow = {
  employee_id: string;
  checked_at: string | null;
  result: string | null;
  followup_required: boolean | null;
  clinic: string | null;
  notes: string | null;
};

// health_checks 行 → HealthRecord にマップ。
// scheduled_at と followup_status は health_checks に対応列が無いため派生不能 → 既定値。
function mapHealthRow(row: HealthCheckRow): HealthRecord {
  const result = (row.result && HEALTH_RESULTS.has(row.result) ? row.result : null) as HealthResult;
  return {
    employee_id: row.employee_id,
    checked_at: row.checked_at ?? null,
    result,
    followup_required: row.followup_required ?? false,
    followup_status: "none",   // health_checks に予約/フォロー状態の列が無いため既定値
    scheduled_at: null,        // health_checks に予約日の列が無いため未取得
    clinic: row.clinic ?? null,
    notes: row.notes ?? undefined,
  };
}

export default async function HealthCheckPage() {
  let records: HealthRecord[];
  let compliance: LawComplianceItem[];
  let employees: DemoEmployee[];
  let departments: DemoDept[];

  if (isDemoMode()) {
    records = DEMO_HEALTH_RECORDS;
    compliance = DEMO_LAW_COMPLIANCE;
    employees = DEMO_EMPLOYEES;
    departments = DEMO_DEPARTMENTS;
  } else {
    const supabase = await createClient();
    const [checksRes, empsRes, deptsRes] = await Promise.all([
      supabase
        .from("health_checks")
        .select("employee_id, checked_at, result, followup_required, clinic, notes, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("employee_code"),
      supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
    ]);
    if (checksRes.error) console.error("[health-check] health_checks query failed:", checksRes.error.message);
    if (empsRes.error) console.error("[health-check] employees query failed:", empsRes.error.message);
    if (deptsRes.error) console.error("[health-check] departments query failed:", deptsRes.error.message);

    records = ((checksRes.data ?? []) as HealthCheckRow[]).map(mapHealthRow);
    employees = (empsRes.data ?? []) as DemoEmployee[];
    departments = (deptsRes.data ?? []) as DemoDept[];

    // LawComplianceItem[] は労安法チェックの静的雛形で、テーブルにも lib/demo の
    // 集計ヘルパーにも実データ算出手段が無い。算出不能のため既存の静的雛形を流用する（needs_review）。
    compliance = DEMO_LAW_COMPLIANCE;
  }

  return (
    <HealthCheckClient
      records={records}
      compliance={compliance}
      employees={employees}
      departments={departments}
    />
  );
}
