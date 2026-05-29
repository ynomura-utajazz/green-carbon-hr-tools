/**
 * PATCH  /api/oneonones/[id]  → 1on1 セッション更新（完了・気分・メモ）
 * DELETE /api/oneonones/[id]  → 1on1 セッション削除
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWriter } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const SELECT =
  "id, organization_id, manager_id, member_id, scheduled_at, completed_at, duration_minutes, mood, agenda, notes, ai_summary, topics, calendar_event_id, meet_url, created_at, updated_at";

type PatchBody = {
  scheduled_at?: string;
  completed_at?: string | null;
  duration_minutes?: number;
  mood?: "great" | "good" | "ok" | "down" | "bad" | null;
  agenda?: string | null;
  notes?: string | null;
  ai_summary?: string | null;
  topics?: string[];
  calendar_event_id?: string | null;
  meet_url?: string | null;
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
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;
  if (body.completed_at !== undefined) updates.completed_at = body.completed_at;
  if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes;
  if (body.mood !== undefined) updates.mood = body.mood;
  if (body.agenda !== undefined) updates.agenda = body.agenda;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.ai_summary !== undefined) updates.ai_summary = body.ai_summary;
  if (body.topics !== undefined) updates.topics = body.topics;
  if (body.calendar_event_id !== undefined) updates.calendar_event_id = body.calendar_event_id;
  if (body.meet_url !== undefined) updates.meet_url = body.meet_url;

  const { data, error } = await getWriter(sb)
    .from("oneonones")
    .update(updates)
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  return NextResponse.json({ ok: true, session: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });

  const { error } = await getWriter(sb).from("oneonones").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
