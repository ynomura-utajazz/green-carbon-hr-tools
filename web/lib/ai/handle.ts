/**
 * AI ルートの共通ハンドラ。
 * 各ルートは prompt builder と demo response を渡すだけで、
 * stream / 非 stream / demo フォールバックの全パスが同じ挙動になる。
 */

import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mock-data";
import { generate, generateStream, isAnthropicConfigured } from "./anthropic";
import { createSseStream, createDemoStream } from "./stream";
import { logUsage, type UseCase } from "./usage-log";
import { checkRateLimit, rateLimitMessage } from "./rate-limit";
import { createClient } from "@/lib/supabase/server";

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export type HandleAiOpts = {
  req: Request;
  prompt: { system: string; user: string };
  demoText: string;
  maxTokens?: number;
  temperature?: number;
  /** 利用ログ用のユースケース識別子（Phase 5 ②） */
  useCase: UseCase;
};

async function getCurrentUserId(): Promise<string | null> {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function handleAi(opts: HandleAiOpts): Promise<Response> {
  const url = new URL(opts.req.url);
  const wantStream = url.searchParams.get("stream") === "1";
  const demoOrUnconfigured = isDemoMode() || !isAnthropicConfigured();
  const t0 = Date.now();
  const userId = demoOrUnconfigured ? null : await getCurrentUserId();

  // ── レート制限チェック（demo / 未設定時はスキップ） ─────────
  if (!demoOrUnconfigured) {
    const limit = await checkRateLimit(userId, opts.useCase);
    if (!limit.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: rateLimitMessage(limit),
          rateLimit: {
            reason: limit.reason,
            limit: limit.limit,
            current: limit.currentCount,
            retryAfterSec: limit.retryAfterSec,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        },
      );
    }
  }

  // ── ストリーミング ───────────────────────
  if (wantStream) {
    if (demoOrUnconfigured) {
      return new Response(createDemoStream(opts.demoText), { headers: SSE_HEADERS });
    }
    const upstream = await generateStream({
      system: opts.prompt.system,
      messages: [{ role: "user", content: opts.prompt.user }],
      maxTokens: opts.maxTokens ?? 1200,
      temperature: opts.temperature ?? 0.4,
    });
    if (!upstream) {
      void logUsage({
        useCase: opts.useCase,
        inputTokens: 0,
        outputTokens: 0,
        userId,
        status: "error",
        errorMessage: "stream-failed",
        durationMs: Date.now() - t0,
      });
      return NextResponse.json({ ok: false, error: "stream-failed" }, { status: 502 });
    }
    // ストリーム終了時は upstream 側で usage が来るが、route 内では取れない。
    // 別途 stream.ts でカウントしているので、ここでは「成功した」だけ記録。
    // 厳密なトークン計測のためには SSE をパススルーしながら集計する必要があるが、
    // 簡略化のため最終 done イベントの値はクライアント側で受信。サーバ側は概算を記録。
    void logUsage({
      useCase: opts.useCase,
      inputTokens: estimateInputTokens(opts.prompt),
      outputTokens: 0, // 実数はクライアント受信時。サーバ側集計は input 側のみ。
      userId,
      status: "ok",
      durationMs: Date.now() - t0,
    });
    return new Response(createSseStream(upstream), { headers: SSE_HEADERS });
  }

  // ── 非ストリーミング（JSON）──────────────
  if (demoOrUnconfigured) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ ok: true, text: opts.demoText, demo: true });
  }

  const r = await generate({
    system: opts.prompt.system,
    messages: [{ role: "user", content: opts.prompt.user }],
    maxTokens: opts.maxTokens ?? 1200,
    temperature: opts.temperature ?? 0.4,
  });

  if (!r.ok) {
    void logUsage({
      useCase: opts.useCase,
      inputTokens: 0, outputTokens: 0, userId,
      status: "error", errorMessage: r.error,
      durationMs: Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  }

  void logUsage({
    useCase: opts.useCase,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    userId,
    status: "ok",
    durationMs: Date.now() - t0,
  });

  return NextResponse.json({
    ok: true,
    text: r.text,
    usage: { input: r.inputTokens, output: r.outputTokens },
  });
}

/** プロンプト長から input トークン数を粗く推定（4 文字 ≈ 1 token）。
 *  正確な値は API レスポンスでしか取れないが、ストリーミング時の
 *  サーバ側ログ用にざっくり値が欲しい場合に使う。 */
function estimateInputTokens(prompt: { system: string; user: string }): number {
  return Math.ceil((prompt.system.length + prompt.user.length) / 4);
}
