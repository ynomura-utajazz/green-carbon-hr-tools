/**
 * POST /api/admin/transfers/[id]/apply
 *
 * 予約済みの異動辞令を employees レコードに適用する。
 * （発令日になっていなくても手動で適用可能）
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWriter } from "@/lib/supabase/admin";
import { userHasAdminRole } from "@/lib/auth/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });
  // apply_transfer は employees を書き換える。service_role 実行のため管理者限定。
  if (!(await userHasAdminRole(user.id))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { error } = await getWriter(sb).rpc("apply_transfer", { transfer_id: id });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
