/**
 * POST /api/public/apply
 *
 * 公開応募フォームから受け取る。
 * 認証不要。レート制限（IP ベース）+ honeypot を用意するべきだが、
 * 現状は最低限のバリデーション + ログ出力 + 「採用パイプラインの applied ステージに新規追加」する想定で
 * Supabase 設定済なら DB に書き込む。
 *
 * デモモード時は { ok: true, application_id: "demo-..." } を即返す。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  position_id: string;
  full_name: string;
  email: string;
  linkedin_url?: string;
  years_of_experience?: number;
  cover_letter?: string;
  casual_only?: boolean;
};

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  let body: Body;
  try { body = (await req.json()) as Body; }
  catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  // バリデーション
  if (!body.position_id) return badRequest("missing-position-id");
  if (!body.full_name || body.full_name.length < 1 || body.full_name.length > 100) {
    return badRequest("名前を入力してください（1-100 文字）");
  }
  if (!body.email || !isEmail(body.email)) {
    return badRequest("有効なメールアドレスを入力してください");
  }
  if (body.linkedin_url && !/^https?:\/\//.test(body.linkedin_url)) {
    return badRequest("LinkedIn URL は https:// で始まる形で入力してください");
  }
  if (body.years_of_experience !== undefined &&
      (body.years_of_experience < 0 || body.years_of_experience > 50)) {
    return badRequest("経験年数は 0-50 で入力してください");
  }
  if (body.cover_letter && body.cover_letter.length > 5000) {
    return badRequest("自己紹介は 5000 文字以内でお願いします");
  }

  // デモモード
  if (isDemoMode()) {
    const id = `demo-${Math.random().toString(36).slice(2, 10)}`;
    console.info("[careers/apply] demo received:", { id, ...body });
    return NextResponse.json({ ok: true, application_id: id });
  }

  // Supabase に書き込み（candidates テーブル想定）
  const sb = createServiceClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: "service-unavailable" }, { status: 503 });
  }

  const { data, error } = await sb
    .from("candidates")
    .insert({
      position_id: body.position_id,
      full_name: body.full_name,
      email: body.email,
      linkedin_url: body.linkedin_url ?? null,
      years_of_experience: body.years_of_experience ?? null,
      notes: body.cover_letter ?? null,
      stage: body.casual_only ? "applied" : "applied", // どちらも applied から始め、casual flag は tag に
      source: "direct",
      tags: body.casual_only ? ["カジュアル希望"] : [],
      applied_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[careers/apply] insert failed:", error);
    return NextResponse.json({ ok: false, error: "insert-failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, application_id: data?.id ?? "unknown" });
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}
