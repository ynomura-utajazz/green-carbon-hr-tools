/**
 * GET /api/cron/keepalive
 *
 * Supabase 無料プランは 7 日間 DB リクエストが無いと自動一時停止する。
 * Vercel Cron から毎日呼び出して軽量な SELECT を発行し、
 * 非アクティブ判定をリセットする（プロジェクトを稼働状態に保つ）。
 *
 * - 認証不要（Vercel Cron からのみ呼ばれる想定だが、叩かれても実害なし）
 * - service role で organizations を 1 行だけ読む（最小コストの実 DB クエリ）
 * - Supabase 未設定時は no-op で 200 を返す
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ ok: true, skipped: "no-service-client" });
  }

  const startedAt = Date.now();
  const { error } = await admin
    .from("organizations")
    .select("id")
    .limit(1);

  const durationMs = Date.now() - startedAt;

  if (error) {
    // クエリ失敗（プロジェクト停止中・接続不可など）でも 200 で返す
    // → Vercel Cron のリトライ暴発を防ぐ。ログには残る。
    console.error("[keepalive] query failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message, durationMs }, { status: 200 });
  }

  return NextResponse.json({ ok: true, durationMs, at: new Date().toISOString() });
}
