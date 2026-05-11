"use client";

/**
 * /recruiting-budget
 *
 * 採用予算シミュレータ：
 *  - 経路別の cost-per-hire（編集可）
 *  - ロール別の採用人数 × 経路ミックス（編集可）
 *  - 12 ヶ月の月次予算試算
 *  - KPI: 総予算、平均 CPH、経路別比率
 */

import { useMemo, useState } from "react";
import { Coins, Download, RotateCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { SOURCE_LABEL, type CandidateSource } from "@/lib/demo/recruiting";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 経路別の業界平均 CPH（cost-per-hire）— 円
const DEFAULT_CPH: Record<CandidateSource, number> = {
  referral:               150_000,    // リファラルボーナス
  contractor_conversion:  100_000,    // 内部転換、ほぼ手数料のみ
  alumni:                  80_000,    // ほぼ管理コスト
  linkedin:               550_000,    // 採用広告 + ATS + 人件費
  wantedly:               350_000,
  indeed:                 380_000,
  direct:                 200_000,    // 自社サイト経由
  agent:                1_500_000,    // エージェント手数料 (年収 30%)
};

const CPH_TONE: Record<CandidateSource, "good" | "med" | "bad"> = {
  referral: "good", contractor_conversion: "good", alumni: "good",
  direct: "med", linkedin: "med", wantedly: "med", indeed: "med",
  agent: "bad",
};

type RolePlan = {
  id: string;
  role: string;
  total_hires: number;
  /** 経路ミックスの目標（合計が total_hires と一致するよう編集中は warn） */
  mix: Record<CandidateSource, number>;
};

const DEFAULT_PLANS: RolePlan[] = [
  {
    id: "p1", role: "ML エンジニア（シニア）", total_hires: 2,
    mix: { referral: 0, contractor_conversion: 0, alumni: 0, linkedin: 1, wantedly: 0, indeed: 0, direct: 0, agent: 1 },
  },
  {
    id: "p2", role: "ASEAN リージョナル BD", total_hires: 2,
    mix: { referral: 1, contractor_conversion: 0, alumni: 0, linkedin: 1, wantedly: 0, indeed: 0, direct: 0, agent: 0 },
  },
  {
    id: "p3", role: "気候政策スペシャリスト", total_hires: 1,
    mix: { referral: 0, contractor_conversion: 0, alumni: 0, linkedin: 0, wantedly: 0, indeed: 0, direct: 1, agent: 0 },
  },
  {
    id: "p4", role: "プロダクトマネージャー", total_hires: 1,
    mix: { referral: 1, contractor_conversion: 0, alumni: 0, linkedin: 0, wantedly: 0, indeed: 0, direct: 0, agent: 0 },
  },
  {
    id: "p5", role: "経理マネージャー（IPO）", total_hires: 1,
    mix: { referral: 0, contractor_conversion: 0, alumni: 0, linkedin: 0, wantedly: 0, indeed: 0, direct: 0, agent: 1 },
  },
  {
    id: "p6", role: "ソフトウェアエンジニア", total_hires: 4,
    mix: { referral: 2, contractor_conversion: 1, alumni: 0, linkedin: 1, wantedly: 0, indeed: 0, direct: 0, agent: 0 },
  },
];

const ALL_SOURCES: CandidateSource[] = [
  "referral", "contractor_conversion", "alumni",
  "direct", "wantedly", "linkedin", "indeed", "agent",
];

const fmtJpy = (n: number) =>
  n >= 100_000_000 ? `¥${(n / 100_000_000).toFixed(2)}億`
  : n >= 10_000 ? `¥${(n / 10_000).toFixed(1)}万`
  : `¥${Math.round(n).toLocaleString()}`;

export default function RecruitingBudgetPage() {
  const [cph, setCph] = useState<Record<CandidateSource, number>>(DEFAULT_CPH);
  const [plans, setPlans] = useState<RolePlan[]>(DEFAULT_PLANS);

  // 集計
  const totals = useMemo(() => {
    const bySource = new Map<CandidateSource, { hires: number; cost: number }>();
    let totalHires = 0;
    let totalCost = 0;

    for (const p of plans) {
      for (const src of ALL_SOURCES) {
        const n = p.mix[src] ?? 0;
        if (n === 0) continue;
        const cost = n * (cph[src] ?? 0);
        const cur = bySource.get(src) ?? { hires: 0, cost: 0 };
        cur.hires += n;
        cur.cost += cost;
        bySource.set(src, cur);
        totalHires += n;
        totalCost += cost;
      }
    }
    const avgCph = totalHires > 0 ? totalCost / totalHires : 0;
    return { bySource, totalHires, totalCost, avgCph };
  }, [plans, cph]);

  // 月次配分（demo: 各ロールは均等に 12 ヶ月で按分）
  const monthly = useMemo(() => {
    const months: { month: string; hires: number; cost: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ month: `${d.getMonth() + 1}月`, hires: 0, cost: 0 });
    }
    for (const p of plans) {
      // 採用は 12 ヶ月にだいたい均等に（最初の数ヶ月にやや前倒し）
      let allocated = 0;
      for (let i = 0; i < 12 && allocated < p.total_hires; i++) {
        // 月ごとの理想配分
        const n = Math.min(
          p.total_hires - allocated,
          Math.ceil(p.total_hires / 12) + (i < 4 ? 1 : 0),
        );
        if (n <= 0) continue;
        let monthCost = 0;
        for (const src of ALL_SOURCES) {
          const ratio = (p.mix[src] ?? 0) / Math.max(1, p.total_hires);
          monthCost += n * ratio * (cph[src] ?? 0);
        }
        months[i].hires += n;
        months[i].cost += monthCost;
        allocated += n;
      }
    }
    return months;
  }, [plans, cph]);

  const maxMonthCost = Math.max(0.001, ...monthly.map((m) => m.cost));

  const updatePlanMix = (planId: string, src: CandidateSource, value: number) => {
    setPlans(plans.map((p) =>
      p.id === planId ? { ...p, mix: { ...p.mix, [src]: Math.max(0, value) } } : p
    ));
  };
  const updatePlanTotal = (planId: string, value: number) => {
    setPlans(plans.map((p) =>
      p.id === planId ? { ...p, total_hires: Math.max(0, value) } : p
    ));
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["ロール", "採用予定数", ...ALL_SOURCES.map((s) => SOURCE_LABEL[s]), "ロール総額"],
      ...plans.map((p) => {
        const cells = ALL_SOURCES.map((s) => p.mix[s] ?? 0);
        const cost = ALL_SOURCES.reduce((sum, s) => sum + (p.mix[s] ?? 0) * (cph[s] ?? 0), 0);
        return [p.role, p.total_hires, ...cells, cost];
      }),
      ["", "", ...ALL_SOURCES.map(() => ""), ""],
      ["経路別 CPH（円）", "", ...ALL_SOURCES.map((s) => cph[s]), ""],
    ];
    downloadCsv(`recruiting-budget-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const reset = () => {
    setCph(DEFAULT_CPH);
    setPlans(DEFAULT_PLANS);
  };

  // 経路ミックスの一致警告
  const mismatched = plans.filter(
    (p) => ALL_SOURCES.reduce((s, src) => s + (p.mix[src] ?? 0), 0) !== p.total_hires,
  );

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Coins className="size-6 text-gc-700" />
            採用予算シミュレータ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            採用人数 × 経路 × 平均コストで 12 ヶ月の予算を試算。CPH 編集 → 即時再計算
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} className="gap-1.5">
            <RotateCcw className="size-4" />
            初期値
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="採用予定総数" value={totals.totalHires} unit="名" />
        <Kpi label="12 ヶ月総予算" value={fmtJpy(totals.totalCost)} unit="" tone="primary" />
        <Kpi label="平均 CPH" value={fmtJpy(totals.avgCph)} unit="" tone="muted" />
        <Kpi label="月次平均" value={fmtJpy(totals.totalCost / 12)} unit="" tone="muted" />
      </div>

      {mismatched.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {mismatched.length} 件のロールで「採用予定数」と「経路ミックス合計」が一致していません。
            各経路のセル合計と人数を揃えると正確に試算できます。
          </span>
        </div>
      )}

      {/* CPH 編集 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">経路別 cost-per-hire（編集可）</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">
            業界平均値を初期値にしています。社内のリファラルボーナス・エージェント費率に応じて編集してください。
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_SOURCES.map((src) => {
              const tone = CPH_TONE[src];
              return (
                <label key={src} className="block">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className={cn(
                      "text-[11px] font-medium",
                      tone === "good" ? "text-emerald-700" :
                      tone === "bad"  ? "text-red-700" : "text-foreground",
                    )}>
                      {SOURCE_LABEL[src]}
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={cph[src]}
                    step={10000}
                    min={0}
                    onChange={(e) => setCph({ ...cph, [src]: Math.max(0, Number(e.target.value)) })}
                    className="text-sm font-mono tabular-nums"
                  />
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ロール別計画テーブル */}
      <Card>
        <CardContent className="p-3 overflow-x-auto">
          <h3 className="mb-2 px-1 text-sm font-semibold">ロール × 経路ミックス（採用人数）</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-background px-2 py-1.5 text-left font-semibold">ロール</th>
                <th className="px-2 py-1.5 text-center font-semibold">予定数</th>
                {ALL_SOURCES.map((s) => (
                  <th key={s} className="px-1 py-1.5 text-center font-semibold whitespace-nowrap">
                    {SOURCE_LABEL[s]}
                  </th>
                ))}
                <th className="px-2 py-1.5 text-right font-semibold bg-muted/30">予算</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const planCost = ALL_SOURCES.reduce(
                  (sum, s) => sum + (p.mix[s] ?? 0) * (cph[s] ?? 0), 0,
                );
                const mixSum = ALL_SOURCES.reduce((s, src) => s + (p.mix[src] ?? 0), 0);
                const mismatch = mixSum !== p.total_hires;
                return (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="sticky left-0 bg-background px-2 py-1.5 font-medium whitespace-nowrap">{p.role}</td>
                    <td className="px-2 py-1">
                      <Input
                        type="number" min={0} max={20}
                        value={p.total_hires}
                        onChange={(e) => updatePlanTotal(p.id, Number(e.target.value))}
                        className={cn(
                          "h-7 w-14 text-center font-mono tabular-nums",
                          mismatch && "border-amber-400",
                        )}
                      />
                    </td>
                    {ALL_SOURCES.map((s) => (
                      <td key={s} className="px-1 py-1 text-center">
                        <Input
                          type="number" min={0} max={20}
                          value={p.mix[s] ?? 0}
                          onChange={(e) => updatePlanMix(p.id, s, Number(e.target.value))}
                          className="h-7 w-12 text-center text-xs font-mono tabular-nums"
                        />
                      </td>
                    ))}
                    <td className="bg-muted/20 px-2 py-1.5 text-right font-mono font-bold tabular-nums">
                      {fmtJpy(planCost)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 bg-muted/40">
                <td className="sticky left-0 bg-muted/40 px-2 py-1.5 font-semibold">合計</td>
                <td className="px-2 py-1.5 text-center font-bold tabular-nums">{totals.totalHires}</td>
                {ALL_SOURCES.map((s) => {
                  const v = totals.bySource.get(s);
                  return (
                    <td key={s} className="px-1 py-1.5 text-center font-mono tabular-nums">
                      {v?.hires ?? 0}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-right font-mono font-bold tabular-nums">
                  {fmtJpy(totals.totalCost)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 月次バーチャート */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">月次予算試算</h3>
          <div className="flex h-48 items-end gap-1">
            {monthly.map((m) => {
              const h = (m.cost / maxMonthCost) * 100;
              return (
                <div key={m.month} className="group relative flex flex-1 flex-col items-stretch justify-end gap-0.5"
                  title={`${m.month}: ${m.hires} 名 / ${fmtJpy(m.cost)}`}>
                  <div className="text-center text-[9px] text-muted-foreground tabular-nums">
                    {m.hires > 0 ? `${m.hires}名` : ""}
                  </div>
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-gc-700 to-gc-400 group-hover:from-emerald-700 group-hover:to-emerald-400"
                      style={{ height: `${Math.max(2, h)}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground text-center">{m.month}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 経路別比率 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">経路別 予算配分</h3>
          <ul className="space-y-2">
            {[...totals.bySource.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([src, v]) => {
              const pct = (v.cost / totals.totalCost) * 100;
              return (
                <li key={src} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{SOURCE_LABEL[src]}</span>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-xs text-muted-foreground">{v.hires} 名</span>
                      <span className="font-mono font-bold">{fmtJpy(v.cost)}</span>
                      <span className="font-mono text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn(
                      "h-full",
                      CPH_TONE[src] === "good" ? "bg-gradient-to-r from-emerald-400 to-emerald-600" :
                      CPH_TONE[src] === "bad" ? "bg-gradient-to-r from-red-400 to-red-600" :
                      "bg-gradient-to-r from-gc-400 to-gc-600",
                    )} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 rounded-md border bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            💡 <strong>最適化のヒント：</strong> エージェント経由は CPH が ¥1.5M と高め。
            リファラル / 業務委託転換のミックスを増やすと総予算を 30-50% 圧縮できる可能性があります。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, unit, tone }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "muted";
}) {
  const cls =
    tone === "primary" ? "border-gc-200 bg-gc-50/40" :
    tone === "muted"   ? "" : "";
  return (
    <Card className={cn(cls)}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
