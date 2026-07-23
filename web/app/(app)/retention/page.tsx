import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS, type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import { DEMO_RETENTION, type RetentionRecord, type RiskLevel, type RiskFactors } from "@/lib/demo/retention";
import { RetentionClient } from "./retention-client";

export const dynamic = "force-dynamic";

// retention_scores の実カラムのみを反映した行の型。
type RetentionScoreRow = {
  employee_id: string;
  computed_at: string | null;
  score: number | string | null;
  level: string | null;
  factors: RiskFactors | null;
  recommendation: string | null;
};

// factors jsonb が欠損 or 形状不一致のときのフォールバック。
const EMPTY_FACTORS: RiskFactors = {
  satisfaction: 0,
  manager_relation: 0,
  compensation_gap: 0,
  career_growth: 0,
  workload: 0,
  tenure: 0,
};

// DB 行 → demo の RetentionRecord へマップ。
// trend_30d / signals は retention_scores に列が無いため既定値（偽データは作らない）。
// recommended_actions は単一 text の recommendation を配列にラップ。
function mapRowToRecord(row: RetentionScoreRow): RetentionRecord {
  return {
    employee_id: row.employee_id,
    score: Number(row.score ?? 0),
    level: (row.level ?? "low") as RiskLevel,
    factors: (row.factors ?? EMPTY_FACTORS) as RiskFactors,
    trend_30d: 0,
    signals: [],
    last_evaluated_at: row.computed_at ?? new Date().toISOString().slice(0, 10),
    recommended_actions: row.recommendation ? [row.recommendation] : [],
  };
}

export default async function RetentionPage() {
  let records: RetentionRecord[];
  let employees: DemoEmployee[];
  let departments: DemoDept[];

  if (isDemoMode()) {
    records = DEMO_RETENTION;
    employees = DEMO_EMPLOYEES;
    departments = DEMO_DEPARTMENTS;
  } else {
    const supabase = await createClient();
    const [recRes, empsRes, deptsRes] = await Promise.all([
      supabase
        .from("retention_scores")
        .select("employee_id, computed_at, score, level, factors, recommendation")
        .order("computed_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("employee_code"),
      supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
    ]);
    if (recRes.error) console.error("[retention] retention_scores query failed:", recRes.error.message);
    if (empsRes.error) console.error("[retention] employees query failed:", empsRes.error.message);
    if (deptsRes.error) console.error("[retention] departments query failed:", deptsRes.error.message);

    // computed_at 降順で取得済み。retention_scores は日次時系列の可能性があるため、
    // 社員ごとに最新1件のみ採用し、demo と同様にスコア降順で表示。
    const seen = new Set<string>();
    const latest: RetentionRecord[] = [];
    for (const row of (recRes.data ?? []) as RetentionScoreRow[]) {
      if (!row.employee_id || seen.has(row.employee_id)) continue;
      seen.add(row.employee_id);
      latest.push(mapRowToRecord(row));
    }
    records = latest.sort((a, b) => b.score - a.score);
    employees = (empsRes.data ?? []) as DemoEmployee[];
    departments = (deptsRes.data ?? []) as DemoDept[];
  }

  return (
    <RetentionClient records={records} employees={employees} departments={departments} />
  );
}
