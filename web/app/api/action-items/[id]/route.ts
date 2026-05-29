/**
 * PATCH  /api/action-items/[id]  → アクション項目更新（完了マーク等）
 * DELETE /api/action-items/[id]  → アクション項目削除
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWriter } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const SELECT =
  "id, organization_id, one_on_one_id, member_id, assignee_id, title, description, due_date, completed_at, created_at, updated_at";

type PatchBody = {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  let body: PatchBody;
  try { body = (await req.json()) as PatchBody; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.completed_at !== undefined) updates.completed_at = body.completed_at;

  const { data, error } = await getWriter(sb)
    .from("action_items")
    .update(updates)
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  const { error } = await getWriter(sb).from("action_items").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
