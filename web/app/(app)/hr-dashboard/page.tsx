"use client";

import { BarChart3, Users2, TrendingUp, Globe2, AlertTriangle, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS, OFFICES } from "@/lib/demo/employees";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { downloadCsv } from "@/lib/csv";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function HrDashboardPage() {
  const t = useT();
  const [tab, setTab] = useState<"overview" | "diversity" | "trends" | "cost">("overview");

  // ヘッドカウント関連
  const total = DEMO_EMPLOYEES.length;
  const fullTime = DEMO_EMPLOYEES.filter((e) => e.employment_type === "full_time").length;
  const intern = DEMO_EMPLOYEES.filter((e) => e.employment_type === "intern").length;
  const contractor = DEMO_EMPLOYEES.filter((e) => e.employment_type === "business_partner").length;
  const foreign = DEMO_EMPLOYEES.filter((e) => e.is_foreign_national).length;
  const _female = 0;  // demo data に性別なし、ダミー

  // 部門サイズ
  const deptStats = DEMO_DEPARTMENTS.map((d) => ({
    ...d,
    count: DEMO_EMPLOYEES.filter((e) => e.department_id === d.id).length,
  })).sort((a, b) => b.count - a.count);

  // 国別
  const byCountry = new Map<string, number>();
  for (const e of DEMO_EMPLOYEES) byCountry.set(e.nationality, (byCountry.get(e.nationality) ?? 0) + 1);
  const sortedCountry = [...byCountry.entries()].sort((a, b) => b[1] - a[1]);

  const periodLabel = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  const exportHeadcountCsv = () => {
    const rows: (string | number)[][] = [
      ["指標", "値"],
      ["総ヘッドカウント", total],
      ["正社員", fullTime],
      ["インターン", intern],
      ["業務委託", contractor],
      ["外国籍", foreign],
      ["", ""],
      ["部門", "人数"],
      ...deptStats.map((d) => [d.name, d.count]),
      ["", ""],
      ["国籍", "人数"],
      ...sortedCountry.map(([code, count]) => {
        const office = OFFICES.find((o) => o.code.startsWith(code + "-"));
        return [office?.country ?? code, count];
      }),
    ];
    downloadCsv(`hr-dashboard-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BarChart3 className="size-6 text-gc-700" />
            {t("page.hrDashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("page.hrDashboard.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={exportHeadcountCsv} className="gap-1.5">
          <Download className="size-4" />
          CSV エクスポート
        </Button>
      </div>

      {/* AI 経営サマリ */}
      <AiGeneratePanel
        title="AI 経営サマリ生成"
        endpoint="/api/ai/dashboard-narrative"
        hint="現在のダッシュボードの数値から、CEO 向けの 3 段落の意思決定サマリを生成します。"
        buttonLabel="経営サマリを生成"
        payload={() => ({
          period: periodLabel,
          totalHeadcount: total,
          prevHeadcount: total - 12,
          fullTimeRatio: fullTime / total,
          foreignRatio: foreign / total,
          attritionRate: 0.095,
          topDept: deptStats[0] ? { name: deptStats[0].name, count: deptStats[0].count } : undefined,
          hires30d: 9,
          exits30d: 3,
        })}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="総ヘッドカウント" value={total} unit="名" tone="primary" icon={Users2} />
        <KpiTile label="正社員比率" value={`${Math.round((fullTime / total) * 100)}%`} unit="" tone="success" icon={TrendingUp} />
        <KpiTile label="外国籍比率" value={`${Math.round((foreign / total) * 100)}%`} unit="" tone="muted" icon={Globe2} />
        <KpiTile label="今期離職率" value="9.5%" unit="" tone="warning" icon={AlertTriangle} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="overview">サマリー</TabsTrigger>
          <TabsTrigger value="diversity">ダイバーシティ</TabsTrigger>
          <TabsTrigger value="trends">トレンド</TabsTrigger>
          <TabsTrigger value="cost">HRコスト</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">雇用形態</h3>
                <ul className="space-y-2">
                  {[
                    { label: "正社員",    count: fullTime, color: "bg-gc-500" },
                    { label: "インターン", count: intern,   color: "bg-amber-500" },
                    { label: "業務委託",  count: contractor, color: "bg-purple-500" },
                  ].map((row) => {
                    const pct = (row.count / total) * 100;
                    return (
                      <li key={row.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{row.label}</span>
                          <span className="font-bold tabular-nums">{row.count} 名 ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full", row.color)} style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">部門別ヘッドカウント</h3>
                <ul className="space-y-2">
                  {deptStats.map((d) => {
                    const pct = (d.count / total) * 100;
                    return (
                      <li key={d.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{d.name}</span>
                          <span className="font-bold tabular-nums">{d.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-gc-600" style={{ width: `${pct * 5}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diversity">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">国籍分布</h3>
              <ul className="space-y-2">
                {sortedCountry.map(([code, count]) => {
                  const pct = (count / total) * 100;
                  const office = OFFICES.find((o) => o.code.startsWith(code + "-"));
                  return (
                    <li key={code} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{office?.countryEmoji ?? "🌐"} {office?.country ?? code}</span>
                        <span className="font-bold tabular-nums">{count} 名 ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">月別ヘッドカウント推移</h3>
              <div className="flex h-48 items-end justify-between gap-2">
                {[
                  { month: "11月", value: 268 },
                  { month: "12月", value: 274 },
                  { month: "1月",  value: 280 },
                  { month: "2月",  value: 285 },
                  { month: "3月",  value: 290 },
                  { month: "4月",  value: 295 },
                  { month: "5月",  value: 297 },
                ].map((d) => (
                  <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-gc-700 to-gc-400"
                        style={{ height: `${(d.value / 300) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground">{d.month}</span>
                    <span className="text-[10px] font-bold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">HRコスト サマリー（仮想・年換算）</h3>
              <ul className="space-y-2">
                <CostRow label="人件費（給与・賞与）" value="¥3,800M" pct={75} />
                <CostRow label="採用コスト" value="¥120M" pct={2.4} />
                <CostRow label="研修・L&D" value="¥45M" pct={0.9} />
                <CostRow label="福利厚生" value="¥220M" pct={4.4} />
                <CostRow label="業務委託" value="¥320M" pct={6.4} />
                <CostRow label="その他（健診・保険）" value="¥30M" pct={0.6} />
              </ul>
              <div className="mt-3 rounded-md border-2 border-gc-300 bg-gc-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">総 HR コスト</span>
                  <span className="font-mono text-lg font-bold">¥4,535M</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CostRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${Math.min(pct * 1.3, 100)}%` }} />
      </div>
    </li>
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
