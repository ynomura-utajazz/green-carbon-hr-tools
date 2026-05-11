"use client";

/**
 * /recruiting-funnel
 *
 * 採用ファネル分析（直近 12 ヶ月）。
 *
 * 構成：
 *  1. ヘッダ KPI（流入数・採用数・全体 hire rate・平均 days to hire）
 *  2. 経路 × ステージ CVR マトリクス（heatmap 風）
 *  3. ファネル可視化（ボトルネック強調）
 *  4. 月次トレンド（応募 / 採用 / 離脱）
 *  5. 経路別 hire rate ランキング
 */

import { useMemo, useState } from "react";
import {
  TrendingUp, Users2, Target, Zap, AlertTriangle, ChevronDown, Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DEMO_FUNNEL_EVENTS } from "@/lib/demo/funnel-events";
import {
  computeFunnel, computeMonthlyTrend, topSourceConversion,
  FUNNEL_STAGES, STAGE_SHORT_LABEL,
} from "@/lib/recruiting/funnel";
import { SOURCE_LABEL, type CandidateSource } from "@/lib/demo/recruiting";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANGE_OPTIONS = [
  { value: "12", label: "直近 12 ヶ月" },
  { value: "6",  label: "直近 6 ヶ月" },
  { value: "3",  label: "直近 3 ヶ月" },
];

export default function RecruitingFunnelPage() {
  const [rangeMonths, setRangeMonths] = useState("12");

  const { stats, all, trend, bySource } = useMemo(() => {
    const since = new Date();
    since.setMonth(since.getMonth() - Number(rangeMonths));
    const stats = computeFunnel(DEMO_FUNNEL_EVENTS, { since });
    const all = stats.find((s) => s.source === "all")!;
    const trend = computeMonthlyTrend(
      DEMO_FUNNEL_EVENTS.filter((e) => new Date(e.occurred_at) >= since),
    ).slice(-Number(rangeMonths));
    const bySource = topSourceConversion(stats);
    return { stats, all, trend, bySource };
  }, [rangeMonths]);

  const totalApplied = all.reached.applied ?? 0;
  const totalHired = all.reached.hired ?? 0;
  const overallHireRate = totalApplied > 0 ? totalHired / totalApplied : 0;

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["経路", ...FUNNEL_STAGES.map((s) => `${STAGE_SHORT_LABEL[s] ?? s} 到達数`), "全体 hire rate", "平均日数"],
      ...stats.map((s) => [
        s.source === "all" ? "全体" : SOURCE_LABEL[s.source as CandidateSource],
        ...FUNNEL_STAGES.map((stage) => s.reached[stage] ?? 0),
        (s.reached.applied > 0 ? ((s.reached.hired ?? 0) / s.reached.applied) : 0).toFixed(3),
        s.avg_days_to_hire ? Math.round(s.avg_days_to_hire) : "—",
      ]),
    ];
    downloadCsv(`recruiting-funnel-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-5">
      {/* ヘッダ */}
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <TrendingUp className="size-6 text-gc-700" />
            候補者母集団分析
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            応募経路ごとの転換率・面接パスレート・採用率の歴史トレンド
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={rangeMonths} onValueChange={setRangeMonths}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* ── KPI ─────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi Icon={Users2} label="累計応募" value={totalApplied} unit="名" tone="primary" />
        <Kpi Icon={Target} label="採用決定" value={totalHired} unit="名" tone="success" />
        <Kpi Icon={Zap} label="全体 hire rate" value={`${(overallHireRate * 100).toFixed(1)}%`} unit="" tone="muted"
          hint={`応募 → 採用の転換率`} />
        <Kpi Icon={TrendingUp} label="平均 days to hire" value={all.avg_days_to_hire ? Math.round(all.avg_days_to_hire) : "—"} unit="日" tone="muted"
          hint="応募から採用決定まで" />
      </div>

      {/* ── ファネル可視化 ───────────────── */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
            <ChevronDown className="size-4 text-gc-700" />
            選考ファネル（全体）
          </h2>
          <FunnelBars
            stages={FUNNEL_STAGES}
            reached={all.reached}
            cvr={all.cvr}
            applied={totalApplied}
            bottleneck={all.bottleneck}
          />
        </CardContent>
      </Card>

      {/* ── 経路 × ステージ CVR マトリクス ───── */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <Target className="size-4 text-gc-700" />
            経路 × ステージ 転換率マトリクス
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            各セルは「前ステージから次に進んだ割合」。緑が濃いほど通過率高、赤が濃いほどボトルネック。
          </p>
          <CvrMatrix stats={stats} />
        </CardContent>
      </Card>

      {/* ── 月次トレンド ────────────────── */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <TrendingUp className="size-4 text-gc-700" />
            月次トレンド
          </h2>
          <MonthlyChart trend={trend} />
        </CardContent>
      </Card>

      {/* ── 経路別ランキング ──────────────── */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Zap className="size-4 text-gc-700" />
            経路別 hire rate ランキング
          </h2>
          <ul className="space-y-2">
            {bySource.map((s, i) => {
              const maxRate = bySource[0]?.hire_rate ?? 0.0001;
              const pct = (s.hire_rate / maxRate) * 100;
              return (
                <li key={s.source} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[11px] tabular-nums text-muted-foreground">#{i + 1}</span>
                      <span className="font-medium">{SOURCE_LABEL[s.source]}</span>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-xs text-muted-foreground">{s.applied} → {s.hired}</span>
                      <span className="font-mono font-bold">{(s.hire_rate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn(
                      "h-full",
                      i === 0 ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                              : "bg-gradient-to-r from-gc-400 to-gc-600",
                    )} style={{ width: `${Math.max(2, pct)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            <strong>📊 読み解き：</strong>
            リファラル・業務委託転換・アルムナイは流入数こそ少ないものの、
            hire rate が他経路の 4〜6 倍。母集団形成は「数より経路の質」を優先するのが効率的。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 部品 ─────────────────────────────────────────

function Kpi({
  Icon, label, value, unit, tone, hint,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
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

function FunnelBars({
  stages, reached, cvr, applied, bottleneck,
}: {
  stages: typeof FUNNEL_STAGES;
  reached: Record<string, number>;
  cvr: Record<string, number>;
  applied: number;
  bottleneck?: { stage: string; cvr: number };
}) {
  return (
    <ul className="space-y-2">
      {stages.map((s, i) => {
        const count = reached[s] ?? 0;
        const widthPct = applied > 0 ? (count / applied) * 100 : 0;
        const isBottleneck = bottleneck?.stage === s;
        const stageCvr = i === 0 ? null : cvr[s];
        return (
          <li key={s} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{STAGE_SHORT_LABEL[s] ?? s}</span>
                {isBottleneck && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                    <AlertTriangle className="size-2.5" />
                    BOTTLENECK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="text-xs text-muted-foreground">{count} 名</span>
                {stageCvr !== null && (
                  <span className={cn(
                    "font-mono text-xs font-bold",
                    isBottleneck ? "text-red-700" : stageCvr >= 0.6 ? "text-emerald-700" : "text-amber-700",
                  )}>
                    {(stageCvr * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  isBottleneck
                    ? "bg-gradient-to-r from-red-400 to-red-600"
                    : "bg-gradient-to-r from-gc-400 to-gc-700",
                )}
                style={{ width: `${Math.max(0.5, widthPct)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CvrMatrix({ stats }: { stats: ReturnType<typeof computeFunnel> }) {
  // 列：ステージ、行：経路
  const sources = stats.filter((s) => s.source !== "all" && (s.reached.applied ?? 0) > 0);
  const stages = FUNNEL_STAGES.slice(1); // applied は CVR ではないので除外

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b">
            <th className="px-2 py-1.5 text-left font-semibold">経路</th>
            {stages.map((s) => (
              <th key={s} className="px-2 py-1.5 text-center font-semibold">
                {STAGE_SHORT_LABEL[s] ?? s}
              </th>
            ))}
            <th className="px-2 py-1.5 text-right font-semibold">流入</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.source} className="border-b last:border-b-0">
              <td className="px-2 py-1.5 font-medium">
                {SOURCE_LABEL[s.source as CandidateSource]}
              </td>
              {stages.map((stage) => {
                const r = s.cvr[stage];
                return (
                  <td key={stage} className="px-1 py-1 text-center">
                    <CvrCell value={r} reached={s.reached[stage]} />
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {s.reached.applied ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CvrCell({ value, reached }: { value: number; reached: number }) {
  if (!Number.isFinite(value) || reached === 0) {
    return <span className="text-muted-foreground/40">—</span>;
  }
  // 0..1 を緑〜赤の HSL に変換（0.5 を中立）
  const hue = Math.round(value * 120); // 0=red, 120=green
  const bg = `hsl(${hue} 65% 88%)`;
  const fg = `hsl(${hue} 70% 28%)`;
  return (
    <span
      className="inline-flex min-w-[3rem] justify-center rounded px-1.5 py-0.5 font-mono font-semibold tabular-nums"
      style={{ backgroundColor: bg, color: fg }}
      title={`${reached} 名通過`}
    >
      {(value * 100).toFixed(0)}%
    </span>
  );
}

function MonthlyChart({ trend }: { trend: ReturnType<typeof computeMonthlyTrend> }) {
  if (trend.length === 0) return <div className="py-12 text-center text-sm text-muted-foreground">データなし</div>;
  const max = Math.max(...trend.map((p) => p.applied), 1);

  return (
    <div className="space-y-2">
      <div className="flex h-44 items-end gap-1">
        {trend.map((p) => {
          const aH = (p.applied / max) * 100;
          const hH = (p.hired / max) * 100;
          return (
            <div key={p.month} className="group relative flex flex-1 flex-col items-stretch justify-end gap-0.5"
              title={`${p.month}: 応募 ${p.applied}・採用 ${p.hired}・離脱 ${p.rejected}`}>
              <div className="relative flex flex-1 items-end">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-gc-500/60 to-gc-300/60 group-hover:from-gc-700 group-hover:to-gc-400"
                  style={{ height: `${Math.max(2, aH)}%` }}
                />
                {p.hired > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400"
                    style={{ height: `${Math.max(2, hH)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{trend[0]?.month ?? ""}</span>
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-gc-400" />
            応募
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-emerald-500" />
            採用
          </span>
        </div>
        <span>{trend[trend.length - 1]?.month ?? ""}</span>
      </div>
    </div>
  );
}
