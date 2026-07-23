import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMPLOYEES, type DemoEmployee } from "@/lib/demo/employees";
import {
  OffboardingClient,
  type OffboardingRow,
  type CompletedExitRow,
} from "./offboarding-client";

export const dynamic = "force-dynamic";

// デモデータ（従来 page.tsx にハードコードされていたもの。デモ表示を不変に保つため保持）
const DEMO_OFFBOARDINGS: OffboardingRow[] = [
  { id: "ob-1", employee_id: "e15", last_day: "2026-06-30", reason: "キャリアアップ転職", handover_pct: 65, exit_done: false, alumni_consent: true },
  { id: "ob-2", employee_id: "e6",  last_day: "2026-07-15", reason: "起業", handover_pct: 30, exit_done: false, alumni_consent: true },
];
const DEMO_COMPLETED_EXITS: CompletedExitRow[] = [
  { id: "obc-1", employee_id_name: "John Wilson",   last_day: "2025-09-30", reason: "プロジェクト終了", alumni_active: true },
  { id: "obc-2", employee_id_name: "Carlos Mendez", last_day: "2025-12-15", reason: "他社オファー",    alumni_active: false },
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// handover_status(jsonb) から引継率(0-100)を算出。
// DB 上の形状は未確定のため防御的に扱う（throw / undefined 索引を避ける）:
//  - 明示的な pct/percent/progress 数値があればそれを採用
//  - タスク→状態のオブジェクトなら done 比率を算出（true/"done"/"completed"/"complete"）
//  - 空 or 未知は 0
function computeHandoverPct(hs: unknown): number {
  if (!hs || typeof hs !== "object") return 0;
  const obj = hs as Record<string, unknown>;
  for (const k of ["pct", "percent", "progress"]) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.min(100, Math.round(v)));
  }
  const vals = Object.values(obj);
  if (vals.length === 0) return 0;
  const done = vals.filter(
    (v) => v === true || v === "done" || v === "completed" || v === "complete",
  ).length;
  return Math.round((done / vals.length) * 100);
}

export default async function OffboardingPage() {
  if (isDemoMode()) {
    return (
      <OffboardingClient
        offboardings={DEMO_OFFBOARDINGS}
        completedExits={DEMO_COMPLETED_EXITS}
        employees={DEMO_EMPLOYEES}
        thisMonthCount={1}
      />
    );
  }

  // 本番: offboarding_runs を取得し、in-progress / completed に振り分ける。
  // 判定シグナル: last_working_day が過去 → 退職完了、null もしくは今日以降 → 進行中。
  const supabase = await createClient();
  const runsRes = await supabase
    .from("offboarding_runs")
    .select("id, employee_id, resignation_announced_at, last_working_day, reason, handover_status, exit_interview_completed, alumni_consent")
    .order("last_working_day", { ascending: false });
  if (runsRes.error) console.error("[offboarding] offboarding_runs query failed:", runsRes.error.message);
  const runs = runsRes.data ?? [];

  // 退職者は status='resigned' になり得るため active フィルタは掛けず、
  // offboarding_runs が参照する employee のみ id 指定で解決する（列は directory 準拠）。
  const employeeIds = [...new Set(runs.map((r) => r.employee_id as string))];
  let employees: DemoEmployee[] = [];
  if (employeeIds.length > 0) {
    const empsRes = await supabase
      .from("employees")
      .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
      .in("id", employeeIds)
      .is("deleted_at", null);
    if (empsRes.error) console.error("[offboarding] employees query failed:", empsRes.error.message);
    employees = (empsRes.data ?? []) as DemoEmployee[];
  }
  const empName = new Map(employees.map((e) => [e.id, e.full_name]));

  const now = new Date();
  const todayStr = ymd(now);
  const curYM = todayStr.slice(0, 7);

  const offboardings: OffboardingRow[] = [];
  const completedExits: CompletedExitRow[] = [];
  let thisMonthCount = 0;

  for (const r of runs) {
    const lastDay = (r.last_working_day as string | null) ?? null;
    const reason = ((r.reason as string | null) ?? "").trim();
    const alumniConsent = Boolean(r.alumni_consent);
    if (lastDay && lastDay.slice(0, 7) === curYM) thisMonthCount++;

    const isCompleted = lastDay != null && lastDay < todayStr;
    if (isCompleted) {
      completedExits.push({
        id: r.id as string,
        employee_id_name: empName.get(r.employee_id as string) ?? "（退職者）",
        last_day: lastDay,
        reason,
        alumni_active: alumniConsent,
      });
    } else {
      offboardings.push({
        id: r.id as string,
        employee_id: r.employee_id as string,
        last_day: lastDay ?? "",
        reason,
        handover_pct: computeHandoverPct(r.handover_status),
        exit_done: Boolean(r.exit_interview_completed),
        alumni_consent: alumniConsent,
      });
    }
  }

  return (
    <OffboardingClient
      offboardings={offboardings}
      completedExits={completedExits}
      employees={employees}
      thisMonthCount={thisMonthCount}
    />
  );
}
