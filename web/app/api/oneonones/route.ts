/**
 * GET  /api/oneonones?manager_id=&member_id=  → 1on1 セッション一覧
 * POST /api/oneonones                          → 1on1 セッション作成
 *
 * 認可：service role 経由（hr_admin 未連携テスター対応）。
 * Phase B クリーンアップ後は RLS 通常運用に移行予定。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWriter } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT =
  "id, organization_id, manager_id, member_id, scheduled_at, completed_at, duration_minutes, mood, agenda, notes, ai_summary, topics, calendar_event_id, meet_url, created_at, updated_at";

export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const managerId = searchParams.get("manager_id");
  const memberId = searchParams.get("member_id");

  let q = sb.from("oneonones").select(SELECT).order("scheduled_at", { ascending: false });
  if (managerId) q = q.eq("manager_id", managerId);
  if (memberId) q = q.eq("member_id", memberId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sessions: data ?? [] });
}

type CreateBody = {
  manager_id?: string;
  member_id?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  agenda?: string;
  topics?: string[];
  calendar_event_id?: string;
  meet_url?: string;
  // 即座に完了状態で作る場合
  completed_at?: string;
  mood?: "great" | "good" | "ok" | "down" | "bad";
  notes?: string;
  ai_summary?: string;
};

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  let body: CreateBody;
  try { body = (await req.json()) as CreateBody; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!body.manager_id || !body.member_id) {
    return NextResponse.json({ ok: false, error: "missing-manager_or_member" }, { status: 400 });
  }
  if (body.manager_id === body.member_id) {
    return NextResponse.json({ ok: false, error: "manager_eq_member" }, { status: 400 });
  }
  if (!body.scheduled_at) {
    return NextResponse.json({ ok: false, error: "missing-scheduled_at" }, { status: 400 });
  }

  // organization_id は manager 側から継承
  const { data: managerEmp } = await sb
    .from("employees")
    .select("organization_id")
    .eq("id", body.manager_id)
    .maybeSingle();
  if (!managerEmp?.organization_id) {
    return NextResponse.json({ ok: false, error: "manager-not-found" }, { status: 400 });
  }

  // RLS で current_employee() のリンクが不完全なテスター対応
  const { data, error } = await getWriter(sb)
    .from("oneonones")
    .insert({
      organization_id: managerEmp.organization_id,
      manager_id: body.manager_id,
      member_id: body.member_id,
      scheduled_at: body.scheduled_at,
      duration_minutes: body.duration_minutes ?? 30,
      agenda: body.agenda ?? null,
      topics: body.topics ?? [],
      calendar_event_id: body.calendar_event_id ?? null,
      meet_url: body.meet_url ?? null,
      completed_at: body.completed_at ?? null,
      mood: body.mood ?? null,
      notes: body.notes ?? null,
      ai_summary: body.ai_summary ?? null,
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, session: data });
}
