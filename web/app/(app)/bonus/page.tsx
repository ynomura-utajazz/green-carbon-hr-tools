"use client";

import { Coins, TrendingUp, Calendar, Users2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const distribution = [
  { grade: "S",   count: 8,  multiplier: 2.0, label: "S 評価" },
  { grade: "A",   count: 35, multiplier: 1.5, label: "A 評価" },
  { grade: "B",   count: 142, multiplier: 1.0, label: "B 評価（標準）" },
  { grade: "C",   count: 85, multiplier: 0.7, label: "C 評価" },
  { grade: "D",   count: 12, multiplier: 0.4, label: "D 評価" },
];

const departmentBonus = [
  { dept: "経営企画", base: 7_500_000, bonus_pool: 18_000_000, count: 8 },
  { dept: "プロダクト", base: 4_200_000, bonus_pool: 8_400_000, count: 12 },
  { dept: "技術",      base: 4_800_000, bonus_pool: 12_500_000, count: 75 },
  { dept: "事業開発", base: 4_500_000, bonus_pool: 11_200_000, count: 35 },
  { dept: "マーケティング", base: 3_800_000, bonus_pool: 6_300_000, count: 25 },
  { dept: "人事",      base: 4_000_000, bonus_pool: 5_200_000, count: 12 },
];

export default function BonusPage() {
  const [tab, setTab] = useState<"summary" | "distribution" | "by_dept">("summary");
  const totalBudget = departmentBonus.reduce((s, d) => s + d.bonus_pool, 0);
  const totalEmp = departmentBonus.reduce((s, d) => s + d.count, 0);
  const avgBonus = Math.round(totalBudget / totalEmp);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Coins className="size-6 text-gc-700" />
            賞与管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            賞与原資の配賦・MBO 評価連動の支給シミュレーション・四半期/半期サイクル管理。
          </p>
        </div>
        <Button>賞与シミュレーションを実行</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="原資総額" value={`¥${(totalBudget / 1_000_000).toFixed(1)}M`} unit="" tone="primary" icon={Coins} />
        <KpiTile label="対象社員" value={totalEmp} unit="名" tone="primary" icon={Users2} />
        <KpiTile label="一人あたり平均" value={`¥${(avgBonus / 10000).toFixed(0)}万`} unit="" tone="success" icon={TrendingUp} />
        <KpiTile label="次回支給日" value="7/5" unit="" tone="muted" icon={Calendar} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="summary">サマリー</TabsTrigger>
          <TabsTrigger value="distribution">評価分布</TabsTrigger>
          <TabsTrigger value="by_dept">部門別配賦</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardContent className="space-y-4 p-4">
              <h3 className="text-sm font-semibold">夏季賞与 2026 配分ロジック</h3>
              <p className="text-sm text-muted-foreground">
                <strong>個人賞与 = 基本給 × 月数係数 × 評価係数 × 部門係数</strong>
              </p>
              <ul className="space-y-2 text-sm">
                <li className="rounded-md border bg-muted/30 p-3">
                  <strong>月数係数</strong>: 1.5 〜 2.5 ヶ月分（ジョブグレード別）
                </li>
                <li className="rounded-md border bg-muted/30 p-3">
                  <strong>評価係数</strong>: S=2.0 / A=1.5 / B=1.0 / C=0.7 / D=0.4
                </li>
                <li className="rounded-md border bg-muted/30 p-3">
                  <strong>部門係数</strong>: 部門 OKR 達成率に応じ 0.9 〜 1.1
                </li>
              </ul>
              <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3 text-xs text-amber-900">
                Q1 評価結果と OKR 達成率は <strong>MBO×OKR</strong> ツールから自動取得されます。
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">評価分布（2026 Q1 実績）</h3>
              <ul className="space-y-2">
                {distribution.map((d) => {
                  const total = distribution.reduce((s, x) => s + x.count, 0);
                  const pct = (d.count / total) * 100;
                  return (
                    <li key={d.grade} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono font-bold">{d.grade}</span>
                        <span className="text-xs text-muted-foreground">{d.label} · 係数 {d.multiplier}x</span>
                        <span className="font-bold tabular-nums">{d.count}名 ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full",
                            d.grade === "S" ? "bg-purple-500"
                              : d.grade === "A" ? "bg-emerald-500"
                              : d.grade === "B" ? "bg-blue-500"
                              : d.grade === "C" ? "bg-amber-500"
                              : "bg-red-500",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by_dept">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">部門別 賞与原資配分</h3>
              <ul className="space-y-2">
                {departmentBonus.map((d) => (
                  <li key={d.dept} className="rounded-md border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{d.dept}</span>
                      <span className="font-mono tabular-nums">¥{(d.bonus_pool / 1_000_000).toFixed(1)}M</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      対象 {d.count}名 ・ 一人あたり平均 ¥{(d.bonus_pool / d.count / 10000).toFixed(0)}万
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiTile({
  icon: Icon, label, value, unit, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const cls = {
    primary: "text-gc-700 bg-gc-50 border-gc-200",
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-800 bg-amber-50 border-amber-200",
    danger: "text-red-800 bg-red-50 border-red-200",
    muted: "text-muted-foreground bg-muted/50 border-border",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
