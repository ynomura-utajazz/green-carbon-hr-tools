/**
 * AI 呼び出しのレート制限。
 *
 * 設計：
 *   - ストレージは ai_usage_log テーブルを兼用（直近 N 分の件数を SELECT count）
 *     → 別テーブル不要、サーバレスでもインスタンス間で一貫
 *   - 制限は (userId or "anon") × useCase の組み合わせ
 *   - 制限値は env で上書き可能（本番デフォルトは保守的）
 *
 * 制限ポリシー（デフォルト）：
 *   - 1 ユーザー × 1 ユースケース あたり：1分20件 / 1時間100件 / 1日500件
 *   - グローバル：1日 5000 件（コスト暴走の最終防衛線）
 */

import { createServiceClient } from "@/lib/supabase/admin";
import type { UseCase } from "./usage-log";

export type RateLimitWindow = {
  windowMs: number;
  max: number;
};

export type RateLimitConfig = {
  perUser: RateLimitWindow[];
  global: RateLimitWindow[];
};

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function getConfig(): RateLimitConfig {
  return {
    perUser: [
      { windowMs: 60 * 1000,         max: num("AI_LIMIT_PER_USER_MIN",  20) },
      { windowMs: 60 * 60 * 1000,    max: num("AI_LIMIT_PER_USER_HOUR", 100) },
      { windowMs: 24 * 60 * 60_000,  max: num("AI_LIMIT_PER_USER_DAY",  500) },
    ],
    global: [
      { windowMs: 24 * 60 * 60_000,  max: num("AI_LIMIT_GLOBAL_DAY", 5000) },
    ],
  };
}

export type RateLimitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "per-user-minute" | "per-user-hour" | "per-user-day" | "global-day";
      retryAfterSec: number;
      currentCount: number;
      limit: number;
    };

/** 直近 windowMs の件数を取得（status=ok のみ）。 */
async function countRecent(
  userId: string | null,
  useCase: UseCase | null,
  windowMs: number,
): Promise<number> {
  const sb = createServiceClient();
  if (!sb) return 0; // Supabase なし → 制限なし扱い（demo / ローカル）

  const since = new Date(Date.now() - windowMs).toISOString();
  let q = sb
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .eq("status", "ok");

  if (userId) q = q.eq("user_id", userId);
  if (useCase) q = q.eq("use_case", useCase);

  const { count } = await q;
  return count ?? 0;
}

/**
 * 制限チェック。違反していたら最初に当たった違反窓を返す。
 * Supabase 未設定時は常に { ok: true }（demo / ローカル運用）。
 */
export async function checkRateLimit(
  userId: string | null,
  useCase: UseCase,
): Promise<RateLimitResult> {
  const cfg = getConfig();

  // ── Per-user チェック ───────────────────
  if (userId) {
    const labels = ["per-user-minute", "per-user-hour", "per-user-day"] as const;
    for (let i = 0; i < cfg.perUser.length; i++) {
      const w = cfg.perUser[i];
      const c = await countRecent(userId, useCase, w.windowMs);
      if (c >= w.max) {
        return {
          ok: false,
          reason: labels[i],
          retryAfterSec: Math.ceil(w.windowMs / 1000),
          currentCount: c,
          limit: w.max,
        };
      }
    }
  }

  // ── グローバル ─────────────────────────
  for (const w of cfg.global) {
    const c = await countRecent(null, null, w.windowMs);
    if (c >= w.max) {
      return {
        ok: false,
        reason: "global-day",
        retryAfterSec: Math.ceil(w.windowMs / 1000),
        currentCount: c,
        limit: w.max,
      };
    }
  }

  return { ok: true };
}

export function rateLimitMessage(r: Exclude<RateLimitResult, { ok: true }>): string {
  switch (r.reason) {
    case "per-user-minute":
      return `1分あたりの上限（${r.limit}回）を超えました。少し待ってから再度お試しください。`;
    case "per-user-hour":
      return `1時間あたりの上限（${r.limit}回）に到達しました。`;
    case "per-user-day":
      return `1日あたりの上限（${r.limit}回）に到達しました。明日になればリセットされます。`;
    case "global-day":
      return "本日の全社合計上限に達しました。HR 管理者にお問い合わせください。";
  }
}
