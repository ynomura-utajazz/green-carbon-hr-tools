"use client";

/**
 * /recruiting-roi
 *
 * 採用予算 ROI 分析。
 *  - 予算 vs 実績の差分
 *  - 経路別の retention（90/180/365 日生存率）
 *  - 経路別 ROI（在籍中 hire の年収合計 / 投下コスト）
 *  - 早期退職の理由分析
 *  - 「経路品質スコア」総合ランキング
 */

import { useMemo, useState } from "react";
import { BarChart3, Download, Award, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DEMO_ACTUAL_HIRES, DEMO_BUDGET_BY_SOURCE } from "@/lib/demo/recruiting-roi";
import { SOURCE_LABEL, type CandidateSource } from "@/lib/demo/recruiting";
import { downloadCsv } from "@/lib/csv";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ALL_SOURCES = Object.keys(DEMO_BUDGET_BY_SOURCE) as CandidateSource[];

const fmtJpy = (n: number) =>
  n >= 100_000_000 ? `¥${(n / 100_000_000).toFixed(2)}億`
  : n >= 10_000   ? `¥${(n / 10_000).toFixed(0)}万`
  : `¥${Math.round(n).toLocaleString()}`;

type SourceRoi = {
  source: CandidateSource;
  hires: number;
  hires_retained_365: number;
  total_actual_cost: number;
  budget: number;
  budget_variance: number; // actual - budget
  retention_90: number;
  retention_180: number;
  retention_365: number;
  total_annual_value: number; // 在籍中 hire の年収合計
  roi: number; // (annual_value × 365日 retention) / cost
  /** 総合品質スコア 0-100 */
  quality_score: number;
};

function computeSourceRoi(): SourceRoi[] {
  const result: SourceRoi[] = [];
  for (const src of ALL_SOURCES) {
    const hires = DEMO_ACTUAL_HIRES.filter((h) => h.source === src);
    if (hires.length === 0 && (DEMO_BUDGET_BY_SOURCE[src] ?? 0) === 0) continue;

    const total = hires.length;
    const r90 = hires.filter((h) => h.retained_90).length;
    const r180 = hires.filter((h) => h.retained_180).length;
    const r365 = hires.filter((h) => h.retained_365).length;
    const cost = hires.reduce((s, h) => s + h.actual_cost_jpy, 0);
    const annualValue = hires
      .filter((h) => h.retained_365)
      .reduce((s, h) => s + h.base_annual_jpy, 0);
    const budget = DEMO_BUDGET_BY_SOURCE[src] ?? 0;

    // 品質スコア = 365日 retention rate × 70% + manager rating平均 × 30%
    const retentionRate = total > 0 ? r365 / total : 0;
    const ratings = hires.map((h) => h.manager_rating ?? 3);
    const ratingAvg = ratings.length > 0
      ? ratings.reduce((s, r) => s + r, 0) / ratings.length / 5
      : 0;
    const qualityScore = Math.round((retentionRate * 0.7 + ratingAvg * 0.3) * 100);

    result.push({
      source: src,
      hires: total,
      hires_retained_365: r365,
      total_actual_cost: cost,
      budget,
      budget_variance: cost - budget,
      retention_90:  total > 0 ? r90 / total : 0,
      retention_180: total > 0 ? r180 / total : 0,
      retention_365: total > 0 ? r365 / total : 0,
      total_annual_value: annualValue,
      // ROI 表記：1 年生存した hire の年収合計 / コスト → 倍率
      roi: cost > 0 ? annualValue / cost : 0,
      quality_score: qualityScore,
    });
  }
  return result.sort((a, b) => b.quality_score - a.quality_score);
}

export default function RecruitingRoiPage() {
  const [selectedSource, setSelectedSource] = useState<CandidateSource | null>(null);

  const sourceRoi = useMemo(computeSourceRoi, []);

  const totals = useMemo(() => {
    const totalHires = sourceRoi.reduce((s, r) => s + r.hires, 0);
    const totalCost = sourceRoi.reduce((s, r) => s + r.total_actual_cost, 0);
    const totalBudget = sourceRoi.reduce((s, r) => s + r.budget, 0);
    const totalRetained = sourceRoi.reduce((s, r) => s + r.hires_retained_365, 0);
    const overallRetention = totalHires > 0 ? totalRetained / totalHires : 0;
    const overallRoi = totalCost > 0
      ? sourceRoi.reduce((s, r) => s + r.total_annual_value, 0) / totalCost
      : 0;
    return {
      totalHires, totalCost, totalBudget,
      totalRetained, overallRetention, overallRoi,
      variance: totalCost - totalBudget,
    };
  }, [sourceRoi]);

  // 退職理由集計
  const exitReasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of DEMO_ACTUAL_HIRES) {
      if (h.exit_reason) {
        map.set(h.exit_reason, (map.get(h.exit_reason) ?? 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const detailHires = selectedSource
    ? DEMO_ACTUAL_HIRES.filter((h) => h.source === selectedSource)
    : DEMO_ACTUAL_HIRES;

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["経路", "hire 数", "365日生存", "実コスト", "予算", "差分",
       "90日 retention", "180日 retention", "365日 retention",
       "在籍中 年収合計", "ROI (倍)", "品質スコア"],
      ...sourceRoi.map((r) => [
        SOURCE_LABEL[r.source],
        r.hires, r.hires_retained_365,
        r.total_actual_cost, r.budget, r.budget_variance,
        Number(r.retention_90.toFixed(2)),
        Number(r.retention_180.toFixed(2)),
        Number(r.retention_365.toFixed(2)),
        r.total_annual_value,
        Number(r.roi.toFixed(2)),
        r.quality_score,
      ]),
    ];
    downloadCsv(`recruiting-roi-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Award className="size-6 text-gc-700" />
            採用予算 ROI 分析
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            予算 vs 実績 + 採用品質（90/180/365 日 retention + マネージャー評価）で経路の真の ROI を測定
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-1.5">
          <Download className="size-4" />
          CSV
        </Button>
      </div>

      {/* 全体 KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="採用総数（過去 12 ヶ月）" value={totals.totalHires} unit="名" tone="primary" />
        <Kpi
          label="365 日生存率"
          value={`${(totals.overallRetention * 100).toFixed(0)}%`}
          unit=""
          tone={totals.overallRetention >= 0.8 ? "success" : totals.overallRetention >= 0.6 ? "warn" : "danger"}
          hint={`${totals.totalRetained} / ${totals.totalHires} 名`}
        />
        <Kpi
          label="実コスト vs 予算"
          value={`${totals.variance > 0 ? "+" : ""}${fmtJpy(totals.variance)}`}
          unit=""
          tone={totals.variance > 0 ? "warn" : "success"}
          hint={`実 ${fmtJpy(totals.totalCost)} / 予 ${fmtJpy(totals.totalBudget)}`}
        />
        <Kpi
          label="全体 ROI"
          value={`${totals.overallRoi.toFixed(1)}x`}
          unit=""
          tone="success"
          hint="在籍中 hire 年収合計 / 投下コスト"
        />
      </div>

      {/* 経路別 ROI テーブル */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <BarChart3 className="size-4 text-gc-700" />
              経路別 ROI 比較（品質スコア降順）
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-2 py-1.5 text-left font-semibold">経路</th>
                  <th className="px-2 py-1.5 text-center font-semibold">採用数</th>
                  <th className="px-2 py-1.5 text-center font-semibold">365日生存</th>
                  <th className="px-2 py-1.5 text-right font-semibold">実コスト</th>
                  <th className="px-2 py-1.5 text-right font-semibold">予算差分</th>
                  <th className="px-2 py-1.5 text-center font-semibold">ROI</th>
                  <th className="px-2 py-1.5 text-center font-semibold">品質</th>
                </tr>
              </thead>
              <tbody>
                {sourceRoi.map((r, i) => (
                  <tr key={r.source}
                    className={cn(
                      "border-b last:border-b-0 cursor-pointer transition-colors",
                      selectedSource === r.source
                        ? "bg-gc-50/50"
                        : "hover:bg-accent/40",
                    )}
                    onClick={() => setSelectedSource(selectedSource === r.source ? null : r.source)}>
                    <td className="px-2 py-1.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">#{i + 1}</span>
                        {SOURCE_LABEL[r.source]}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono tabular-nums">{r.hires}</td>
                    <td className="px-2 py-1.5 text-center">
                      <RetentionBar
                        r90={r.retention_90} r180={r.retention_180} r365={r.retention_365}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {fmtJpy(r.total_actual_cost)}
                    </td>
                    <td className={cn(
                      "px-2 py-1.5 text-right font-mono tabular-nums",
                      r.budget_variance > 0 ? "text-amber-700" : "text-emerald-700",
                    )}>
                      {r.budget_variance > 0 ? "+" : ""}{fmtJpy(r.budget_variance)}
                    </td>
                    <td className={cn(
                      "px-2 py-1.5 text-center font-mono font-bold tabular-nums",
                      r.roi >= 30 ? "text-emerald-700" :
                      r.roi >= 15 ? "text-amber-700" : "text-red-700",
                    )}>
                      {r.roi.toFixed(1)}x
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <QualityPill score={r.quality_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 退職理由分析 */}
      {exitReasons.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <XCircle className="size-4 text-red-600" />
              早期退職の理由（過去 12 ヶ月）
            </h2>
            <ul className="space-y-1.5">
              {exitReasons.map(([reason, count]) => (
                <li key={reason} className="flex items-center justify-between text-sm">
                  <span>{reason}</span>
                  <span className="font-mono font-bold tabular-nums">{count} 件</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 個別 hire リスト */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b p-3">
            <h2 className="text-sm font-semibold">
              {selectedSource ? `${SOURCE_LABEL[selectedSource]} 経由 採用者` : "全採用者"}
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                {detailHires.length} 名
              </span>
            </h2>
            {selectedSource && (
              <button
                onClick={() => setSelectedSource(null)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                全件表示に戻る
              </button>
            )}
          </div>
          <ul className="divide-y">
            {detailHires.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <Avatar className="size-8">
                  <AvatarFallback className="text-[10px]">{initials(h.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{h.full_name}</span>
                    <Badge variant="outline" className="text-[10px]">{h.role}</Badge>
                    <Badge variant="outline" className="text-[10px] bg-muted">
                      {SOURCE_LABEL[h.source]}
                    </Badge>
                    {h.exited_at && (
                      <Badge variant="danger" className="text-[10px]">退職済</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {h.hired_at} 採用 · 年収 {fmtJpy(h.base_annual_jpy)} · コスト {fmtJpy(h.actual_cost_jpy)}
                    {h.exited_at && ` · ${h.exited_at} 退職（${h.exit_reason}）`}
                  </div>
                </div>
                <div className="flex gap-1">
                  {[
                    { label: "90", v: h.retained_90 },
                    { label: "180", v: h.retained_180 },
                    { label: "365", v: h.retained_365 },
                  ].map((r) => (
                    <span
                      key={r.label}
                      title={`${r.label}日 ${r.v ? "生存" : "離脱"}`}
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-[9px] font-bold tabular-nums",
                        r.v ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700",
                      )}
                    >
                      {r.label}
                    </span>
                  ))}
                  {h.manager_rating && (
                    <span className="ml-1 inline-flex size-6 items-center justify-center rounded-full bg-gc-100 text-[10px] font-bold text-gc-800">
                      ★{h.manager_rating}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 <strong>読み解き：</strong>
        単純な CPH（採用 1 件あたりコスト）だけでは経路の質は見えません。
        365 日生存率 + マネージャー評価を含めた「品質スコア」で見ると、リファラル・業務委託転換の真の価値が浮き彫りになります。
        エージェント経由は短期離脱コストも上乗せされるため、長期 ROI で比較すると効率が更に低下します。
      </div>
    </div>
  );
}

function Kpi({ label, value, unit, tone, hint }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "success" | "warn" | "danger" | "muted";
  hint?: string;
}) {
  const cls = {
    primary: "border-gc-200 bg-gc-50/40",
    success: "border-emerald-200 bg-emerald-50/40",
    warn:    "border-amber-200 bg-amber-50/40",
    danger:  "border-red-200 bg-red-50/40",
    muted:   "",
  }[tone ?? "muted"];
  return (
    <Card className={cn(cls)}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function RetentionBar({ r90, r180, r365 }: { r90: number; r180: number; r365: number }) {
  return (
    <div className="inline-flex gap-0.5">
      {[
        { v: r90, label: "90" },
        { v: r180, label: "180" },
        { v: r365, label: "365" },
      ].map((x) => (
        <span
          key={x.label}
          title={`${x.label}日: ${(x.v * 100).toFixed(0)}%`}
          className={cn(
            "inline-flex h-4 w-7 items-center justify-center rounded text-[9px] font-mono tabular-nums",
            x.v >= 0.8 ? "bg-emerald-200 text-emerald-900" :
            x.v >= 0.5 ? "bg-amber-200 text-amber-900" :
                         "bg-red-200 text-red-900",
          )}
        >
          {Math.round(x.v * 100)}
        </span>
      ))}
    </div>
  );
}

function QualityPill({ score }: { score: number }) {
  const tone =
    score >= 75 ? { bg: "bg-emerald-100", fg: "text-emerald-800" } :
    score >= 50 ? { bg: "bg-amber-100",   fg: "text-amber-800" } :
                  { bg: "bg-red-100",     fg: "text-red-800" };
  return (
    <span className={cn(
      "inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 font-mono font-bold tabular-nums",
      tone.bg, tone.fg,
    )}>
      {score}
    </span>
  );
}
