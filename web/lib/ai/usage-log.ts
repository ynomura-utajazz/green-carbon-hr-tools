/**
 * AI 利用ログ書き込み + コスト推定。
 *
 * Supabase 未設定なら no-op（fire-and-forget なのでアプリ動作に影響なし）。
 *
 * 価格は Anthropic の公開料金を $/1M tokens 単位で持つ。
 * 為替は固定 150 JPY/USD で近似（厳密性は不要、概算用途）。
 */

import { createServiceClient } from "@/lib/supabase/admin";

export type UseCase =
  | "recruiting-summary"
  | "oneonone-summary"
  | "retention-narrative"
  | "dashboard-narrative"
  | "candidate-scorecard"
  | "hiring-strategy"
  | "jd-generator"
  | "channel-post"
  | "interview-briefing"
  | "interview-question-suggest"
  | "talent-reactivate"
  | "onboarding-plan"
  | "ai-coaching"
  | "action-extraction";

// 1M トークンあたりのドル単価（2026 年 5 月時点の概算）
const PRICE_PER_M_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5":  { input: 1.0, output: 5.0 },
  "claude-opus-4-8":   { input: 5.0, output: 25.0 },
};

const JPY_PER_USD = 150;

export type CostEstimate = {
  usd: number;
  jpy: number;
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): CostEstimate {
  const price = PRICE_PER_M_TOKENS[model] ?? PRICE_PER_M_TOKENS["claude-sonnet-4-5"];
  const usd = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  return { usd, jpy: usd * JPY_PER_USD };
}

export type LogUsageInput = {
  useCase: UseCase;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  userId?: string | null;
  status: "ok" | "error";
  errorMessage?: string;
  durationMs?: number;
};

/**
 * fire-and-forget で利用ログを記録。
 * 失敗しても呼び出し元に影響しない（catch して握りつぶす）。
 */
export async function logUsage(input: LogUsageInput): Promise<void> {
  const sb = createServiceClient();
  if (!sb) return;
  try {
    await sb.from("ai_usage_log").insert({
      use_case: input.useCase,
      model: input.model ?? "claude-sonnet-4-5",
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      user_id: input.userId ?? null,
      status: input.status,
      error_message: input.errorMessage ?? null,
      duration_ms: input.durationMs ?? null,
    });
  } catch (e) {
    console.warn("[ai-usage] failed to log", e);
  }
}

// ── 集計（/admin/ai-usage で使用）────────────────────────

export type DailyAggregate = {
  day: string;          // YYYY-MM-DD
  count: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type UseCaseAggregate = {
  useCase: UseCase | string;
  count: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  errorCount: number;
};

/** 直近 N 日の日次集計。 */
export async function getDailyUsage(days = 30): Promise<DailyAggregate[]> {
  const sb = createServiceClient();
  if (!sb) return [];

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await sb
    .from("ai_usage_log")
    .select("created_at, model, input_tokens, output_tokens, status")
    .gte("created_at", since);
  if (error || !data) return [];

  const byDay = new Map<string, DailyAggregate>();
  for (const row of data as {
    created_at: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    status: string;
  }[]) {
    if (row.status !== "ok") continue;
    const day = row.created_at.slice(0, 10);
    const cur = byDay.get(day) ?? {
      day, count: 0, inputTokens: 0, outputTokens: 0, costUsd: 0,
    };
    cur.count += 1;
    cur.inputTokens += row.input_tokens;
    cur.outputTokens += row.output_tokens;
    cur.costUsd += estimateCost(row.model, row.input_tokens, row.output_tokens).usd;
    byDay.set(day, cur);
  }

  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** ユースケース別集計（直近 N 日）。 */
export async function getUseCaseUsage(days = 30): Promise<UseCaseAggregate[]> {
  const sb = createServiceClient();
  if (!sb) return [];

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await sb
    .from("ai_usage_log")
    .select("use_case, model, input_tokens, output_tokens, status")
    .gte("created_at", since);
  if (!data) return [];

  const byUc = new Map<string, UseCaseAggregate>();
  for (const row of data as {
    use_case: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    status: string;
  }[]) {
    const cur = byUc.get(row.use_case) ?? {
      useCase: row.use_case, count: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, errorCount: 0,
    };
    if (row.status === "ok") {
      cur.count += 1;
      cur.inputTokens += row.input_tokens;
      cur.outputTokens += row.output_tokens;
      cur.costUsd += estimateCost(row.model, row.input_tokens, row.output_tokens).usd;
    } else {
      cur.errorCount += 1;
    }
    byUc.set(row.use_case, cur);
  }

  return [...byUc.values()].sort((a, b) => b.costUsd - a.costUsd);
}
