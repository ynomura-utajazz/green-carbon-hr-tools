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

  if (user) {
    const [{ data: me }, { data: emps }, { data: depts }] = await Promise.all([
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
    ]);

    if (me?.id) currentEmployeeId = me.id as string;
    employees = (emps ?? []).map(mapDbEmployee);
    departments = (depts ?? []).map((d) => ({
      id: d.id as string,
      name: d.name as string,
      parent_id: (d.parent_id as string | null) ?? null,
      display_order: (d.display_order as number) ?? 0,
    }));
  }

  // 1on1 セッション・アクション項目は専用テーブル未実装なのでデモデータを使用
  // （Phase B 完了後に oneonones / action_items テーブル + データを実装予定）
  const sessions: OneOnOneSession[] = DEMO_ONEONONES;
  const actionItems: ActionItem[] = DEMO_ACTION_ITEMS;

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
