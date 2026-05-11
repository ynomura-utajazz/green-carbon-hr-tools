"use client";

/**
 * AI 生成パネル：ボタン押下 → SSE ストリーミングで逐次表示する汎用 UI。
 *
 * 使い方：
 *   <AiGeneratePanel
 *     title="評価サマリ生成"
 *     endpoint="/api/ai/recruiting-summary"
 *     payload={() => candidateInput}
 *   />
 *
 * デフォルトはストリーミング（タイプライタ風）。stream={false} で一括表示。
 */

import { useRef, useState } from "react";
import { Sparkles, Loader2, Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  endpoint: string;
  payload: () => unknown;
  /** ボタンラベル。デフォルト「AI で生成」 */
  buttonLabel?: string;
  /** 生成中のヒント */
  hint?: string;
  /** 結果コールバック */
  onResult?: (text: string) => void;
  /** ストリーミング有効化（デフォルト true） */
  stream?: boolean;
  className?: string;
};

type State =
  | { kind: "idle" }
  | { kind: "streaming"; text: string }
  | { kind: "done"; text: string; demo?: boolean; usage?: { input: number; output: number } }
  | { kind: "error"; error: string };

export function AiGeneratePanel({
  title, endpoint, payload, buttonLabel, hint, onResult, stream = true, className,
}: Props) {
  const t = useT();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    if (!stream) {
      setState({ kind: "streaming", text: "" });
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
          signal: ac.signal,
        });
        const json = (await res.json()) as
          | { ok: true; text: string; demo?: boolean; usage?: { input: number; output: number } }
          | { ok: false; error: string };
        if (json.ok) {
          setState({ kind: "done", text: json.text, demo: json.demo, usage: json.usage });
          onResult?.(json.text);
        } else {
          setState({ kind: "error", error: json.error });
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setState({ kind: "error", error: (e as Error).message });
        }
      }
      return;
    }

    // ── ストリーミング ───────────────────────
    setState({ kind: "streaming", text: "" });
    try {
      const res = await fetch(`${endpoint}?stream=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        // 429 等は JSON で error メッセージが入っているのでそれを見せる
        let errMsg = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) errMsg = j.error;
        } catch { /* not JSON, keep status */ }
        setState({ kind: "error", error: errMsg });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let demo = false;
      let usage: { input: number; output: number } | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const ev of events) {
          const dataLine = ev.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const j = JSON.parse(dataLine.slice("data: ".length).trim()) as {
              text?: string;
              done?: boolean;
              demo?: boolean;
              usage?: { input: number; output: number };
              error?: string;
            };
            if (j.error) {
              setState({ kind: "error", error: j.error });
              return;
            }
            if (j.text) {
              accumulated += j.text;
              setState({ kind: "streaming", text: accumulated });
            }
            if (j.done) {
              demo = Boolean(j.demo);
              usage = j.usage;
            }
          } catch {
            /* ignore bad event */
          }
        }
      }

      setState({ kind: "done", text: accumulated, demo, usage });
      onResult?.(accumulated);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setState({ kind: "error", error: (e as Error).message });
      }
    }
  };

  const copy = async () => {
    if (state.kind !== "done") return;
    try {
      await navigator.clipboard.writeText(state.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("コピーしました");
    } catch {
      toast.error("コピー失敗");
    }
  };

  const isStreaming = state.kind === "streaming";
  const isDone = state.kind === "done";
  const isError = state.kind === "error";

  const visibleText =
    state.kind === "streaming" || state.kind === "done" ? state.text : "";

  return (
    <div className={cn("rounded-md border border-gc-200 bg-gc-50/40 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-gc-700" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isDone && state.demo && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              demo
            </span>
          )}
          {isDone && state.usage && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {state.usage.input}+{state.usage.output} tok
            </span>
          )}
          {state.kind === "idle" && (
            <Button onClick={() => void generate()} size="sm" className="h-7 gap-1 px-2 text-xs">
              <Sparkles className="size-3" />
              {buttonLabel ?? t("ai.generate")}
            </Button>
          )}
          {isStreaming && (
            <Button
              onClick={() => abortRef.current?.abort()}
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
            >
              <Loader2 className="size-3 animate-spin" />
              {t("ai.generating")}
            </Button>
          )}
          {(isDone || isError) && (
            <>
              <Button onClick={() => void generate()} variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                <RefreshCw className="size-3" />
                {t("ai.regenerate")}
              </Button>
              {isDone && (
                <Button onClick={() => void copy()} variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                  {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  {copied ? t("ai.copied") : t("ai.copy")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {hint && state.kind === "idle" && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
      )}

      {(isStreaming || isDone) && visibleText && (
        <div className="mt-3 rounded-md border bg-card p-3">
          <Markdown source={visibleText} className="text-sm" />
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-gc-600 align-middle"
              aria-hidden
            />
          )}
        </div>
      )}

      {isStreaming && !visibleText && (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${100 - i * 12}%` }} />
          ))}
        </div>
      )}

      {isError && (
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
