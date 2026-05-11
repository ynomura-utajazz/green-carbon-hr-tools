/**
 * POST /api/ai/interview-question-suggest
 *
 * Body: LiveQuestionInput
 * 戻り：{ ok: true, output: LiveQuestionOutput, demo?: boolean }
 *      | { ok: false, error: string }
 *
 * 構造化 JSON を返す。スクリーンを切り替えずに次の質問が出るので低レイテンシ重視。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { generate, isAnthropicConfigured } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-log";
import { checkRateLimit, rateLimitMessage } from "@/lib/ai/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  buildLiveQuestionPrompt,
  DEMO_LIVE_QUESTIONS,
  type LiveQuestionInput,
  type LiveQuestionOutput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["open", "behavioral", "technical", "scenario"]);

function isLiveQuestionOutput(v: unknown): v is LiveQuestionOutput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.suggestions)) return false;
  for (const s of o.suggestions) {
    if (!s || typeof s !== "object") return false;
    const sx = s as Record<string, unknown>;
    if (typeof sx.competency !== "string") return false;
    if (typeof sx.question !== "string") return false;
    if (typeof sx.rationale !== "string") return false;
    if (typeof sx.type !== "string" || !VALID_TYPES.has(sx.type)) return false;
  }
  if (typeof o.time_advice !== "string") return false;
  return true;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) return text.slice(first, last + 1);
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
  let input: LiveQuestionInput;
  try { input = (await req.json()) as LiveQuestionInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!input.candidate_name || !input.position_title) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const t0 = Date.now();
  const demoOrUnconfigured = isDemoMode() || !isAnthropicConfigured();
  const userId = demoOrUnconfigured ? null : await getCurrentUserId();

  // レート制限
  if (!demoOrUnconfigured) {
    const limit = await checkRateLimit(userId, "interview-question-suggest");
    if (!limit.ok) {
      return NextResponse.json(
        { ok: false, error: rateLimitMessage(limit) },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }
  }

  // デモ
  if (demoOrUnconfigured) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: true, output: DEMO_LIVE_QUESTIONS, demo: true });
  }

  const { system, user } = buildLiveQuestionPrompt(input);
  const r = await generate({
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: 600,
    temperature: 0.5,
  });

  if (!r.ok) {
    void logUsage({
      useCase: "interview-question-suggest",
      inputTokens: 0, outputTokens: 0, userId,
      status: "error", errorMessage: r.error,
      durationMs: Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  }

  let parsed: unknown;
  try { parsed = JSON.parse(extractJson(r.text)); }
  catch {
    void logUsage({
      useCase: "interview-question-suggest",
      inputTokens: r.inputTokens, outputTokens: r.outputTokens, userId,
      status: "error", errorMessage: "invalid-json",
      durationMs: Date.now() - t0,
    });
    return NextResponse.json(
      { ok: false, error: "AI 応答が JSON として解釈できませんでした", raw: r.text },
      { status: 502 },
    );
  }

  if (!isLiveQuestionOutput(parsed)) {
    void logUsage({
      useCase: "interview-question-suggest",
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
    useCase: "interview-question-suggest",
    inputTokens: r.inputTokens, outputTokens: r.outputTokens, userId,
    status: "ok", durationMs: Date.now() - t0,
  });

  return NextResponse.json({
    ok: true,
    output: parsed,
    usage: { input: r.inputTokens, output: r.outputTokens },
  });
}
