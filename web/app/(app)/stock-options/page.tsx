"use client";

import { LineChart, TrendingUp, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const grants = [
  { id: "g-1", employee_id: "e1",  granted_at: "2020-04-01", shares: 80_000, exercise_price: 100, vested: 80_000, exercised: 0,     status: "qualified", type: "ESOP" },
  { id: "g-2", employee_id: "e2",  granted_at: "2021-04-01", shares: 30_000, exercise_price: 200, vested: 30_000, exercised: 0,     status: "qualified", type: "ESOP" },
  { id: "g-3", employee_id: "e3",  granted_at: "2020-04-01", shares: 50_000, exercise_price: 100, vested: 50_000, exercised: 10_000, status: "qualified", type: "ESOP" },
  { id: "g-4", employee_id: "e4",  granted_at: "2021-07-01", shares: 25_000, exercise_price: 250, vested: 18_750, exercised: 0,     status: "qualified", type: "ESOP" },
  { id: "g-5", employee_id: "e8",  granted_at: "2021-09-01", shares: 18_000, exercise_price: 280, vested: 12_000, exercised: 0,     status: "qualified", type: "ESOP" },
  { id: "g-6", employee_id: "e9",  granted_at: "2022-02-01", shares: 12_000, exercise_price: 320, vested: 6_000,  exercised: 0,     status: "qualified", type: "ESOP" },
  { id: "g-7", employee_id: "e14", granted_at: "2022-06-01", shares: 10_000, exercise_price: 350, vested: 5_000,  exercised: 0,     status: "qualified", type: "ESOP" },
  { id: "g-8", employee_id: "e26", granted_at: "2021-02-01", shares: 28_000, exercise_price: 200, vested: 28_000, exercised: 0,     status: "qualified", type: "ESOP" },
  { id: "g-9", employee_id: "e16", granted_at: "2022-01-01", shares: 8_000,  exercise_price: 320, vested: 5_000,  exercised: 0,     status: "qualified", type: "ESOP" },
  { id: "g-10", employee_id: "e23", granted_at: "2022-05-01", shares: 7_000, exercise_price: 350, vested: 3_500,  exercised: 0,     status: "qualified", type: "ESOP" },
];

const empMap = new Map(DEMO_EMPLOYEES.map((e) => [e.id, e]));
const currentSharePrice = 850;  // 直近時価（仮想）

export default function StockOptionsPage() {
  const totalGranted = grants.reduce((s, g) => s + g.shares, 0);
  const totalVested = grants.reduce((s, g) => s + g.vested, 0);
  const totalExercised = grants.reduce((s, g) => s + g.exercised, 0);
  const totalUnrealizedValue = grants.reduce((s, g) => s + (g.vested - g.exercised) * (currentSharePrice - g.exercise_price), 0);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LineChart className="size-6 text-gc-700" />
            ストックオプション管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SO 付与・vesting・行使状況・税制適格チェック。経営層・キーポジション向け。
          </p>
        </div>
        <Button>新規付与</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="付与総数" value={totalGranted.toLocaleString()} unit="株" tone="primary" icon={LineChart} />
        <KpiTile label="vested 累計" value={totalVested.toLocaleString()} unit="株" tone="success" icon={TrendingUp} />
        <KpiTile label="行使済" value={totalExercised.toLocaleString()} unit="株" tone="muted" icon={FileText} />
        <KpiTile label="評価益（仮想）" value={`¥${(totalUnrealizedValue / 1_000_000).toFixed(1)}M`} unit="" tone="success" icon={TrendingUp} />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">仮想時価情報</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-md bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">直近時価</div>
              <div className="mt-0.5 text-xl font-bold">¥{currentSharePrice}</div>
              <div className="text-[10px] text-muted-foreground">最終評価日 2026/04/30</div>
            </div>
            <div className="rounded-md bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">前評価比</div>
              <div className="mt-0.5 text-xl font-bold text-emerald-700">+38%</div>
              <div className="text-[10px] text-muted-foreground">2025/10 〜 2026/04</div>
            </div>
            <div className="rounded-md bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">直近の評価差</div>
              <div className="mt-0.5 text-xs">¥850 vs 行使価格 ¥100〜350</div>
              <div className="text-[10px] text-muted-foreground">付与時期で大きく差</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">付与一覧</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">受給者</th>
                  <th className="px-3 py-2 text-left font-medium">付与日</th>
                  <th className="px-3 py-2 text-right font-medium">付与株数</th>
                  <th className="px-3 py-2 text-right font-medium">行使価格</th>
                  <th className="px-3 py-2 text-right font-medium">vested</th>
                  <th className="px-3 py-2 text-right font-medium">行使済</th>
                  <th className="px-3 py-2 text-right font-medium">評価益</th>
                  <th className="px-3 py-2 font-medium">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {grants.map((g) => {
                  const e = empMap.get(g.employee_id);
                  if (!e) return null;
                  const unrealized = (g.vested - g.exercised) * (currentSharePrice - g.exercise_price);
                  const vestedPct = (g.vested / g.shares) * 100;
                  return (
                    <tr key={g.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                          <div>
                            <div className="text-sm font-medium">{e.full_name}</div>
                            <div className="text-[10px] text-muted-foreground">{e.job_title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{g.granted_at}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{g.shares.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">¥{g.exercise_price}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-mono tabular-nums">{g.vested.toLocaleString()}</div>
                        <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-muted ml-auto">
                          <div className="h-full bg-emerald-500" style={{ width: `${vestedPct}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{g.exercised.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-emerald-700">¥{(unrealized / 10000).toFixed(0)}万</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="success" className="text-[10px]">税制適格</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">税制適格 SO の要件</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>・付与価格 ≥ 付与時の時価（権利行使価額）</li>
            <li>・権利行使期間: 付与決議日後 2 年経過 〜 10 年以内</li>
            <li>・年間権利行使価額の合計額 ≤ 1,200 万円</li>
            <li>・付与契約に譲渡禁止条項を含む</li>
            <li>・付与対象者の議決権行使制限なし（一定割合以下）</li>
          </ul>
        </CardContent>
      </Card>
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
