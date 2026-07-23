import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_CURRENT_EMPLOYEE_ID } from "@/lib/demo/mock-data";
import {
  DEMO_EMPLOYEES, DEMO_DEPARTMENTS, type DemoEmployee, type DemoDept,
} from "@/lib/demo/employees";
import {
  DEMO_OBJECTIVES, DEMO_CYCLES, DEMO_MBO_REVIEWS,
  statusFromProgress,
  type Objective, type KeyResult, type ReviewCycle, type MboReview,
  type OkrLevel, type MboGrade,
} from "@/lib/demo/okr";
import { MboOkrClient } from "./mbo-okr-client";

export const dynamic = "force-dynamic";

// directory と同一の employees select（担当外の他ページと揃える）。
const EMPLOYEE_SELECT =
  "id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location";

const VALID_LEVELS = new Set<OkrLevel>(["company", "department", "individual"]);

export default async function MboOkrPage() {
  // デモ: 現状と同じ DEMO_* をそのまま渡す（表示不変）。
  if (isDemoMode()) {
    return (
      <MboOkrClient
        objectives={DEMO_OBJECTIVES}
        cycles={DEMO_CYCLES}
        reviews={DEMO_MBO_REVIEWS}
        employees={DEMO_EMPLOYEES}
        departments={DEMO_DEPARTMENTS}
        currentEmployeeId={DEMO_CURRENT_EMPLOYEE_ID}
      />
    );
  }

  // 本番: ユーザー RLS の createClient() で goals + key_results + review_cycles + reviews を取得し、
  // demo 型へ .map で変換する。employees / departments は directory と同一 select。
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const meResPromise = user
    ? supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle()
    : Promise.resolve({ data: null as { id: string } | null, error: null });

  const [meRes, cyclesRes, goalsRes, krRes, reviewsRes, empsRes, deptsRes] = await Promise.all([
    meResPromise,
    supabase
      .from("review_cycles")
      .select("id, name, starts_on, ends_on, is_active")
      .order("starts_on", { ascending: false }),
    supabase
      .from("goals")
      .select("id, cycle_id, owner_id, parent_goal_id, level, title, description, progress, weight")
      .order("created_at", { ascending: true }),
    supabase
      .from("key_results")
      .select("id, goal_id, title, target, actual, unit, progress, updated_at"),
    supabase
      .from("reviews")
      .select("id, cycle_id, employee_id, reviewer_id, self_rating, manager_rating, final_rating, self_comment, manager_comment, calibrated_at"),
    supabase
      .from("employees")
      .select(EMPLOYEE_SELECT)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("employee_code"),
    supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
  ]);

  if (meRes.error) console.error("[mbo-okr] employees(self) query failed:", meRes.error.message);
  if (cyclesRes.error) console.error("[mbo-okr] review_cycles query failed:", cyclesRes.error.message);
  if (goalsRes.error) console.error("[mbo-okr] goals query failed:", goalsRes.error.message);
  if (krRes.error) console.error("[mbo-okr] key_results query failed:", krRes.error.message);
  if (reviewsRes.error) console.error("[mbo-okr] reviews query failed:", reviewsRes.error.message);
  if (empsRes.error) console.error("[mbo-okr] employees query failed:", empsRes.error.message);
  if (deptsRes.error) console.error("[mbo-okr] departments query failed:", deptsRes.error.message);

  const employees = (empsRes.data ?? []) as DemoEmployee[];
  const departments = (deptsRes.data ?? []) as DemoDept[];
  const currentEmployeeId = (meRes.data?.id as string | undefined) ?? "";

  const cycles: ReviewCycle[] = (cyclesRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: (c.name as string) ?? "",
    starts_on: c.starts_on as string,
    ends_on: c.ends_on as string,
    is_active: Boolean(c.is_active),
  }));

  // key_results を goal_id ごとにまとめる。schema に無い baseline / confidence は安全な既定へ丸める
  // （baseline=0 は UI で初期値行を非表示、confidence=3 は中立表示）。
  const krByGoal = new Map<string, KeyResult[]>();
  for (const r of krRes.data ?? []) {
    const kr: KeyResult = {
      id: r.id as string,
      title: (r.title as string) ?? "",
      unit: (r.unit as string | null) ?? "",
      target: r.target != null ? Number(r.target) : 0,
      baseline: 0,
      current: r.actual != null ? Number(r.actual) : 0,
      progress: Math.round(Number(r.progress) || 0),
      confidence: 3,
      last_updated_at: (r.updated_at as string) ?? new Date().toISOString(),
    };
    const arr = krByGoal.get(r.goal_id as string);
    if (arr) arr.push(kr);
    else krByGoal.set(r.goal_id as string, [kr]);
  }

  // goals には department_id 列が無いため、部署レベル目標の所属はオーナーの所属部署で代用する
  // （部署ビューの絞り込み / バッジ表示用）。
  const empDept = new Map(employees.map((e) => [e.id, e.department_id]));

  const objectives: Objective[] = (goalsRes.data ?? []).map((g) => {
    const rawLevel = g.level as string;
    const level = (VALID_LEVELS.has(rawLevel as OkrLevel) ? rawLevel : "individual") as OkrLevel;
    const progress = Math.round(Number(g.progress) || 0);
    return {
      id: g.id as string,
      cycle_id: g.cycle_id as string,
      level,
      parent_id: (g.parent_goal_id as string | null) ?? null,
      owner_id: g.owner_id as string,
      title: (g.title as string) ?? "",
      description: (g.description as string | null) ?? undefined,
      weight: g.weight != null ? Number(g.weight) : undefined,
      key_results: krByGoal.get(g.id as string) ?? [],
      progress,
      // goals に status 列は無いので進捗から導出（achieved/active/at_risk/behind のいずれか）。
      status: statusFromProgress(progress),
      department_id: level === "department" ? (empDept.get(g.owner_id as string) ?? undefined) : undefined,
      // goals に visible_to 列は無い。UI では未使用だが型を満たすため既定値。
      visible_to: "company",
    };
  });

  const reviews: MboReview[] = (reviewsRes.data ?? []).map((r) => ({
    id: r.id as string,
    cycle_id: r.cycle_id as string,
    employee_id: r.employee_id as string,
    reviewer_id: (r.reviewer_id as string | null) ?? "",
    // review_grade enum は S/A/B/C/D で MboGrade と一致。null はそのまま null。
    self_rating: (r.self_rating as MboGrade | null) ?? null,
    manager_rating: (r.manager_rating as MboGrade | null) ?? null,
    final_rating: (r.final_rating as MboGrade | null) ?? null,
    self_comment: (r.self_comment as string | null) ?? "",
    manager_comment: (r.manager_comment as string | null) ?? "",
    calibrated_at: (r.calibrated_at as string | null) ?? null,
  }));

  return (
    <MboOkrClient
      objectives={objectives}
      cycles={cycles}
      reviews={reviews}
      employees={employees}
      departments={departments}
      currentEmployeeId={currentEmployeeId}
    />
  );
}
