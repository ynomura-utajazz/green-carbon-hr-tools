import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS, type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import {
  AttendanceClient,
  type LeaveRow, type OvertimeRow, type LeaveTakingRow, type LeaveStatus,
} from "./attendance-client";

export const dynamic = "force-dynamic";

// デモデータ（従来 page.tsx にハードコードされていたもの。デモ表示を不変に保つため保持）
const DEMO_LEAVES: LeaveRow[] = [
  { id: "lr-1", employee_id: "e23", kind: "annual", days: 3, starts: "2026-05-22", ends: "2026-05-24", status: "pending", reason: "私用" },
  { id: "lr-2", employee_id: "e9",  kind: "annual", days: 2, starts: "2026-05-15", ends: "2026-05-16", status: "pending", reason: "通院" },
  { id: "lr-3", employee_id: "e15", kind: "summer", days: 5, starts: "2026-08-12", ends: "2026-08-16", status: "pending", reason: "夏季休暇" },
  { id: "lr-4", employee_id: "e10", kind: "annual", days: 1, starts: "2026-05-09", ends: "2026-05-09", status: "approved", reason: "私用" },
  { id: "lr-5", employee_id: "e18", kind: "sick",   days: 2, starts: "2026-05-04", ends: "2026-05-05", status: "approved", reason: "体調不良" },
];
const DEMO_OVERTIME: OvertimeRow[] = [
  { employee_id: "e23", overtime_h: 87, status: "danger" },
  { employee_id: "e10", overtime_h: 72, status: "warning" },
  { employee_id: "e9",  overtime_h: 68, status: "warning" },
  { employee_id: "e8",  overtime_h: 58, status: "watch" },
  { employee_id: "e16", overtime_h: 52, status: "watch" },
];
const DEMO_LEAVE_TAKING: LeaveTakingRow[] = [
  { dept_id: "d-corp", rate: 85 }, { dept_id: "d-hr", rate: 78 }, { dept_id: "d-design", rate: 76 },
  { dept_id: "d-fin", rate: 72 }, { dept_id: "d-product", rate: 68 }, { dept_id: "d-bizdev", rate: 65 },
  { dept_id: "d-eng", rate: 60 }, { dept_id: "d-mkt", rate: 52 }, { dept_id: "d-global", rate: 70 },
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AttendancePage() {
  if (isDemoMode()) {
    return (
      <AttendanceClient
        leaves={DEMO_LEAVES}
        overtime={DEMO_OVERTIME}
        leaveTaking={DEMO_LEAVE_TAKING}
        employees={DEMO_EMPLOYEES}
        departments={DEMO_DEPARTMENTS}
        todayPresent={28}
        todayTotal={30}
      />
    );
  }

  // 本番: 実テーブルから取得。
  const supabase = await createClient();
  const now = new Date();
  const todayStr = ymd(now);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [leaveRes, otRes, todayRes, empsRes, deptsRes] = await Promise.all([
    supabase
      .from("leave_requests")
      .select("id, employee_id, kind, starts_on, ends_on, days, reason, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("attendance_records")
      .select("employee_id, overtime_minutes")
      .gte("work_date", monthStart),
    supabase
      .from("attendance_records")
      .select("employee_id")
      .eq("work_date", todayStr)
      .not("clock_in", "is", null),
    supabase
      .from("employees")
      .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("employee_code"),
    supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
  ]);
  if (leaveRes.error) console.error("[attendance] leave_requests query failed:", leaveRes.error.message);
  if (otRes.error) console.error("[attendance] attendance_records(overtime) query failed:", otRes.error.message);
  if (todayRes.error) console.error("[attendance] attendance_records(today) query failed:", todayRes.error.message);
  if (empsRes.error) console.error("[attendance] employees query failed:", empsRes.error.message);
  if (deptsRes.error) console.error("[attendance] departments query failed:", deptsRes.error.message);

  const leaves: LeaveRow[] = (leaveRes.data ?? []).map((r) => ({
    id: r.id as string,
    employee_id: r.employee_id as string,
    kind: r.kind as string,
    days: Number(r.days),
    starts: r.starts_on as string,
    ends: r.ends_on as string,
    status: r.status as LeaveStatus,
    reason: (r.reason as string | null) ?? null,
  }));

  // 残業: employee 別に overtime_minutes を今月分合計→時間換算→上位5→閾値で status。
  const otMap = new Map<string, number>();
  for (const r of otRes.data ?? []) {
    const id = r.employee_id as string;
    otMap.set(id, (otMap.get(id) ?? 0) + (Number(r.overtime_minutes) || 0));
  }
  const overtime: OvertimeRow[] = [...otMap.entries()]
    .map(([employee_id, minutes]) => ({ employee_id, overtime_h: Math.round(minutes / 60) }))
    .filter((o) => o.overtime_h > 0)
    .sort((a, b) => b.overtime_h - a.overtime_h)
    .slice(0, 5)
    .map((o) => ({
      ...o,
      status: (o.overtime_h >= 80 ? "danger" : o.overtime_h >= 60 ? "warning" : "watch") as OvertimeRow["status"],
    }));

  const todayPresent = new Set((todayRes.data ?? []).map((r) => r.employee_id as string)).size;
  const employees = (empsRes.data ?? []) as DemoEmployee[];
  const departments = (deptsRes.data ?? []) as DemoDept[];

  // 部署別 有給取得率は「付与日数マスタ」が本番スキーマに無く率(分母)を算出できないため空配列。
  // クライアントは空状態を表示する（偽の取得率は出さない）。専用テーブル整備後に実装可能。
  const leaveTaking: LeaveTakingRow[] = [];

  return (
    <AttendanceClient
      leaves={leaves}
      overtime={overtime}
      leaveTaking={leaveTaking}
      employees={employees}
      departments={departments}
      todayPresent={todayPresent}
      todayTotal={employees.length}
    />
  );
}
