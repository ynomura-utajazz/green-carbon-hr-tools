/**
 * POST /api/ai/extract-actions
 * Body: ActionExtractionInput
 * 戻り：{ ok: true, output: ActionExtractionOutput, demo?: boolean }
 *      | { ok: false, error: string }
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { generate, isAnthropicConfigured } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-log";
import { checkRateLimit, rateLimitMessage } from "@/lib/ai/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  buildActionExtractionPrompt,
  type ActionExtractionInput,
  type ActionExtractionOutput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set(["follow_up", "decision", "research", "deliverable", "intro", "other"]);
const VALID_DESTINATIONS = new Set(["oneonone", "okr", "hr_helpdesk", "recruiting", "general_task"]);

function isExtractionOutput(v: unknown): v is ActionExtractionOutput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.actions)) return false;
  if (typeof o.summary_oneliner !== "string") return false;
  for (const a of o.actions) {
    if (!a || typeof a !== "object") return false;
    const ax = a as Record<string, unknown>;
    if (typeof ax.assignee !== "string") return false;
    if (typeof ax.title !== "string") return false;
    if (ax.due_date !== null && typeof ax.due_date !== "string") return false;
    if (typeof ax.category !== "string" || !VALID_CATEGORIES.has(ax.category)) return false;
    if (typeof ax.suggested_destination !== "string" || !VALID_DESTINATIONS.has(ax.suggested_destination)) return false;
    if (typeof ax.confidence !== "number") return false;
  }
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

const DEMO_OUTPUT: ActionExtractionOutput = {
  actions: [
    { assignee: "藤本 渉",   title: "OKR ドラフトを作成", due_date: null, category: "deliverable", suggested_destination: "okr", confidence: 0.92 },
    { assignee: "高橋 真由", title: "テックリードロールの定義を明文化", due_date: null, category: "deliverable", suggested_destination: "oneonone", confidence: 0.88 },
    { assignee: "塚本 真純", title: "Rust 勉強会の社内告知をサポート", due_date: null, category: "follow_up", suggested_destination: "hr_helpdesk", confidence: 0.78 },
    { assignee: "藤本 渉",   title: "次回 1on1 までに副業希望を整理", due_date: null, category: "follow_up", suggested_destination: "oneonone", confidence: 0.75 },
  ],
  summary_oneliner: "藤本さん：来期 OKR の方向性整理 + テックリードへのキャリアパス検討",
};

async function getCurrentUserId(): Promise<string | null> {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

export async function POST(req: Request) {
  let input: ActionExtractionInput;
  try { input = (await req.json()) as ActionExtractionInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!input.notes || input.notes.length < 10) {
    return NextResponse.json({ ok: false, error: "議事録テキストが短すぎます（10 字以上）" }, { status: 400 });
  }

  const t0 = Date.now();
  const demoOrUnconfigured = isDemoMode() || !isAnthropicConfigured();
  const userId = demoOrUnconfigured ? null : await getCurrentUserId();

  if (!demoOrUnconfigured) {
    const limit = await checkRateLimit(userId, "action-extraction");
    if (!limit.ok) {
      return NextResponse.json(
        { ok: false, error: rateLimitMessage(limit) },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }
  }

  if (demoOrUnconfigured) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ ok: true, output: DEMO_OUTPUT, demo: true });
  }

  const { system, user } = buildActionExtractionPrompt(input);
  const r = await generate({
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: 1500,
    temperature: 0.2,
  });

  if (!r.ok) {
    void logUsage({
      useCase: "action-extraction", inputTokens: 0, outputTokens: 0, userId,
      status: "error", errorMessage: r.error, durationMs: Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  }

  let parsed: unknown;
  try { parsed = JSON.parse(extractJson(r.text)); }
  catch {
    void logUsage({
      useCase: "action-extraction", inputTokens: r.inputTokens, outputTokens: r.outputTokens, userId,
      status: "error", errorMessage: "invalid-json", durationMs: Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: "AI 応答を JSON に解釈できませんでした" }, { status: 502 });
  }
  if (!isExtractionOutput(parsed)) {
    void logUsage({
      useCase: "action-extraction", inputTokens: r.inputTokens, outputTokens: r.outputTokens, userId,
      status: "error", errorMessage: "schema-mismatch", durationMs: Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: "AI 応答がスキーマと一致しませんでした" }, { status: 502 });
  }

  void logUsage({
    useCase: "action-extraction", inputTokens: r.inputTokens, outputTokens: r.outputTokens, userId,
    status: "ok", durationMs: Date.now() - t0,
  });

  return NextResponse.json({ ok: true, output: parsed, usage: { input: r.inputTokens, output: r.outputTokens } });
}
