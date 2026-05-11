"use client";

import { Users2, Activity, MessageSquare, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_RETENTION } from "@/lib/demo/retention";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const myReports = DEMO_EMPLOYEES.filter((e) => e.manager_id === "e1");
const _empMap = new Map(DEMO_EMPLOYEES.map((e) => [e.id, e]));
const retentionMap = new Map(DEMO_RETENTION.map((r) => [r.employee_id, r]));

export default function TeamPage() {
  const _stale = myReports.filter((_e) => true).slice(0, 2).length;
  const highRisk = myReports.filter((e) => {
    const r = retentionMap.get(e.id);
    return r && (r.level === "high" || r.level === "critical");
  }).length;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users2 className="size-6 text-gc-700" />
          チーム管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          自チームメンバーのリスク・1on1進捗・評価ステータスを一画面で。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="チームサイズ" value={myReports.length} unit="名" icon={Users2} tone="primary" />
        <KpiTile label="高リスク" value={highRisk} unit="名" icon={AlertTriangle} tone={highRisk > 0 ? "danger" : "muted"} />
        <KpiTile label="今週 1on1 完了" value={3} unit={`/ ${myReports.length}`} icon={MessageSquare} tone="primary" />
        <KpiTile label="平均パフォーマンス" value="A" unit="" icon={Activity} tone="success" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">メンバー総合ダッシュボード</h3>
          <ul className="space-y-2">
            {myReports.map((e) => {
              const r = retentionMap.get(e.id);
              return (
                <li key={e.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9"><AvatarFallback>{initials(e.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{e.full_name}</div>
                      <div className="text-xs text-muted-foreground">{e.job_title}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {r && (
                        <Badge variant={r.level === "low" ? "success" : r.level === "medium" ? "warning" : "danger"} className="text-[10px]">
                          リスク {r.level === "low" ? "低" : r.level === "medium" ? "中" : "高"}
                        </Badge>
                      )}
                      <Link href="/oneonone" className="text-xs text-blue-700 hover:underline">1on1 →</Link>
                      <Link href="/mbo-okr" className="text-xs text-blue-700 hover:underline">OKR →</Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-md border border-blue-200 bg-blue-50/40 p-4 text-sm">
        <p className="font-medium text-blue-900">マネージャー向けハブ</p>
        <p className="mt-1 text-xs text-muted-foreground">
          各メンバーの詳細は専用ツールから：
          <Link href="/oneonone" className="ml-2 text-blue-700 hover:underline">1on1 マネージャー</Link>
          ／<Link href="/retention" className="text-blue-700 hover:underline">離職リスク</Link>
          ／<Link href="/mbo-okr" className="text-blue-700 hover:underline">OKR</Link>
          ／<Link href="/pulse-survey" className="text-blue-700 hover:underline">サーベイ結果</Link>
        </p>
      </div>
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
