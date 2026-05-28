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

// API キー未設定時のフォールバック：メモ内容から簡易キーワード抽出
function demoExtract(notes: string): OneOnOneExtractOutput {
  const lower = notes.toLowerCase();
  const topics: string[] = [];

  // キーワードベースのトピック推定
  if (/(okr|目標|kpi|kgi)/.test(lower)) topics.push("OKR/目標");
  if (/(キャリア|転職|将来|昇進|昇格)/.test(lower)) topics.push("キャリア相談");
  if (/(成長|育成|スキルアップ|学習)/.test(lower)) topics.push("成長/育成");
  if (/(パフォ|成果|achievement)/.test(lower)) topics.push("パフォーマンス");
  if (/(評価|フィードバック|feedback)/.test(lower)) topics.push("評価/フィードバック");
  if (/(チーム|team|メンバー|協力)/.test(lower)) topics.push("チーム課題");
  if (/(業務量|残業|忙し|逼迫|負荷|キャパ)/.test(lower)) topics.push("業務量/負荷");
  if (/(メンタル|疲れ|ストレス|不安|ウェルビーイング)/.test(lower)) topics.push("メンタル/ウェルビーイング");
  if (/(人間関係|コミュニ|衝突|揉め)/.test(lower)) topics.push("人間関係");
  if (/(給与|報酬|salary|年収)/.test(lower)) topics.push("報酬/待遇");
  if (/(技術|スキル|tech|skill|学習|勉強)/.test(lower)) topics.push("技術/スキル");
  if (/(プロジェクト|project|案件)/.test(lower)) topics.push("プロジェクト");
  if (/(家族|プライベート|趣味|休暇)/.test(lower)) topics.push("プライベート");
  if (topics.length === 0) topics.push("その他");

  // 気分推定（簡易ヒューリスティック）
  let mood: OneOnOneExtractOutput["mood"] = null;
  if (/(嬉しい|楽しい|順調|良い|good|great|happy|喜び)/.test(lower)) mood = "good";
  else if (/(最高|完璧|excellent|awesome)/.test(lower)) mood = "great";
  else if (/(つらい|苦しい|不安|疲れ|ストレス|bad|sad|落ち込)/.test(lower)) mood = "down";
  else if (/(限界|無理|辞めたい|やばい|どん底)/.test(lower)) mood = "bad";
  else if (lower.length > 0) mood = "ok";

  // アクション項目簡易抽出
  const actions: OneOnOneExtractOutput["actions"] = [];
  const actionLines = notes
    .split(/[\n。]/)
    .map((l) => l.trim())
    .filter((l) => /(します|する|やる|お願い|確認|送付|作成|準備|連絡|次回|来週|今月中)/.test(l))
    .slice(0, 3);
  for (const line of actionLines) {
    const assignee: "self" | "manager" =
      /(私|自分|本人|メンバー)/.test(line) ? "self"
      : /(上司|マネージャー|manager)/.test(line) ? "manager"
      : "self";
    actions.push({ title: line.slice(0, 80), assignee, due_date: null });
  }

  // サマリ生成（フォールバックは短すぎる場合は出さない）
  let summary_oneliner = "";
  const cleaned = notes.replace(/\s+/g, " ").trim();
  if (cleaned.length >= 60) {
    // 60 字以上なら最初の文をサマリとして抽出
    const firstSentence = cleaned.match(/^[^。！？!?]+[。！？!?]/);
    if (firstSentence) {
      summary_oneliner = firstSentence[0].slice(0, 50);
    } else {
      summary_oneliner = cleaned.slice(0, 50) + "...";
    }
  }
  // < 60 字ならサマリ無し（メモと重複するため）

  return {
    topics: topics.slice(0, 5),
    mood,
    actions,
    summary_oneliner,
  };
}

export async function POST(req: Request) {
  let input: OneOnOneExtractInput;
  try { input = (await req.json()) as OneOnOneExtractInput; }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }

  if (!input.notes || input.notes.length < 10) {
    return NextResponse.json({ ok: false, error: "メモが短すぎます（10 字以上）" }, { status: 400 });
  }

  const demoOrUnconfigured = isDemoMode() || !isAnthropicConfigured();
  if (demoOrUnconfigured) {
    await new Promise((r) => setTimeout(r, 400));
    // メモ内容に基づくキーワード抽出（API キー未設定時のフォールバック）
    return NextResponse.json({ ok: true, output: demoExtract(input.notes), demo: true });
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
