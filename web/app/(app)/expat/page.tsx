"use client";

import { PlaneTakeoff, Globe2, DollarSign, Calendar, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const expats = [
  { id: "ex-1", name: "石川 拓哉", country: "🇸🇬 シンガポール", role: "ASEAN 統括", started: "2025-04-01", until: "2027-03-31",  housing_allowance: 350_000, hardship: 100_000, family_count: 0, status: "active" },
  { id: "ex-2", name: "Lopez Maria", country: "🇵🇭 フィリピン",   role: "ASEAN リード", started: "2025-08-01", until: "2027-07-31",  housing_allowance: 200_000, hardship: 150_000, family_count: 2, status: "active" },
  { id: "ex-3", name: "Saw Jasmine", country: "🇲🇾 マレーシア",   role: "シニアコンサル", started: "2026-02-01", until: "2027-01-31",  housing_allowance: 220_000, hardship: 100_000, family_count: 0, status: "active" },
];

export default function ExpatPage() {
  const totalAllowance = expats.reduce((s, e) => s + e.housing_allowance + e.hardship, 0);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <PlaneTakeoff className="size-6 text-gc-700" />
            海外赴任管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            駐在員の手当・税務・赴任期間・帯同家族・社会保険の一元管理。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          新規赴任
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="現役駐在員" value={expats.length} unit="名" icon={PlaneTakeoff} tone="primary" />
        <KpiTile label="月額手当総額" value={`¥${(totalAllowance / 10000).toFixed(0)}万`} unit="" icon={DollarSign} tone="primary" />
        <KpiTile label="帯同家族" value={2} unit="名" icon={Globe2} tone="muted" />
        <KpiTile label="今年帰任予定" value={1} unit="名" icon={Calendar} tone="warning" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">現役駐在員</h3>
          <ul className="space-y-2">
            {expats.map((e) => {
              const totalAll = e.housing_allowance + e.hardship;
              return (
                <li key={e.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-9"><AvatarFallback>{initials(e.name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{e.name}</span>
                        <span className="text-sm">{e.country}</span>
                        <Badge variant="success">駐在中</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {e.role} · {formatDate(e.started)} 〜 {formatDate(e.until)}
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-muted/30 p-2">
                          <div className="text-[10px] text-muted-foreground">住宅手当</div>
                          <div className="font-mono tabular-nums">¥{e.housing_allowance.toLocaleString()}</div>
                        </div>
                        <div className="rounded-md bg-muted/30 p-2">
                          <div className="text-[10px] text-muted-foreground">ハードシップ</div>
                          <div className="font-mono tabular-nums">¥{e.hardship.toLocaleString()}</div>
                        </div>
                        <div className="rounded-md bg-gc-50 p-2">
                          <div className="text-[10px] text-muted-foreground">月額合計</div>
                          <div className="font-mono font-bold tabular-nums">¥{totalAll.toLocaleString()}</div>
                        </div>
                      </div>
                      {e.family_count > 0 && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          帯同家族 {e.family_count} 名（教育費補助対象）
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">海外赴任 法務・税務チェック</h3>
          <ul className="space-y-1.5 text-xs">
            <li className="rounded-md border bg-card p-2">✅ 居住者証明書の取得</li>
            <li className="rounded-md border bg-card p-2">✅ 租税条約の適用申請</li>
            <li className="rounded-md border bg-card p-2">✅ 海外旅行保険・医療保険の加入</li>
            <li className="rounded-md border bg-card p-2">⚠️ 帯同家族のビザ（FQ・配偶者ビザ）— 1 件確認中</li>
            <li className="rounded-md border bg-card p-2">✅ 二重課税の調整 (Tax Equalization)</li>
            <li className="rounded-md border bg-card p-2">✅ 厚生年金・健保の取扱い（出向期間扱い）</li>
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
