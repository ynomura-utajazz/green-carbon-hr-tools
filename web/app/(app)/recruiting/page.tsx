import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_EMPLOYEES, type DemoEmployee } from "@/lib/demo/employees";
import {
  DEMO_POSITIONS,
  DEMO_CANDIDATES,
  DEMO_INTERVIEWS,
  type Position,
  type Candidate,
  type InterviewEvent,
  type CandidateStage,
  type CandidateSource,
} from "@/lib/demo/recruiting";
import { RecruitingClient } from "./recruiting-client";

export const dynamic = "force-dynamic";

// DB candidates.stage ('applied'|'screening'|'interview'|'offer'|'hired'|'rejected')
// → demo CandidateStage。DB は 'interview' 一段のみなので interview_1 に寄せる。
function mapStage(s: string | null): CandidateStage {
  switch (s) {
    case "interview":
      return "interview_1";
    case "applied":
    case "screening":
    case "offer":
    case "hired":
    case "rejected":
      return s;
    default:
      return "applied";
  }
}

export default async function RecruitingPage() {
  let positions: Position[];
  let candidates: Candidate[];
  let interviews: InterviewEvent[];
  let employees: DemoEmployee[];

  if (isDemoMode()) {
    positions = DEMO_POSITIONS;
    candidates = DEMO_CANDIDATES;
    interviews = DEMO_INTERVIEWS;
    employees = DEMO_EMPLOYEES;
  } else {
    const supabase = await createClient();
    const [posRes, candRes, empsRes, deptsRes] = await Promise.all([
      supabase
        .from("positions")
        .select("id, title, department_id, description, is_open, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("candidates")
        .select("id, position_id, full_name, email, phone, source, stage, resume_url, notes, rating, created_at, updated_at")
        .order("updated_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("employee_code"),
      supabase.from("departments").select("id, name, parent_id, display_order").order("display_order"),
    ]);

    if (posRes.error) console.error("[recruiting] positions query failed:", posRes.error.message);
    if (candRes.error) console.error("[recruiting] candidates query failed:", candRes.error.message);
    if (empsRes.error) console.error("[recruiting] employees query failed:", empsRes.error.message);
    if (deptsRes.error) console.error("[recruiting] departments query failed:", deptsRes.error.message);

    const deptNameById = new Map<string, string>(
      (deptsRes.data ?? []).map((d) => [d.id as string, d.name as string]),
    );

    // positions: DB は id/title/department_id/description/is_open/created_at のみ。
    // demo Position 型の残りフィールドは対応列が無いため安全な既定値で埋める
    // （level/job_grade/location/salary/担当者ID/target_close_at 等は実データ非存在）。
    positions = (posRes.data ?? []).map((row): Position => ({
      id: row.id as string,
      title: (row.title as string) ?? "",
      department: deptNameById.get(row.department_id as string) ?? "",
      level: "mid",
      job_grade: "",
      location: "",
      employment_type: "full_time",
      is_remote_ok: false,
      description: (row.description as string) ?? "",
      required_skills: [],
      salary_min: 0,
      salary_max: 0,
      currency: "JPY",
      hiring_manager_id: "",
      recruiter_id: "",
      opened_at: row.created_at as string,
      target_close_at: row.created_at as string,
      is_open: (row.is_open as boolean) ?? false,
    }));

    // candidates: DB 列を demo Candidate 型へ写像。source は自由文字列のため型キャスト、
    // stage は mapStage で正規化、notes は非 null 化、tags は列が無いため空配列。
    candidates = (candRes.data ?? []).map((row): Candidate => ({
      id: row.id as string,
      full_name: (row.full_name as string) ?? "",
      email: (row.email as string) ?? "",
      phone: (row.phone as string | null) ?? undefined,
      position_id: row.position_id as string,
      source: ((row.source as string) ?? "direct") as CandidateSource,
      stage: mapStage(row.stage as string | null),
      applied_at: row.created_at as string,
      updated_at: row.updated_at as string,
      rating: (row.rating as number | null) ?? null,
      resume_url: (row.resume_url as string | null) ?? undefined,
      notes: (row.notes as string | null) ?? "",
      tags: [],
    }));

    // interviews: candidate_events(kind/payload jsonb) の payload 構造が不明で
    // InterviewEvent(round/scheduled_at/interviewer_ids/format/status/feedback…) を
    // 安全に導出できないため空配列。KPI「予定された面接」は 0 表示になる（risk 報告）。
    interviews = [];

    employees = (empsRes.data ?? []) as DemoEmployee[];
  }

  return (
    <RecruitingClient
      positions={positions}
      candidates={candidates}
      interviews={interviews}
      employees={employees}
    />
  );
}
