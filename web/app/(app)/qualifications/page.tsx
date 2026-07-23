import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_EMPLOYEES, type DemoEmployee } from "@/lib/demo/employees";
import { QualificationsClient, type Qualification, type QualCategory } from "./qualifications-client";

export const dynamic = "force-dynamic";

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

// デモデータ（従来 page.tsx にハードコードされていたもの。デモ表示を不変に保つため保持）
const DEMO_QUALIFICATIONS: Qualification[] = [
  { id: "q-1", employee_id: "e8",  name: "AWS Solutions Architect Pro", category: "tech",         expires_at: day(120),  acquired_at: "2024-08-15" },
  { id: "q-2", employee_id: "e26", name: "公認会計士",                    category: "professional", expires_at: null,      acquired_at: "2010-04-01" },
  { id: "q-3", employee_id: "e9",  name: "AWS Solutions Architect Pro", category: "tech",         expires_at: day(45),   acquired_at: "2023-10-20" },
  { id: "q-4", employee_id: "e10", name: "情報処理安全確保支援士",      category: "compliance",   expires_at: day(180),  acquired_at: "2023-04-01" },
  { id: "q-5", employee_id: "e2",  name: "社会保険労務士",              category: "professional", expires_at: null,      acquired_at: "2018-08-15" },
  { id: "q-6", employee_id: "e7",  name: "PMP",                         category: "tech",         expires_at: day(15),   acquired_at: "2023-05-10" },
  { id: "q-7", employee_id: "e16", name: "TOEIC 950",                   category: "language",     expires_at: day(720),  acquired_at: "2024-12-01" },
  { id: "q-8", employee_id: "e1",  name: "IPO 公開会社等役員研修 修了", category: "compliance",   expires_at: null,      acquired_at: "2025-06-01" },
];

// skills.category は自由文字列。demo 型の既知カテゴリに寄せ、未知値は "other" に丸める（点5）。
const KNOWN_CATEGORIES: QualCategory[] = ["tech", "professional", "compliance", "language"];
function toCategory(raw: string | null | undefined): QualCategory {
  const c = (raw ?? "").toLowerCase();
  return (KNOWN_CATEGORIES as string[]).includes(c) ? (c as QualCategory) : "other";
}

export default async function QualificationsPage() {
  if (isDemoMode()) {
    return (
      <QualificationsClient
        qualifications={DEMO_QUALIFICATIONS}
        employees={DEMO_EMPLOYEES}
        nationalHolders={2}
        plannedThisTerm={4}
      />
    );
  }

  // 本番: employee_skills + skills から取得し、資格一覧の demo 型へ変換。
  // 注: employee_skills/skills には有効期限(expires_at)・取得日(acquired_at)カラムが無い。
  //     expires_at は null（＝期限なし表示・「更新必要」KPI=0）、acquired_at は updated_at を代用する。
  const supabase = await createClient();
  const [skillsRes, empSkillsRes, empsRes] = await Promise.all([
    supabase.from("skills").select("id, category, name"),
    supabase.from("employee_skills").select("employee_id, skill_id, level, updated_at"),
    supabase
      .from("employees")
      .select("id, employee_code, full_name, full_name_kana, display_name_en, email, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality, is_foreign_national, slack_user_id, office_location")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("employee_code"),
  ]);
  if (skillsRes.error) console.error("[qualifications] skills query failed:", skillsRes.error.message);
  if (empSkillsRes.error) console.error("[qualifications] employee_skills query failed:", empSkillsRes.error.message);
  if (empsRes.error) console.error("[qualifications] employees query failed:", empsRes.error.message);

  const skillMap = new Map(
    (skillsRes.data ?? []).map((s) => [
      s.id as string,
      { name: s.name as string, category: toCategory(s.category as string) },
    ]),
  );

  const qualifications: Qualification[] = (empSkillsRes.data ?? [])
    .map((r): Qualification | null => {
      const skill = skillMap.get(r.skill_id as string);
      if (!skill) return null;
      const updated = (r.updated_at as string | null) ?? null;
      return {
        id: `${r.employee_id as string}:${r.skill_id as string}`,
        employee_id: r.employee_id as string,
        name: skill.name,
        category: skill.category,
        expires_at: null,
        acquired_at: updated ? updated.slice(0, 10) : "",
      };
    })
    .filter((q): q is Qualification => q !== null);

  const employees = (empsRes.data ?? []) as DemoEmployee[];

  // 国家資格保有 = professional カテゴリの資格を持つ社員の実人数（distinct）。
  const nationalHolders = new Set(
    qualifications.filter((q) => q.category === "professional").map((q) => q.employee_id),
  ).size;

  return (
    <QualificationsClient
      qualifications={qualifications}
      employees={employees}
      nationalHolders={nationalHolders}
      plannedThisTerm={0}
    />
  );
}
