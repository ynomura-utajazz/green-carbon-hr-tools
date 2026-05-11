"use client";

/**
 * /admin/ai-agents
 *
 * AI エージェントの起動 + 実行履歴。
 *  - 5 種のタスクテンプレート（候補者リサーチ・面接調整・ブリーフィング配信・入社者セットアップ・データ品質チェック）
 *  - 各実行のステップトラッキング
 *  - 承認待ちステップへの対応
 */

import { useState } from "react";
import {
  Bot, Play, CheckCircle2, XCircle, Clock, AlertTriangle,
  PauseCircle, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DEMO_AGENT_RUNS, TASK_KIND_META, STATUS_META,
  type AgentTaskKind, type AgentTaskRun, type StepStatus,
} from "@/lib/ai/agent-tasks";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEP_STATUS_META: Record<StepStatus, { Icon: typeof CheckCircle2; cls: string }> = {
  ok:                 { Icon: CheckCircle2,  cls: "text-emerald-600" },
  running:            { Icon: Clock,         cls: "text-blue-600 animate-spin" },
  pending:            { Icon: Clock,         cls: "text-muted-foreground" },
  error:              { Icon: XCircle,       cls: "text-red-600" },
  awaiting_approval:  { Icon: PauseCircle,   cls: "text-amber-700" },
};

const fmt = (iso: string) => new Date(iso).toLocaleString("ja-JP", {
  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

export default function AiAgentsPage() {
  const [runs, setRuns] = useState<AgentTaskRun[]>(DEMO_AGENT_RUNS);
  const [selected, setSelected] = useState<AgentTaskRun | null>(runs[0] ?? null);

  const trigger = (kind: AgentTaskKind) => {
    const meta = TASK_KIND_META[kind];
    toast.success(`${meta.emoji} ${meta.label} を起動しました（demo）`, {
      description: `想定所要時間 ${meta.estimated_min} 分`,
    });
  };

  const approveStep = (runId: string, seq: number) => {
    setRuns(runs.map((r) =>
      r.id === runId ? {
        ...r,
        status: "running",
        steps: r.steps.map((s) =>
          s.seq === seq ? { ...s, status: "ok", finished_at: new Date().toISOString() } : s
        ),
      } : r
    ));
    toast.success("ステップを承認しました");
  };

  // KPI
  const total = runs.length;
  const success = runs.filter((r) => r.status === "ok").length;
  const _failed = runs.filter((r) => r.status === "error").length;
  const paused = runs.filter((r) => r.status === "paused").length;
  const totalTokens = runs.reduce(
    (s, r) => s + (r.total_tokens?.input ?? 0) + (r.total_tokens?.output ?? 0), 0,
  );

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bot className="size-6 text-gc-700" />
          AI エージェント
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Claude Agent SDK / Computer Use で HR 業務を自動実行。承認フロー付きで安全に
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="総実行" value={total} unit="件" />
        <Kpi label="成功" value={success} unit="件" tone="success" />
        <Kpi label="承認待ち" value={paused} unit="件" tone={paused > 0 ? "warn" : "muted"} />
        <Kpi label="累計トークン" value={`${(totalTokens / 1000).toFixed(1)}k`} unit="tok" />
      </div>

      {/* タスクテンプレート */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Play className="size-4 text-gc-700" />
            タスクテンプレート（クリックで起動）
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(TASK_KIND_META) as AgentTaskKind[]).map((k) => {
              const meta = TASK_KIND_META[k];
              return (
                <li key={k}>
                  <button
                    onClick={() => trigger(k)}
                    className="flex w-full items-start gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:border-gc-400 hover:bg-gc-50/30"
                  >
                    <span className="text-2xl">{meta.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">{meta.label}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{meta.description}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        ⏱ ~{meta.estimated_min} 分
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* 承認待ち警告 */}
      {paused > 0 && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="size-5 shrink-0 text-amber-700" />
            <div>
              <h3 className="font-semibold text-sm">{paused} 件のタスクが承認を待っています</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                destructive な操作（給与登録・データ削除等）は HR 管理者の承認が必要です
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 実行履歴 + 詳細 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <div className="border-b p-3">
              <h3 className="text-sm font-semibold">実行履歴</h3>
            </div>
            <ul className="divide-y">
              {runs.map((r) => {
                const meta = TASK_KIND_META[r.kind];
                const sm = STATUS_META[r.status];
                const isActive = selected?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelected(r)}
                      className={cn(
                        "flex w-full items-start gap-2 p-3 text-left text-xs transition-colors",
                        isActive ? "bg-gc-50" : "hover:bg-accent",
                      )}
                    >
                      <span className="text-base">{meta.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", sm.cls)}>
                            {sm.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{fmt(r.initiated_at)}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {selected && (
          <Card className="lg:col-span-2">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">{TASK_KIND_META[selected.kind].emoji}</span>
                    <h3 className="font-bold">{selected.title}</h3>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    起動: {selected.initiated_by} · {fmt(selected.initiated_at)}
                  </div>
                </div>
                <Badge variant="outline" className={cn("border text-[10px]", STATUS_META[selected.status].cls)}>
                  {STATUS_META[selected.status].label}
                </Badge>
              </div>

              {/* ステップ */}
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  実行ステップ
                </h4>
                <ol className="space-y-2">
                  {selected.steps.map((s) => {
                    const meta = STEP_STATUS_META[s.status];
                    return (
                      <li key={s.seq} className={cn(
                        "flex items-start gap-2 rounded-md border p-2.5 text-sm",
                        s.status === "awaiting_approval" && "border-amber-300 bg-amber-50/40",
                        s.status === "error" && "border-red-200 bg-red-50/40",
                      )}>
                        <span className="font-mono text-xs text-muted-foreground">#{s.seq}</span>
                        <meta.Icon className={cn("mt-0.5 size-4 shrink-0", meta.cls)} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{s.description}</div>
                          {s.output_summary && (
                            <div className="mt-1 text-[11px] text-muted-foreground italic">→ {s.output_summary}</div>
                          )}
                          {s.error_message && (
                            <div className="mt-1 rounded-md bg-red-100 p-1.5 text-[11px] text-red-800">
                              ⚠️ {s.error_message}
                            </div>
                          )}
                        </div>
                        {s.status === "awaiting_approval" && (
                          <Button
                            onClick={() => approveStep(selected.id, s.seq)}
                            size="sm"
                            className="h-6 gap-1 px-2 text-[11px]"
                          >
                            <ArrowRight className="size-3" />
                            承認
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>

              {selected.result && (
                <div className="rounded-md border bg-emerald-50/40 p-3 text-sm">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-800">最終結果</div>
                  <p className="mt-1 leading-relaxed">{selected.result}</p>
                </div>
              )}

              {selected.total_tokens && (
                <div className="text-[11px] text-muted-foreground">
                  トークン消費: 入力 {selected.total_tokens.input.toLocaleString()} / 出力 {selected.total_tokens.output.toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 <strong>安全装置：</strong>
        destructive な操作（給与登録 / データ削除 / 全社送信）は <strong>必ず承認待ち</strong>状態で停止し、
        HR 管理者の明示承認後にのみ実行されます。Computer Use の自律性は重要ですが、
        人事領域では <em>「人を最後に置く」</em>原則を貫いています。
      </div>
    </div>
  );
}

function Kpi({ label, value, unit, tone }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "success" | "warn" | "muted";
}) {
  const cls = {
    primary: "border-gc-200 bg-gc-50/40",
    success: "border-emerald-200 bg-emerald-50/40",
    warn:    "border-amber-200 bg-amber-50/40",
    muted:   "",
  }[tone ?? "primary"];
  return (
    <Card className={cn(cls)}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
