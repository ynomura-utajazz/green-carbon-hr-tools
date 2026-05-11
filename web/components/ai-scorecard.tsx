"use client";

/**
 * 構造化 AI スコアカード表示。
 *
 * AiGeneratePanel の Markdown 表示と違い、
 * `/api/ai/candidate-scorecard` の JSON レスポンスを直接 UI 化する。
 *
 * 表示要素：
 *   - 4 軸スコア（star bar）
 *   - 強み / 懸念 のカードリスト
 *   - 総合評価バッジ
 *   - rationale 1 文
 */

import { useState } from "react";
import {
  Sparkles, Loader2, RefreshCw, AlertCircle, CheckCircle2, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScorecardOutput } from "@/lib/ai/prompts";

type Props = {
  payload: () => unknown;
  onResult?: (s: ScorecardOutput) => void;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; scorecard: ScorecardOutput; demo?: boolean }
  | { kind: "error"; error: string };

const RATING_LABELS = {
  technical:     "技術力",
  communication: "コミュニケーション",
  culture_fit:   "カルチャーフィット",
  leadership:    "リーダーシップ",
} as const;

const REC_VARIANT: Record<ScorecardOutput["recommendation"], "success" | "warning" | "danger" | "outline"> = {
  "Strong Hire":    "success",
  "Hire":           "success",
  "No Hire":        "warning",
  "Strong No Hire": "danger",
};

export function AiScorecard({ payload, onResult }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const generate = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/ai/candidate-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const json = (await res.json()) as
        | { ok: true; scorecard: ScorecardOutput; demo?: boolean }
        | { ok: false; error: string };
      if (json.ok) {
        setState({ kind: "ok", scorecard: json.scorecard, demo: json.demo });
        onResult?.(json.scorecard);
      } else {
        setState({ kind: "error", error: json.error });
      }
    } catch (e) {
      setState({ kind: "error", error: (e as Error).message });
    }
  };

  return (
    <div className="rounded-md border border-gc-200 bg-gc-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-gc-700" />
          <span className="text-sm font-semibold">AI 構造化スコアカード</span>
          {state.kind === "ok" && state.demo && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              demo
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {state.kind === "idle" && (
            <Button onClick={() => void generate()} size="sm" className="h-7 gap-1 px-2 text-xs">
              <Sparkles className="size-3" />
              スコアカード生成
            </Button>
          )}
          {state.kind === "loading" && (
            <Button disabled size="sm" className="h-7 gap-1 px-2 text-xs">
              <Loader2 className="size-3 animate-spin" />
              生成中...
            </Button>
          )}
          {(state.kind === "ok" || state.kind === "error") && (
            <Button onClick={() => void generate()} variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
              <RefreshCw className="size-3" />
              再生成
            </Button>
          )}
        </div>
      </div>

      {state.kind === "loading" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}

      {state.kind === "ok" && (
        <div className="mt-3 space-y-3 rounded-md border bg-card p-3">
          {/* 総合評価 */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={REC_VARIANT[state.scorecard.recommendation]} className="text-xs">
              <CheckCircle2 className="mr-1 size-3" />
              {state.scorecard.recommendation}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {state.scorecard.rationale}
            </span>
          </div>

          {/* 4 軸スコア */}
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.entries(state.scorecard.ratings) as [keyof typeof RATING_LABELS, number][]).map(
              ([k, v]) => (
                <div key={k} className="rounded-md border bg-muted/30 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{RATING_LABELS[k]}</span>
                    <span className="font-mono text-xs tabular-nums">{v}/5</span>
                  </div>
                  <div className="mt-1.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "size-3.5",
                          n <= v
                            ? "fill-gc-500 text-gc-500"
                            : "fill-transparent text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>

          {/* 強み */}
          {state.scorecard.highlights.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                強み
              </h4>
              <ul className="space-y-1">
                {state.scorecard.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 懸念 */}
          {state.scorecard.concerns.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                懸念点
              </h4>
              <ul className="space-y-1">
                {state.scorecard.concerns.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <AlertCircle className="mt-0.5 size-3 shrink-0 text-amber-700" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <div>
            <div className="font-semibold">生成に失敗しました</div>
            <div className="mt-0.5 font-mono text-[11px]">{state.error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
