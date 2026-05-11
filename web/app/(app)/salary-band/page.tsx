"use client";

import { Wallet, TrendingUp, Users2, Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const bands = [
  { grade: "EX",  role: "Executive",       min: 15_000_000, mid: 20_000_000, max: 30_000_000, count: 6 },
  { grade: "M4",  role: "Director",        min: 12_000_000, mid: 14_500_000, max: 18_000_000, count: 1 },
  { grade: "M3",  role: "Manager",         min:  9_000_000, mid: 11_000_000, max: 14_000_000, count: 5 },
  { grade: "S5",  role: "Staff",           min:  9_000_000, mid: 11_500_000, max: 14_500_000, count: 3 },
  { grade: "S4",  role: "Senior",          min:  7_500_000, mid:  9_000_000, max: 11_500_000, count: 4 },
  { grade: "S3",  role: "Mid",             min:  6_000_000, mid:  7_500_000, max:  9_000_000, count: 5 },
  { grade: "S2",  role: "Junior",          min:  4_500_000, mid:  5_500_000, max:  7_000_000, count: 3 },
  { grade: "I1",  role: "Intern",          min:  2_400_000, mid:  2_800_000, max:  3_200_000, count: 2 },
  { grade: "C4",  role: "Contractor",      min:  9_000_000, mid: 11_000_000, max: 14_000_000, count: 1 },
];

export default function SalaryBandPage() {
  const total = bands.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wallet className="size-6 text-gc-700" />
            給与帯・昇給管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ジョブグレード別レンジ管理・昇給シミュレーション・市場ベンチマーク。
          </p>
        </div>
        <Button>
          <Edit3 className="size-4" />
          給与帯を編集
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="ジョブグレード数" value={bands.length} unit="" tone="primary" icon={TrendingUp} />
        <KpiTile label="管理対象社員" value={total} unit="名" tone="primary" icon={Users2} />
        <KpiTile label="平均年収" value="¥9.8M" unit="" tone="success" icon={Wallet} />
        <KpiTile label="次回昇給サイクル" value="Q3 2026" unit="" tone="muted" icon={TrendingUp} />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">ジョブグレード別 給与レンジ（円）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">グレード</th>
                  <th className="px-3 py-2 text-left font-medium">役割</th>
                  <th className="px-3 py-2 text-right font-medium">在籍数</th>
                  <th className="px-3 py-2 text-right font-medium">最小</th>
                  <th className="px-3 py-2 text-right font-medium">中央</th>
                  <th className="px-3 py-2 text-right font-medium">最大</th>
                  <th className="px-3 py-2 font-medium">レンジ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bands.map((b) => {
                  const _range = b.max - b.min;
                  return (
                    <tr key={b.grade} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-mono font-semibold">{b.grade}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{b.role}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{b.count}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">¥{(b.min / 10000).toFixed(0)}万</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold">¥{(b.mid / 10000).toFixed(0)}万</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">¥{(b.max / 10000).toFixed(0)}万</td>
                      <td className="px-3 py-2.5">
                        <div className="relative h-4 w-32 overflow-hidden rounded-full bg-muted">
                          <div className="absolute inset-y-0 bg-gradient-to-r from-gc-300 to-gc-600" style={{ width: "100%" }} />
                          <div className="absolute inset-y-0 left-1/2 w-px bg-white/80" />
                        </div>
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
          <h3 className="mb-3 text-sm font-semibold">市場ベンチマーク（仮想データ）</h3>
          <p className="text-xs text-muted-foreground">
            外部給与調査（OpenWork / Wantedly Salary Survey 等）との比較。直近 Q1 で平均的に市場の +5% で推移。エンジニア・デザイナーは特に競争力の維持が重要。
          </p>
          <ul className="mt-3 space-y-2">
            <BenchRow role="シニアエンジニア (S4)" ours="¥900万 (mid)" market="¥850万" delta="+5.9%" tone="success" />
            <BenchRow role="プロダクトデザイナー (S4)" ours="¥900万 (mid)" market="¥820万" delta="+9.8%" tone="success" />
            <BenchRow role="マーケター (S3)" ours="¥750万 (mid)" market="¥780万" delta="-3.8%" tone="warning" />
            <BenchRow role="事業開発 (M3)" ours="¥1,100万 (mid)" market="¥1,050万" delta="+4.8%" tone="success" />
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

function BenchRow({ role, ours, market, delta, tone }: { role: string; ours: string; market: string; delta: string; tone: "success" | "warning" }) {
  return (
    <li className="flex items-center justify-between rounded-md border bg-card p-2.5 text-sm">
      <span>{role}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">市場 {market}</span>
        <span className="font-mono">{ours}</span>
        <span className={cn(
          "rounded-md border px-1.5 py-0.5 text-xs font-bold",
          tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800",
        )}>
          {delta}
        </span>
      </div>
    </li>
  );
}
