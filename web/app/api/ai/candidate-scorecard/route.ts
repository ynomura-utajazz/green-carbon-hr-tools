/**
 * POST /api/ai/candidate-scorecard
 *
 * Body: CandidateInput
 * 戻り：{ ok: true, scorecard: ScorecardOutput, demo?: boolean, usage?: ... } | { ok: false, error: string }
 *
 * Markdown ではなく **構造化 JSON** を返す唯一のルート。
 * UI 側はこれをフォーム自動入力やバッジ表示にそのまま使える。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { generate, isAnthropicConfigured } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-log";
import { checkRateLimit, rateLimitMessage } from "@/lib/ai/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  buildScorecardPrompt,
  DEMO_SCORECARD,
  type CandidateInput,
  type ScorecardOutput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isScorecard(v: unknown): v is ScorecardOutput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!o.ratings || typeof o.ratings !== "object") return false;
  const r = o.ratings as Record<string, unknown>;
  if (!["technical", "communication", "culture_fit", "leadership"].every(
    (k) => typeof r[k] === "number" && (r[k] as number) >= 0 && (r[k] as number) <= 5,
  )) return false;
  if (!Array.isArray(o.highlights)) return false;
  if (!Array.isArray(o.concerns)) return false;
  if (typeof o.recommendation !== "string") return false;
  if (!["Strong Hire", "Hire", "No Hire", "Strong No Hire"].includes(o.recommendation)) return false;
  if (typeof o.rationale !== "string") return false;
  return true;
}

/** モデル応答からコードフェンス等を取り除いて JSON だけ抽出 */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

export async function POST(req: Request) {
  let input: CandidateInput;
  try {
    input = (await req.json()) as CandidateInput;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  if (!input.name || !input.position || !input.interviewNotes) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const t0 = Date.now();
  const demoOrUnconfigured = isDemoMode() || !isAnthropicConfigured();
  const userId = demoOrUnconfigured ? null : await getCurrentUserId();

  // レート制限
  if (!demoOrUnconfigured) {
    const limit = await checkRateLimit(userId, "candidate-scorecard");
    if (!limit.ok) {
      return NextResponse.json(
        { ok: false, error: rateLimitMessage(limit) },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }
  }

  // デモ
  if (demoOrUnconfigured) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ ok: true, scorecard: DEMO_SCORECARD, demo: true });
  }

  // 実 API
  const { system, user } = buildScorecardPrompt(input);
  const r = await generate({
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: 800,
    temperature: 0.2, // 構造化 → 低めに
  });

  if (!r.ok) {
    void logUsage({
      useCase: "candidate-scorecard",
      inputTokens: 0, outputTokens: 0, userId,
      status: "error", errorMessage: r.error,
      durationMs: Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  }

  // パース
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(r.text));
  } catch {
    void logUsage({
      useCase: "candidate-scorecard",
      inputTokens: r.inputTokens, outputTokens: r.outputTokens, userId,
      status: "error", errorMessage: "invalid-json-from-model",
      durationMs: Date.now() - t0,
    });
    return NextResponse.json(
      { ok: false, error: "AI 応答が JSON として解釈できませんでした", raw: r.text },
      { status: 502 },
    );
  }

  if (!isScorecard(parsed)) {
    void logUsage({
      useCase: "candidate-scorecard",
      inputTokens: r.inputTokens, outputTokens: r.outputTokens, userId,
      status: "error", errorMessage: "schema-mismatch",
      durationMs: Date.now() - t0,
    });
    return NextResponse.json(
      { ok: false, error: "AI 応答がスキーマに合致しませんでした", raw: parsed },
      { status: 502 },
    );
  }

  void logUsage({
    useCase: "candidate-scorecard",
    inputTokens: r.inputTokens, outputTokens: r.outputTokens, userId,
    status: "ok",
    durationMs: Date.now() - t0,
  });

  return NextResponse.json({
    ok: true,
    scorecard: parsed,
    usage: { input: r.inputTokens, output: r.outputTokens },
  });
}
