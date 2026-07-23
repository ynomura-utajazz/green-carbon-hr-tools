"use client";

import { BadgeCheck, AlertTriangle, Calendar, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { type DemoEmployee } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export type QualCategory = "tech" | "professional" | "compliance" | "language" | "other";

export type Qualification = {
  id: string;
  employee_id: string;
  name: string;
  category: QualCategory;
  expires_at: string | null;
  acquired_at: string;
};

const CAT_LABEL: Record<QualCategory, string> = {
  tech: "技術", professional: "国家資格", compliance: "コンプラ", language: "語学", other: "その他",
};
const CAT_TONE: Record<QualCategory, string> = {
  tech: "border-cyan-200 bg-cyan-50 text-cyan-800",
  professional: "border-purple-200 bg-purple-50 text-purple-800",
  compliance: "border-amber-200 bg-amber-50 text-amber-800",
  language: "border-pink-200 bg-pink-50 text-pink-800",
  other: "border-slate-200 bg-slate-50 text-slate-700",
};

export function QualificationsClient({
  qualifications, employees, nationalHolders, plannedThisTerm,
}: {
  qualifications: Qualification[];
  employees: DemoEmployee[];
  nationalHolders: number;
  plannedThisTerm: number;
}) {
  const now = Date.now();
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const expiring = qualifications.filter((q) => q.expires_at && new Date(q.expires_at).getTime() - now < 60 * 86400_000);
  const valid = qualifications.length;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BadgeCheck className="size-6 text-gc-700" />
            資格・免許管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            業務に必要な資格・免許の保有状況・有効期限・更新スケジュール。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          資格を登録
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="登録資格" value={valid} unit="件" icon={BadgeCheck} tone="primary" />
        <KpiTile label="60日以内に更新必要" value={expiring.length} unit="件" icon={AlertTriangle} tone={expiring.length > 0 ? "warning" : "muted"} />
        <KpiTile label="国家資格保有" value={nationalHolders} unit="名" icon={BadgeCheck} tone="muted" />
        <KpiTile label="今期取得予定" value={plannedThisTerm} unit="件" icon={Calendar} tone="success" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">資格一覧</h3>
          <ul className="space-y-2">
            {[...qualifications].sort((a, b) => {
              const aDays = a.expires_at ? (new Date(a.expires_at).getTime() - now) / 86400_000 : Infinity;
              const bDays = b.expires_at ? (new Date(b.expires_at).getTime() - now) / 86400_000 : Infinity;
              return aDays - bDays;
            }).map((q) => {
              const e = empMap.get(q.employee_id);
              if (!e) return null;
              const daysLeft = q.expires_at ? Math.floor((new Date(q.expires_at).getTime() - now) / 86400_000) : null;
              const urgent = daysLeft !== null && daysLeft < 30;
              const warning = daysLeft !== null && daysLeft >= 30 && daysLeft < 90;
              return (
                <li key={q.id} className={cn(
                  "rounded-md border bg-card p-3",
                  urgent && "border-red-200",
                  warning && "border-amber-200",
                )}>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.full_name}</span>
                        <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", CAT_TONE[q.category])}>
                          {CAT_LABEL[q.category]}
                        </span>
                      </div>
                      <div className="text-sm">{q.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        取得 {q.acquired_at}
                        {q.expires_at ? ` · 有効期限 ${q.expires_at}` : " · 期限なし"}
                      </div>
                    </div>
                    {q.expires_at && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">残り</div>
                        <div className={cn(
                          "font-bold tabular-nums",
                          urgent ? "text-red-700" : warning ? "text-amber-700" : "text-foreground",
                        )}>
                          {daysLeft! >= 0 ? `${daysLeft}日` : "期限切れ"}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
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
