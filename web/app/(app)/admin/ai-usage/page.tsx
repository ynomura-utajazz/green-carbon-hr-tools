/**
 * /admin/ai-usage
 *
 * AI Copilot のトークン消費・コスト概算を可視化。
 *  - 直近 30 日のサマリ KPI
 *  - 日次バーチャート（コスト USD/JPY）
 *  - ユースケース別ランキング
 *
 * RLS：HR 管理者のみ閲覧可（demo モードはモックを返す）
 */

import { Sparkles, DollarSign, Activity, TrendingUp } from "lucide-react";
import { isDemoMode } from "@/lib/demo/mock-data";
import {
  estimateCost,
  getDailyUsage,
  getUseCaseUsage,
  type DailyAggregate,
  type UseCaseAggregate,
} from "@/lib/ai/usage-log";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const USE_CASE_LABEL: Record<string, string> = {
  "recruiting-summary": "採用：候補者評価サマリ",
  "oneonone-summary": "1on1：議事録要約",
  "retention-narrative": "離職リスク：介入プラン",
  "dashboard-narrative": "HR ダッシュボード：経営サマリ",
};

// ── デモデータ ─────────────────────────────────
function buildDemoData(): { daily: DailyAggregate[]; perUseCase: UseCaseAggregate[] } {
  const daily: DailyAggregate[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const count = Math.floor(8 + Math.random() * 18 + (i < 7 ? 6 : 0));
    const inputTokens = count * (350 + Math.floor(Math.random() * 200));
    const outputTokens = count * (550 + Math.floor(Math.random() * 350));
    const costUsd = estimateCost("claude-sonnet-4-5", inputTokens, outputTokens).usd;
    daily.push({ day, count, inputTokens, outputTokens, costUsd });
  }
  const perUseCase: UseCaseAggregate[] = [
    { useCase: "recruiting-summary",   count: 142, inputTokens: 71_000,  outputTokens: 98_000,  costUsd: 0, errorCount: 2 },
    { useCase: "oneonone-summary",     count: 98,  inputTokens: 49_000,  outputTokens: 67_000,  costUsd: 0, errorCount: 0 },
    { useCase: "retention-narrative",  count: 64,  inputTokens: 38_000,  outputTokens: 88_000,  costUsd: 0, errorCount: 1 },
    { useCase: "dashboard-narrative",  count: 35,  inputTokens: 17_500,  outputTokens: 19_000,  costUsd: 0, errorCount: 0 },
  ].map((u) => ({ ...u, costUsd: estimateCost("claude-sonnet-4-5", u.inputTokens, u.outputTokens).usd }));
  return { daily, perUseCase };
}

export default async function AiUsagePage() {
  const demo = isDemoMode();
  const { daily, perUseCase } = demo
    ? buildDemoData()
    : { daily: await getDailyUsage(30), perUseCase: await getUseCaseUsage(30) };

  const totalCount = daily.reduce((s, d) => s + d.count, 0);
  const totalCostUsd = daily.reduce((s, d) => s + d.costUsd, 0);
  const totalCostJpy = totalCostUsd * 150;
  const totalInputTokens = daily.reduce((s, d) => s + d.inputTokens, 0);
  const totalOutputTokens = daily.reduce((s, d) => s + d.outputTokens, 0);

  // 今日と昨日（バー強調用）
  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = daily.find((d) => d.day === today);

  const maxCost = Math.max(0.0001, ...daily.map((d) => d.costUsd));

  return (
    <div className="space-y-5">
      {/* ヘッダ */}
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="size-6 text-gc-700" />
            AI Copilot 利用状況
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            直近 30 日のトークン消費・概算コスト・ユースケース別内訳
          </p>
        </div>
      </div>

      {demo && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          🟡 デモモード：表示はランダム生成のサンプルデータです
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="直近30日 利用回数" value={totalCount.toLocaleString()} unit="回" Icon={Activity} tone="primary" />
        <Kpi label="今日の利用" value={(todayUsage?.count ?? 0).toLocaleString()} unit="回" Icon={TrendingUp} tone="success" />
        <Kpi label="累計コスト（概算）" value={`$${totalCostUsd.toFixed(2)}`} unit="" Icon={DollarSign} tone="muted" hint={`≒ ¥${Math.round(totalCostJpy).toLocaleString()}`} />
        <Kpi label="トークン I/O" value={`${(totalInputTokens / 1000).toFixed(1)}k`} unit={`/ ${(totalOutputTokens / 1000).toFixed(1)}k`} Icon={Sparkles} tone="muted" />
      </div>

      {/* 日次トレンド */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
            <span>日次コスト推移</span>
            <span className="text-[11px] font-normal text-muted-foreground">USD（概算）</span>
          </h3>
          {daily.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              まだ利用ログがありません
            </div>
          ) : (
            <div className="flex h-44 items-end gap-1">
              {daily.map((d) => {
                const h = (d.costUsd / maxCost) * 100;
                const isToday = d.day === today;
                return (
                  <div
                    key={d.day}
                    className="group relative flex-1"
                    title={`${d.day}: $${d.costUsd.toFixed(3)} / ${d.count}回`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        isToday
                          ? "bg-gradient-to-t from-gc-700 to-gc-400"
                          : "bg-gradient-to-t from-gc-500/70 to-gc-300/70 group-hover:from-gc-700 group-hover:to-gc-400",
                      )}
                      style={{ height: `${Math.max(2, h)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{daily[0]?.day ?? ""}</span>
            <span>{daily[daily.length - 1]?.day ?? ""}</span>
          </div>
        </CardContent>
      </Card>

      {/* ユースケース別 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">ユースケース別 ランキング（直近30日）</h3>
          {perUseCase.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              まだ利用ログがありません
            </div>
          ) : (
            <ul className="space-y-2">
              {perUseCase.map((u) => {
                const maxC = Math.max(...perUseCase.map((x) => x.costUsd));
                const pct = (u.costUsd / maxC) * 100;
                return (
                  <li key={u.useCase} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{USE_CASE_LABEL[u.useCase] ?? u.useCase}</span>
                        {u.errorCount > 0 && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                            err {u.errorCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs tabular-nums">
                        <span className="text-muted-foreground">{u.count} 回</span>
                        <span className="font-mono font-bold">${u.costUsd.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-to-r from-gc-400 to-gc-600" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>入力 {u.inputTokens.toLocaleString()} tok</span>
                      <span>出力 {u.outputTokens.toLocaleString()} tok</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/20 p-3 text-[11px] text-muted-foreground">
        コストは Anthropic 公開料金（Sonnet 4.5: $3/M input、$15/M output）と USD/JPY=150
        で概算。実際の請求額とは差異が生じます。
      </div>
    </div>
  );
}

function Kpi({
  label, value, unit, Icon, tone, hint,
}: {
  label: string; value: string; unit: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "success" | "muted";
  hint?: string;
}) {
  const cls = {
    primary: "text-gc-700 bg-gc-50 border-gc-200",
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    muted:   "text-muted-foreground bg-muted/40 border-border",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", cls)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
          {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
