/**
 * POST /api/ai/transcribe
 *
 * 音声 → テキスト書き起こし。
 *
 * 入力：multipart/form-data
 *   - audio: Blob (webm / mp3 / wav / m4a 等、25MB まで)
 *   - language: optional (例: "ja"、未指定で自動検出)
 *
 * 出力：{ ok: true, text: string, language?: string, duration?: number }
 *
 * バックエンド：OpenAI Whisper API（whisper-1）
 *  - env: OPENAI_API_KEY 必須
 *  - 未設定 / デモモード時はモック返却
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { logUsage } from "@/lib/ai/usage-log";
import { checkRateLimit, rateLimitMessage } from "@/lib/ai/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_TRANSCRIPT = `2026 年 5 月 12 日、藤本さんとの 1on1。
来期は技術深耕で行きたいとのこと。OKR は CO2 計算エンジンのリファクタリングを KR に据えたい意向。
ドラフトは来週金曜までに藤本さんが作成。
マネジメント志向は弱い。テックリードロールの定義を僕が次回 1on1 までに明文化する。
Rust 勉強会を社内で開きたいとのこと。塚本さんに告知サポートをお願いする。
副業について、別途相談したい点があるので次回 1on1 まで本人が考えておく。`;

const MAX_BYTES = 25 * 1024 * 1024;

async function getCurrentUserId(): Promise<string | null> {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

export async function POST(req: Request) {
  // multipart 受信
  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ ok: false, error: "invalid-form-data" }, { status: 400 }); }

  const audio = form.get("audio");
  const language = (form.get("language") as string | null) ?? undefined;

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "audio file is required" }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ ok: false, error: "empty-audio" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: `audio too large (max 25MB)` }, { status: 413 });
  }

  const t0 = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  const demoOrUnconfigured = isDemoMode() || !apiKey;
  const userId = demoOrUnconfigured ? null : await getCurrentUserId();

  // レート制限（action-extraction と同じバケットで）
  if (!demoOrUnconfigured) {
    const limit = await checkRateLimit(userId, "action-extraction");
    if (!limit.ok) {
      return NextResponse.json(
        { ok: false, error: rateLimitMessage(limit) },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }
  }

  // デモモード
  if (demoOrUnconfigured) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({
      ok: true,
      text: DEMO_TRANSCRIPT,
      language: "ja",
      duration: Math.round(audio.size / 16000), // 擬似（16kbps 想定）
      demo: true,
    });
  }

  // OpenAI Whisper API へリレー
  try {
    const upstream = new FormData();
    upstream.append("file", audio, "audio.webm");
    upstream.append("model", "whisper-1");
    if (language) upstream.append("language", language);
    upstream.append("response_format", "verbose_json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    if (!res.ok) {
      const txt = await res.text();
      void logUsage({
        useCase: "action-extraction", inputTokens: 0, outputTokens: 0, userId,
        status: "error", errorMessage: `whisper-${res.status}`, durationMs: Date.now() - t0,
      });
      return NextResponse.json({ ok: false, error: `Whisper API ${res.status}: ${txt.slice(0, 200)}` }, { status: 502 });
    }

    const data = (await res.json()) as { text: string; language?: string; duration?: number };

    void logUsage({
      useCase: "action-extraction",
      inputTokens: Math.round((data.duration ?? 0) * 60), // 秒数を擬似トークン換算
      outputTokens: Math.ceil((data.text?.length ?? 0) / 4),
      userId, status: "ok", durationMs: Date.now() - t0,
    });

    return NextResponse.json({
      ok: true,
      text: data.text,
      language: data.language,
      duration: data.duration,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
