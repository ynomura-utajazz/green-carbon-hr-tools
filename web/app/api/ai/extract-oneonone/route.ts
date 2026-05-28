/**
 * POST /api/ai/extract-oneonone
 *
 * 1on1 議事メモ → トピック / 気分 / アクション項目を構造化抽出。
 * Anthropic 未設定時はデモ応答を返す。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { generate, isAnthropicConfigured } from "@/lib/ai/anthropic";
import {
  buildOneOnOneExtractPrompt,
  type OneOnOneExtractInput,
  type OneOnOneExtractOutput,
} from "@/lib/ai/prompts";
import { ONEONONE_TOPIC_TAGS, normalizeTopic, isStandardTopic } from "@/lib/oneonone-topics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MOODS = new Set(["great", "good", "ok", "down", "bad"]);
const VALID_ASSIGNEES = new Set(["self", "manager", "other"]);

function isOutput(v: unknown): v is OneOnOneExtractOutput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.topics)) return false;
  if (o.mood !== null && (typeof o.mood !== "string" || !VALID_MOODS.has(o.mood as string))) return false;
  if (!Array.isArray(o.actions)) return false;
  if (typeof o.summary_oneliner !== "string") return false;
  for (const a of o.actions) {
    if (!a || typeof a !== "object") return false;
    const ax = a as Record<string, unknown>;
    if (typeof ax.title !== "string") return false;
    if (typeof ax.assignee !== "string" || !VALID_ASSIGNEES.has(ax.assignee as string)) return false;
    if (ax.due_date !== null && typeof ax.due_date !== "string") return false;
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

const DEMO_OUTPUT: OneOnOneExtractOutput = {
  topics: ["OKR/目標", "業務量/負荷"],
  mood: "good",
  actions: [
    { title: "Q2 OKR のドラフトを来週までに送付", assignee: "self", due_date: null },
    { title: "業務分担見直しの提案を作成", assignee: "manager", due_date: null },
  ],
  summary_oneliner: "Q2 OKR の進捗確認 + チーム業務量の負荷感を相談",
};

export async function POST(req: Request) {
  let input: OneOnOneExtractInput;
  try { input = (await req.json()) as OneOnOneExtractInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!input.notes || input.notes.length < 10) {
    return NextResponse.json({ ok: false, error: "メモが短すぎます（10 字以上）" }, { status: 400 });
  }

  const demoOrUnconfigured = isDemoMode() || !isAnthropicConfigured();
  if (demoOrUnconfigured) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: true, output: DEMO_OUTPUT, demo: true });
  }

  const { system, user } = buildOneOnOneExtractPrompt(input);
  const r = await generate({
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: 1200,
    temperature: 0.2,
  });
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  }

  let parsed: unknown;
  try { parsed = JSON.parse(extractJson(r.text)); }
  catch {
    return NextResponse.json({ ok: false, error: "AI 応答を JSON に解釈できませんでした" }, { status: 502 });
  }
  if (!isOutput(parsed)) {
    return NextResponse.json({ ok: false, error: "AI 応答がスキーマと一致しませんでした" }, { status: 502 });
  }

  // トピックを標準タグに正規化（誤って独自タグを返した場合のセーフネット）
  const normalizedTopics = parsed.topics
    .map((t) => (isStandardTopic(t) ? t : normalizeTopic(t)))
    .filter((t) => isStandardTopic(t) || t === "その他")
    .slice(0, 5);
  if (normalizedTopics.length === 0) normalizedTopics.push("その他");

  // 出力の topics を上書き
  const cleaned: OneOnOneExtractOutput = {
    ...parsed,
    topics: normalizedTopics.length > 0 ? normalizedTopics : [ONEONONE_TOPIC_TAGS[ONEONONE_TOPIC_TAGS.length - 1]],
  };

  return NextResponse.json({
    ok: true,
    output: cleaned,
    usage: { input: r.inputTokens, output: r.outputTokens },
  });
}
