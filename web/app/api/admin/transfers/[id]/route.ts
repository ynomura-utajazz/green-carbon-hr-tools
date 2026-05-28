/**
 * POST   /api/admin/transfers/[id]/apply  → 異動辞令を employees に適用
 * DELETE /api/admin/transfers/[id]        → 異動辞令を削除（適用済みは取り消し不可）
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  const admin = createServiceClient();
  const writer = admin ?? sb;

  // 適用済みは削除不可（履歴保持のため）
  const { data: t } = await writer
    .from("transfers")
    .select("is_applied")
    .eq("id", id)
    .maybeSingle();
  if (!t) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  if (t.is_applied) {
    return NextResponse.json({ ok: false, error: "already-applied" }, { status: 400 });
  }

  const { error } = await writer.from("transfers").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
