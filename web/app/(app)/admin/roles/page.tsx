/**
 * /admin/roles
 *
 * ロール（権限）付与・剥奪 UI（HR 管理者のみ）。
 *
 * - 全社員 + 各社員の現在ロールを表示
 * - 5 ロール（hr_admin / manager / employee / executive / readonly）の付与/剥奪
 * - hr_admin の最後の 1 人を剥奪しないようガード（クライアント側）
 */

import { isDemoMode } from "@/lib/demo/mock-data";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import { createClient } from "@/lib/supabase/server";
import { RolesClient, type EmployeeWithRoles, type Role } from "./roles-client";

export const dynamic = "force-dynamic";

// デモ用の固定ロール割当（一部社員に管理者・役員等を付与）
const DEMO_ROLE_MAP: Record<string, Role[]> = {
  e1:  ["hr_admin", "executive"],   // 野村 CEO
  e2:  ["hr_admin"],                 // 高橋 CHRO
  e3:  ["executive", "manager"],     // 佐藤 COO
  e4:  ["executive", "manager"],     // 山田 CPO
  e5:  ["hr_admin", "manager"],      // 鎌田 HRBP
  e6:  ["manager"],                  // 塚本 リクルーター
  e8:  ["manager"],                  // 川崎 VPoE
  e9:  ["manager"],                  // 藤本 テックリード
  e14: ["manager"],                  // 原田 デザインリード
};

export default async function RolesPage() {
  const demo = isDemoMode();
  let employees: EmployeeWithRoles[] = [];

  if (demo) {
    employees = DEMO_EMPLOYEES
      .filter((e) => e.status === "active")
      .map((e) => ({
        id: e.id,
        full_name: e.full_name,
        job_title: e.job_title,
        department_name: DEMO_DEPARTMENTS.find((d) => d.id === e.department_id)?.name ?? "—",
        roles: DEMO_ROLE_MAP[e.id] ?? ["employee"],
      }));
  } else {
    try {
      const sb = await createClient();
      const { data: emps } = await sb
        .from("employees")
        .select("id, full_name, job_title, department_id, departments!employees_department_id_fkey(name)")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("employee_code");
      const { data: roleRows } = await sb
        .from("employee_roles")
        .select("employee_id, role");

      const roleMap = new Map<string, Role[]>();
      for (const r of (roleRows ?? []) as { employee_id: string; role: Role }[]) {
        const cur = roleMap.get(r.employee_id) ?? [];
        cur.push(r.role);
        roleMap.set(r.employee_id, cur);
      }

      employees = (emps ?? []).map((e) => {
        const dept = Array.isArray(e.departments) ? e.departments[0] : e.departments;
        return {
          id: e.id as string,
          full_name: e.full_name as string,
          job_title: e.job_title as string,
          department_name: dept?.name ?? "—",
          roles: roleMap.get(e.id as string) ?? ["employee"],
        };
      });
    } catch (err) {
      console.error("[admin/roles] failed", err);
    }
  }

  return <RolesClient employees={employees} demo={demo} />;
}
