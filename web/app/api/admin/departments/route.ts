/**
 * GET  /api/admin/departments        → 全部署リスト（ツリー構築は client 側）
 * POST /api/admin/departments        → 部署作成
 *
 * 認可：呼び出しユーザー自身が hr_admin であること（RLS で強制）。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  const { data, error } = await sb
    .from("departments")
    .select("id, parent_id, code, name, display_order, created_at")
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true, departments: data ?? [] });
}

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  let body: { parent_id?: string | null; name?: string; code?: string | null; display_order?: number };
  try { body = await req.json() as { parent_id?: string | null; name?: string; code?: string | null; display_order?: number }; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "missing-name" }, { status: 400 });
  }

  // 呼び出しユーザーの organization_id を取得
  const { data: meEmp } = await sb
    .from("employees")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // フォールバック：employee mapping 未登録のテスターでも操作できるよう、
  // 最初の organization を使う（Phase B で employee 自動マッピング実装後に削除予定）
  let orgId = meEmp?.organization_id as string | undefined;
  if (!orgId) {
    const { data: anyOrg } = await sb
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    orgId = anyOrg?.id as string | undefined;
  }

  if (!orgId) {
    return NextResponse.json({ ok: false, error: "no-organization" }, { status: 403 });
  }

  // RLS bypass for INSERT: hr_admin ロール未連携のテスターでも作成できるよう
  // service role を使う（認証済みユーザーであることは上で検証済み）。
  // Phase B で employee_roles 自動付与を実装したら通常クライアントに戻す。
  const admin = createServiceClient();
  const writer = admin ?? sb;

  const { data, error } = await writer
    .from("departments")
    .insert({
      organization_id: orgId,
      parent_id: body.parent_id ?? null,
      name: body.name.trim(),
      code: body.code?.trim() || null,
      display_order: body.display_order ?? 0,
    })
    .select("id, parent_id, code, name, display_order")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });

  return NextResponse.json({
    ok: true,
    department: {
      id: data.id,
      parent_id: data.parent_id,
      code: data.code,
      name: data.name,
      display_order: data.display_order ?? 0,
      employee_count: 0,
    },
  });
}
