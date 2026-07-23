/**
 * サーバー側の認可ヘルパー。
 *
 * 管理系の書き込み API（service_role で RLS をバイパスするもの）は、
 * 呼び出しユーザーが管理ロールを持つことを明示的に検証してから実行すること。
 * RLS 任せにできない（service_role はRLSを通らない）ため、ここで自前判定する。
 */

import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * ログイン中ユーザー（auth.users.id）が指定ロールのいずれかを持つか。
 * 認可の読み取りは service_role（RLS非依存で確実）で行う。
 * 該当する社員レコードが無い／ロールが無ければ false。
 */
export async function userHasAdminRole(
  authUserId: string,
  roles: readonly string[] = ["hr_admin", "executive"],
): Promise<boolean> {
  const admin = createServiceClient();
  const client = admin ?? (await createClient());

  const { data: emp } = await client
    .from("employees")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!emp) return false;

  const { data: rows } = await client
    .from("employee_roles")
    .select("role")
    .eq("employee_id", emp.id as string);

  return (rows ?? []).some((r) => roles.includes(r.role as string));
}
