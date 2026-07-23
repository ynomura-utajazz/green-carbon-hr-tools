import { isDemoMode } from "@/lib/demo/mock-data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS, type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import {
  DEMO_ONBOARDING_RUNS, DEMO_TEMPLATES,
  PHASE_ORDER, OWNER_LABEL,
  type OnboardingRun, type OnboardingTemplate, type TaskState, type TaskTemplate,
  type OnboardingPhase, type TaskOwner,
} from "@/lib/demo/onboarding";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

// ── 未知の enum/jsonb 値を安全側に丸めるための集合と coercer ──────────
const KNOWN_PHASES = new Set<string>(PHASE_ORDER);
const KNOWN_OWNERS = new Set<string>(Object.keys(OWNER_LABEL));
const KNOWN_TASK_STATUS = new Set<TaskState["status"]>(["pending", "in_progress", "done", "blocked", "skipped"]);

function coercePhase(v: unknown): OnboardingPhase {
  return KNOWN_PHASES.has(v as string) ? (v as OnboardingPhase) : "day_1";
}
function coerceOwner(v: unknown): TaskOwner {
  return KNOWN_OWNERS.has(v as string) ? (v as TaskOwner) : "hr";
}
function coerceTaskStatus(v: unknown): TaskState["status"] {
  return KNOWN_TASK_STATUS.has(v as TaskState["status"]) ? (v as TaskState["status"]) : "pending";
}
// onboarding_runs.status(text, 既定 'in_progress') → demo の "active"|"completed"|"paused"
function coerceRunStatus(v: unknown): OnboardingRun["status"] {
  if (v === "completed" || v === "paused") return v;
  return "active"; // 'in_progress' と未知値は active に丸める
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function OnboardingPage() {
  if (isDemoMode()) {
    // デモ: 従来と同一の DEMO_* を渡す（表示不変＝デプロイ安全）。
    return (
      <OnboardingClient
        runs={DEMO_ONBOARDING_RUNS}
        templates={DEMO_TEMPLATES}
        employees={DEMO_EMPLOYEES}
        departments={DEMO_DEPARTMENTS}
      />
    );
  }

  // 本番: 実テーブル（onboarding_runs / onboarding_templates）+ employees / departments を
  // ユーザー RLS 経由で取得し、demo 型へ best-effort でマップする。
  const supabase = await createClient();
  const [runsRes, tplRes, empsRes, deptsRes] = await Promise.all([
    supabase
      .from("onboarding_runs")
      .select("id, employee_id, template_id, buddy_id, status, task_state, started_at, completed_at")
      .order("started_at", { ascending: false }),
    supabase
      .from("onboarding_templates")
      .select("id, name, phases"),
    supabase
      .from("employees")
      .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("employee_code"),
    supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
  ]);

  if (runsRes.error) console.error("[onboarding] onboarding_runs query failed:", runsRes.error.message);
  if (tplRes.error) console.error("[onboarding] onboarding_templates query failed:", tplRes.error.message);
  if (empsRes.error) console.error("[onboarding] employees query failed:", empsRes.error.message);
  if (deptsRes.error) console.error("[onboarding] departments query failed:", deptsRes.error.message);

  const employees = (empsRes.data ?? []) as DemoEmployee[];
  const departments = (deptsRes.data ?? []) as DemoDept[];
  const managerByEmp = new Map(employees.map((e) => [e.id, e.manager_id]));

  // ── onboarding_templates.phases(jsonb, 目安 [{phase, day_offset, tasks:[...]}]) → OnboardingTemplate ──
  // phases の内部タスク形状はスキーマ未定義のため best-effort で平坦化。
  // owner / phase は既定へ丸め（OWNER_COLOR / PHASE_TONE の undefined 索引を回避）、
  // 内部が配列でない/空なら tasks は空配列（＝空状態）。
  // description / applicable_to は列が無いため既定値（needs_review）。
  const templates: OnboardingTemplate[] = (tplRes.data ?? []).map((row): OnboardingTemplate => {
    const t = row as { id: string; name: string | null; phases: unknown };
    const phaseGroups = Array.isArray(t.phases) ? (t.phases as Array<Record<string, unknown>>) : [];
    const tasks: TaskTemplate[] = [];
    phaseGroups.forEach((g, gi) => {
      const groupPhase = coercePhase(g.phase);
      const groupOffset = Number(g.day_offset ?? 0) || 0;
      const rawTasks = Array.isArray(g.tasks) ? (g.tasks as unknown[]) : [];
      rawTasks.forEach((rt, ti) => {
        const obj = rt && typeof rt === "object" ? (rt as Record<string, unknown>) : {};
        // タスクが文字列だけの場合は title として扱う
        const title = typeof rt === "string" ? rt : String(obj.title ?? "");
        tasks.push({
          id: String(obj.id ?? `${t.id}-${gi}-${ti}`),
          phase: KNOWN_PHASES.has(obj.phase as string) ? (obj.phase as OnboardingPhase) : groupPhase,
          title,
          description: obj.description != null ? String(obj.description) : undefined,
          owner: coerceOwner(obj.owner),
          default_offset_days: Number(obj.default_offset_days ?? obj.day_offset ?? groupOffset) || 0,
          estimated_minutes: obj.estimated_minutes != null ? Number(obj.estimated_minutes) || undefined : undefined,
          triggers_calendar: obj.triggers_calendar != null ? Boolean(obj.triggers_calendar) : undefined,
          triggers_slack: obj.triggers_slack != null ? Boolean(obj.triggers_slack) : undefined,
        });
      });
    });
    return {
      id: t.id,
      name: t.name ?? "",
      description: "",         // 列なし（needs_review）
      applicable_to: ["all"],  // 列なし（needs_review）
      tasks,
    };
  });

  // ── onboarding_runs.task_state(jsonb, 既定 '{}') → TaskState[] ──
  // 形状はスキーマ未定義。配列 / task_id キーのオブジェクト（値 = status 文字列 or オブジェクト）の
  // 両方を防御的に受け、解釈不能なら空配列（＝空状態）。
  const mapTaskStates = (raw: unknown): TaskState[] => {
    if (Array.isArray(raw)) {
      return raw.map((el): TaskState => {
        const o = el && typeof el === "object" ? (el as Record<string, unknown>) : {};
        return {
          task_id: String(o.task_id ?? o.id ?? ""),
          status: coerceTaskStatus(o.status),
          assignee_id: o.assignee_id != null ? String(o.assignee_id) : null,
          due_date: o.due_date != null ? String(o.due_date) : "",
          completed_at: o.completed_at != null ? String(o.completed_at) : null,
          notes: o.notes != null ? String(o.notes) : undefined,
        };
      });
    }
    if (raw && typeof raw === "object") {
      return Object.entries(raw as Record<string, unknown>).map(([taskId, val]): TaskState => {
        const o = val && typeof val === "object" ? (val as Record<string, unknown>) : {};
        // 値が status 文字列そのものの簡易形（例 { "t-1": "done" }）にも対応
        const status = typeof val === "string" ? coerceTaskStatus(val) : coerceTaskStatus(o.status);
        return {
          task_id: taskId,
          status,
          assignee_id: o.assignee_id != null ? String(o.assignee_id) : null,
          due_date: o.due_date != null ? String(o.due_date) : "",
          completed_at: o.completed_at != null ? String(o.completed_at) : null,
          notes: o.notes != null ? String(o.notes) : undefined,
        };
      });
    }
    return [];
  };

  const runs: OnboardingRun[] = (runsRes.data ?? []).map((row): OnboardingRun => {
    const r = row as {
      id: string; employee_id: string; template_id: string | null; buddy_id: string | null;
      status: string | null; task_state: unknown; started_at: string | null; completed_at: string | null;
    };
    return {
      id: r.id,
      employee_id: r.employee_id,
      template_id: r.template_id ?? "",
      // manager_id 列は onboarding_runs に無いため、対象社員の manager_id で代用（needs_review）。
      manager_id: managerByEmp.get(r.employee_id) ?? "",
      buddy_id: r.buddy_id ?? null,
      // timestamptz を "YYYY-MM-DD" に切り詰め（demo の日付表示に合わせる）。
      start_date: (r.started_at ?? "").slice(0, 10),
      // expected_completion 列は無いため started_at + 90 日で近似（needs_review）。
      expected_completion: r.started_at ? addDays(r.started_at, 90) : "",
      status: coerceRunStatus(r.status),
      task_states: mapTaskStates(r.task_state),
    };
  });

  return (
    <OnboardingClient
      runs={runs}
      templates={templates}
      employees={employees}
      departments={departments}
    />
  );
}
