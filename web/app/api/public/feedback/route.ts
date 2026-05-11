/**
 * POST /api/public/feedback
 *
 * 候補者向け体験 NPS の受信。匿名 OK。
 * Body: { application_id?, nps: number, positive?, negative?, stage_at_feedback }
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  application_id?: string;
  nps?: number;
  positive?: string;
  negative?: string;
  stage_at_feedback?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (typeof body.nps !== "number" || body.nps < 0 || body.nps > 10) {
    return NextResponse.json({ ok: false, error: "nps を 0-10 で入力してください" }, { status: 400 });
  }
  if (body.positive && body.positive.length > 2000) return NextResponse.json({ ok: false, error: "良い点は 2000 字以内" }, { status: 400 });
  if (body.negative && body.negative.length > 2000) return NextResponse.json({ ok: false, error: "改善点は 2000 字以内" }, { status: 400 });

  if (isDemoMode()) {
    console.info("[careers/feedback] demo received:", body);
    return NextResponse.json({ ok: true, message: "ご回答ありがとうございました 🙏" });
  }

  const sb = createServiceClient();
  if (!sb) return NextResponse.json({ ok: false, error: "service-unavailable" }, { status: 503 });

  const { error } = await sb.from("candidate_feedback").insert({
    candidate_id:  body.application_id ?? null,
    nps:           body.nps,
    positive:      body.positive ?? null,
    negative:      body.negative ?? null,
    stage_at_feedback: body.stage_at_feedback ?? null,
    submitted_at:  new Date().toISOString(),
  });

  if (error) {
    console.error("[careers/feedback] insert failed", error);
    return NextResponse.json({ ok: false, error: "insert-failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "ご回答ありがとうございました 🙏" });
}
