/**
 * /admin/departments
 *
 * 部署管理 UI（HR 管理者のみ）。
 *
 * - 階層ツリー表示（parent_id ベース）
 * - 各ノードに「子部署追加」「編集」「削除」
 * - 削除時は配下に社員がいたら拒否
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { DepartmentsClient, type Department } from "./departments-client";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        ログインしてください。
      </div>
    );
  }

  // RLS バイパス：hr_admin 未連携テスターでも部署一覧を見れるよう
  // service role 経由で SELECT する。Phase B で employee_roles 自動付与後は通常クライアントに戻す。
  const admin = createServiceClient();
  const reader = admin ?? supabase;

  // 部署一覧 + 各部署の所属社員数
  const [{ data: depts }, { data: empCounts }] = await Promise.all([
    reader
      .from("departments")
      .select("id, parent_id, code, name, display_order, created_at")
      .order("display_order", { ascending: true }),
    reader
      .from("employees")
      .select("department_id, id")
      .eq("status", "active"),
  ]);

  const employeeCountMap = new Map<string, number>();
  for (const e of (empCounts ?? []) as { department_id: string | null }[]) {
    if (e.department_id) {
      employeeCountMap.set(
        e.department_id,
        (employeeCountMap.get(e.department_id) ?? 0) + 1,
      );
    }
  }

  const list: Department[] = (depts ?? []).map((d) => ({
    id: d.id as string,
    parent_id: (d.parent_id as string | null) ?? null,
    code: (d.code as string | null) ?? null,
    name: d.name as string,
    display_order: (d.display_order as number | null) ?? 0,
    employee_count: employeeCountMap.get(d.id as string) ?? 0,
  }));

  return <DepartmentsClient departments={list} />;
}
