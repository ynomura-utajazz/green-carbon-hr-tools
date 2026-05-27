import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isDemoMode, DEMO_CURRENT_EMPLOYEE_ID } from "@/lib/demo/mock-data";
import {
  DEMO_EMPLOYEES, DEMO_DEPARTMENTS,
  type DemoEmployee, type DemoDept,
} from "@/lib/demo/employees";
import {
  DEMO_ONEONONES, DEMO_ACTION_ITEMS,
  type OneOnOneSession, type ActionItem,
} from "@/lib/demo/oneonones";
import { OneOnOneClient } from "./oneonone-client";

export const dynamic = "force-dynamic";

// DB employees 行を DemoEmployee 互換に変換
function mapDbEmployee(e: Record<string, unknown>): DemoEmployee {
  return {
    id: e.id as string,
    employee_code: (e.employee_code as string) ?? "",
    full_name: (e.full_name as string) ?? "",
    full_name_kana: (e.full_name_kana as string | undefined) ?? undefined,
    display_name_en: (e.display_name_en as string | undefined) ?? undefined,
    email: (e.email as string) ?? "",
    department_id: (e.department_id as string) ?? "",
    manager_id: (e.manager_id as string | null) ?? null,
    job_title: (e.job_title as string) ?? "",
    job_grade: (e.job_grade as string) ?? "",
    employment_type: (e.employment_type as DemoEmployee["employment_type"]) ?? "full_time",
    status: (e.status as DemoEmployee["status"]) ?? "active",
    hire_date: (e.hire_date as string) ?? "",
    nationality: (e.nationality as string) ?? "JP",
    is_foreign_national: ((e.nationality as string) ?? "JP") !== "JP",
    office_location: "JP-TYO", // DB に未保持なのでデフォルト
  };
}

export default async function OneOnOnePage() {
  // デモモードならデモデータをそのまま使う
  if (isDemoMode()) {
    return (
      <OneOnOneClient
        currentEmployeeId={DEMO_CURRENT_EMPLOYEE_ID}
        employees={DEMO_EMPLOYEES}
        departments={DEMO_DEPARTMENTS}
        sessions={DEMO_ONEONONES}
        actionItems={DEMO_ACTION_ITEMS}
      />
    );
  }

  // 本番：認証ユーザーから employees 行を解決
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createServiceClient();
  const reader = admin ?? supabase;

  let currentEmployeeId = "<auth-resolved>";
  let employees: DemoEmployee[] = [];
  let departments: DemoDept[] = [];

  let sessions: OneOnOneSession[] = [];
  let actionItems: ActionItem[] = [];

  if (user) {
    const [{ data: me }, { data: emps }, { data: depts }, { data: ones }, { data: actions }] = await Promise.all([
      reader
        .from("employees")
        .select("id")
        .eq("auth_user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle(),
      reader
        .from("employees")
        .select("id, employee_code, email, full_name, full_name_kana, display_name_en, department_id, manager_id, job_title, job_grade, employment_type, status, hire_date, nationality")
        .is("deleted_at", null)
        .order("full_name", { ascending: true }),
      reader
        .from("departments")
        .select("id, name, parent_id, display_order")
        .order("display_order", { ascending: true }),
      reader
        .from("oneonones")
        .select("id, manager_id, member_id, scheduled_at, completed_at, duration_minutes, mood, agenda, notes, topics, calendar_event_id, meet_url")
        .order("scheduled_at", { ascending: false }),
      reader
        .from("action_items")
        .select("id, one_on_one_id, member_id, assignee_id, title, due_date, completed_at"),
    ]);

    if (me?.id) currentEmployeeId = me.id as string;
    employees = (emps ?? []).map(mapDbEmployee);
    departments = (depts ?? []).map((d) => ({
      id: d.id as string,
      name: d.name as string,
      parent_id: (d.parent_id as string | null) ?? null,
      display_order: (d.display_order as number) ?? 0,
    }));
    sessions = (ones ?? []).map((s) => ({
      id: s.id as string,
      manager_id: s.manager_id as string,
      member_id: s.member_id as string,
      scheduled_at: s.scheduled_at as string,
      completed_at: (s.completed_at as string | null) ?? null,
      duration_minutes: (s.duration_minutes as number) ?? 30,
      mood: (s.mood as OneOnOneSession["mood"]) ?? null,
      agenda: (s.agenda as string | null) ?? "",
      notes: (s.notes as string | null) ?? "",
      topics: (s.topics as string[]) ?? [],
      calendar_event_id: (s.calendar_event_id as string | null) ?? null,
      meet_url: (s.meet_url as string | null) ?? null,
    }));
    actionItems = (actions ?? []).map((a) => ({
      id: a.id as string,
      one_on_one_id: (a.one_on_one_id as string) ?? "",
      member_id: a.member_id as string,
      assignee_id: a.assignee_id as string,
      title: a.title as string,
      due_date: (a.due_date as string | null) ?? null,
      completed_at: (a.completed_at as string | null) ?? null,
    }));
  }

  // テーブル未マイグレーション環境向けのフォールバック（空配列でクラッシュ防止）
  // Supabase で 20260518000002 マイグレーションを実行すれば実データに切り替わる
  void DEMO_ONEONONES;
  void DEMO_ACTION_ITEMS;

  return (
    <OneOnOneClient
      currentEmployeeId={currentEmployeeId}
      employees={employees}
      departments={departments}
      sessions={sessions}
      actionItems={actionItems}
    />
  );
}
