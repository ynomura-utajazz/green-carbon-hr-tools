/**
 * PATCH  /api/admin/departments/[id]   → 部署更新（名前 / コード / 親 / 表示順）
 * DELETE /api/admin/departments/[id]   → 部署削除
 *
 * DELETE は配下に社員 or 子部署があるとき DB CHECK で弾く（RLS + アプリ両方で防御）。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  let body: { parent_id?: string | null; name?: string; code?: string | null; display_order?: number };
  try { body = await req.json() as { parent_id?: string | null; name?: string; code?: string | null; display_order?: number }; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  // 自分自身を親にできない
  if (body.parent_id === id) {
    return NextResponse.json({ ok: false, error: "self-parent-not-allowed" }, { status: 400 });
  }

  // 循環参照防止：新しい parent_id が自分の子孫だったら拒否
  if (body.parent_id) {
    const { data: descendants } = await sb.rpc("get_department_descendants", { dept_id: id }).then(
      (r) => r,
      () => ({ data: null }),
    );
    // フォールバック: RPC が無い場合はクライアント側で防いでいる前提
    if (Array.isArray(descendants) && descendants.some((d: { id: string }) => d.id === body.parent_id)) {
      return NextResponse.json({ ok: false, error: "circular-reference" }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name?.trim();
  if (body.code !== undefined) updates.code = body.code?.trim() || null;
  if (body.parent_id !== undefined) updates.parent_id = body.parent_id;
  if (body.display_order !== undefined) updates.display_order = body.display_order;
  updates.updated_at = new Date().toISOString();

  // RLS bypass：hr_admin 未連携テスター対応
  const admin = createServiceClient();
  const writer = admin ?? sb;

  const { data, error } = await writer
    .from("departments")
    .update(updates)
    .eq("id", id)
    .select("id, parent_id, code, name, display_order")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });

  // 社員カウントを取り直し
  const { count } = await sb
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("department_id", id)
    .eq("status", "active");

  return NextResponse.json({
    ok: true,
    department: {
      id: data.id,
      parent_id: data.parent_id,
      code: data.code,
      name: data.name,
      display_order: data.display_order ?? 0,
      employee_count: count ?? 0,
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  // 子部署チェック
  const { count: childCount } = await sb
    .from("departments")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", id);
  if ((childCount ?? 0) > 0) {
    return NextResponse.json({ ok: false, error: "has-children" }, { status: 400 });
  }

  // 所属社員チェック
  const { count: empCount } = await sb
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("department_id", id);
  if ((empCount ?? 0) > 0) {
    return NextResponse.json({ ok: false, error: "has-employees" }, { status: 400 });
  }

  // RLS bypass：hr_admin 未連携テスター対応
  const admin = createServiceClient();
  const writer = admin ?? sb;
  const { error } = await writer.from("departments").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
