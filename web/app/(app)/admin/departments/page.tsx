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
import { DepartmentsClient, type Department } from "./departments-client";

export const dynamic = "force-dynamic";

function Notice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="p-8">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-semibold text-destructive">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

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

  // departments / employees の RLS は organization_id を current_employee() と
  // 突き合わせている。auth_user_id 未連携や organization_id 未設定だと
  // current_employee() が空になり、SELECT はエラーではなく 0 件を返す。
  // 素通しすると「部署総数 0 / ツリー空」を正常な結果として描いてしまい
  // 原因が追えないため、先に紐付けを確認して切り分ける。
  const { data: me } = await supabase
    .from("employees")
    .select("id, organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!me) {
    return (
      <Notice
        title="社員レコードが見つかりません"
        detail="ログイン中のアカウントに紐づく社員レコードがありません（employees.auth_user_id が未設定の可能性）。この状態では部署一覧が 0 件として表示されます。HR 管理者に連絡してください。"
      />
    );
  }
  if (!me.organization_id) {
    return (
      <Notice
        title="組織が設定されていません"
        detail="社員レコードに organization_id が設定されていないため、部署一覧を取得できません。HR 管理者に連絡してください。"
      />
    );
  }

  // 部署一覧 + 各部署の所属社員数（RLS は hr_admin 経由で許可）
  const [
    { data: depts, error: deptError },
    { data: empCounts, error: empError },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, parent_id, code, name, display_order, created_at")
      .order("display_order", { ascending: true }),
    supabase
      .from("employees")
      .select("department_id, id")
      .eq("status", "active"),
  ]);

  const failure = deptError ?? empError;
  if (failure) {
    return (
      <Notice
        title="部署情報の取得に失敗しました"
        detail={failure.message}
      />
    );
  }

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
