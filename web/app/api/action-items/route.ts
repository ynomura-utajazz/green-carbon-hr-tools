/**
 * GET  /api/action-items?member_id=&assignee_id=  → アクション項目一覧
 * POST /api/action-items                           → アクション項目作成
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWriter } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT =
  "id, organization_id, one_on_one_id, member_id, assignee_id, title, description, due_date, completed_at, created_at, updated_at";

export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("member_id");
  const assigneeId = searchParams.get("assignee_id");
  const oneOnOneId = searchParams.get("one_on_one_id");

  let q = sb.from("action_items").select(SELECT).order("due_date", { ascending: true });
  if (memberId) q = q.eq("member_id", memberId);
  if (assigneeId) q = q.eq("assignee_id", assigneeId);
  if (oneOnOneId) q = q.eq("one_on_one_id", oneOnOneId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

type CreateBody = {
  one_on_one_id?: string | null;
  member_id?: string;
  assignee_id?: string;
  title?: string;
  description?: string;
  due_date?: string;
};

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  let body: CreateBody;
  try { body = (await req.json()) as CreateBody; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!body.member_id || !body.assignee_id || !body.title?.trim()) {
    return NextResponse.json({ ok: false, error: "missing-required-fields" }, { status: 400 });
  }

  const { data: memberEmp } = await sb
    .from("employees")
    .select("organization_id")
    .eq("id", body.member_id)
    .maybeSingle();
  if (!memberEmp?.organization_id) {
    return NextResponse.json({ ok: false, error: "member-not-found" }, { status: 400 });
  }

  const { data, error } = await getWriter(sb)
    .from("action_items")
    .insert({
      organization_id: memberEmp.organization_id,
      one_on_one_id: body.one_on_one_id ?? null,
      member_id: body.member_id,
      assignee_id: body.assignee_id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      due_date: body.due_date || null,
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}
