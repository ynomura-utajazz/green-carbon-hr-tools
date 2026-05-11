"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, AlertTriangle, Calendar, FileCheck2, Plus, TrendingUp, Users2 } from "lucide-react";
import { DEMO_EMPLOYEES, DEMO_DEPARTMENTS } from "@/lib/demo/employees";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LeaveStatus = "pending" | "approved" | "rejected";

const leaveRequests = [
  { id: "lr-1", employee_id: "e23", kind: "annual", days: 3, starts: "2026-05-22", ends: "2026-05-24", status: "pending" as LeaveStatus, reason: "私用" },
  { id: "lr-2", employee_id: "e9",  kind: "annual", days: 2, starts: "2026-05-15", ends: "2026-05-16", status: "pending" as LeaveStatus, reason: "通院" },
  { id: "lr-3", employee_id: "e15", kind: "summer", days: 5, starts: "2026-08-12", ends: "2026-08-16", status: "pending" as LeaveStatus, reason: "夏季休暇" },
  { id: "lr-4", employee_id: "e10", kind: "annual", days: 1, starts: "2026-05-09", ends: "2026-05-09", status: "approved" as LeaveStatus, reason: "私用" },
  { id: "lr-5", employee_id: "e18", kind: "sick",   days: 2, starts: "2026-05-04", ends: "2026-05-05", status: "approved" as LeaveStatus, reason: "体調不良" },
];

// 残業上位（36協定アラート）
const overtimeRanking = [
  { employee_id: "e23", overtime_h: 87, status: "danger" },
  { employee_id: "e10", overtime_h: 72, status: "warning" },
  { employee_id: "e9",  overtime_h: 68, status: "warning" },
  { employee_id: "e8",  overtime_h: 58, status: "watch" },
  { employee_id: "e16", overtime_h: 52, status: "watch" },
];

// 有給取得率（部署別）
const annualLeaveTaking = [
  { dept_id: "d-corp",    rate: 85 },
  { dept_id: "d-hr",      rate: 78 },
  { dept_id: "d-design",  rate: 76 },
  { dept_id: "d-fin",     rate: 72 },
  { dept_id: "d-product", rate: 68 },
  { dept_id: "d-bizdev",  rate: 65 },
  { dept_id: "d-eng",     rate: 60 },
  { dept_id: "d-mkt",     rate: 52 },
  { dept_id: "d-global",  rate: 70 },
];

const empMap = new Map(DEMO_EMPLOYEES.map((e) => [e.id, e]));
const deptMap = new Map(DEMO_DEPARTMENTS.map((d) => [d.id, d]));

const KIND_LABEL: Record<string, string> = {
  annual: "年次有給",
  sick: "病欠",
  summer: "夏季休暇",
  special: "特別休暇",
  maternity: "産休",
  paternity: "育休",
};

export default function AttendancePage() {
  const [tab, setTab] = useState<"summary" | "leaves" | "overtime">("summary");

  const pending = leaveRequests.filter((l) => l.status === "pending");
  const overtimeAlert = overtimeRanking.filter((o) => o.status === "danger" || o.status === "warning").length;
  const avgLeaveRate = Math.round(annualLeaveTaking.reduce((s, l) => s + l.rate, 0) / annualLeaveTaking.length);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Clock className="size-6 text-gc-700" />
            勤怠・休暇管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            残業時間・休暇申請・36協定遵守を一元管理。freee 連携で勤怠データ自動同期。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          休暇申請
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={FileCheck2} label="承認待ち申請" value={pending.length} unit="件" tone={pending.length > 0 ? "primary" : "muted"} />
        <KpiTile icon={AlertTriangle} label="36協定アラート" value={overtimeAlert} unit="名" tone={overtimeAlert > 0 ? "danger" : "muted"} />
        <KpiTile icon={Calendar} label="平均有給取得率" value={`${avgLeaveRate}%`} unit="" tone={avgLeaveRate >= 70 ? "success" : "warning"} />
        <KpiTile icon={Users2} label="今日の出勤" value={28} unit="/ 30名" tone="success" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="summary" className="gap-2"><TrendingUp className="size-3.5" />サマリー</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-2"><Calendar className="size-3.5" />休暇申請 ({pending.length})</TabsTrigger>
          <TabsTrigger value="overtime" className="gap-2"><AlertTriangle className="size-3.5" />残業管理</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">部署別 有給取得率</h3>
                <ul className="space-y-2">
                  {annualLeaveTaking.sort((a, b) => b.rate - a.rate).map((row) => {
                    const d = deptMap.get(row.dept_id);
                    if (!d) return null;
                    return (
                      <li key={row.dept_id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{d.name}</span>
                          <span className="font-bold tabular-nums">{row.rate}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full",
                              row.rate >= 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                                : row.rate >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-600"
                                : "bg-gradient-to-r from-red-400 to-red-600",
                            )}
                            style={{ width: `${row.rate}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">残業時間 上位</h3>
                <ul className="space-y-2">
                  {overtimeRanking.map((row) => {
                    const e = empMap.get(row.employee_id);
                    if (!e) return null;
                    return (
                      <li key={row.employee_id} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
                        <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{e.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">{e.job_title}</div>
                        </div>
                        <span className={cn(
                          "rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums",
                          row.status === "danger" ? "border-red-300 bg-red-50 text-red-900"
                            : row.status === "warning" ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-blue-200 bg-blue-50 text-blue-800",
                        )}>
                          {row.overtime_h}h
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-[10px] text-muted-foreground">
                  ※ 36協定特別条項：月100時間未満・年720時間以下
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaves">
          <ul className="space-y-2">
            {leaveRequests.map((lr) => {
              const e = empMap.get(lr.employee_id);
              if (!e) return null;
              return (
                <Card key={lr.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Avatar className="size-9"><AvatarFallback>{initials(e.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.full_name}</span>
                        <Badge variant="outline" className="text-[10px]">{KIND_LABEL[lr.kind]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lr.starts} 〜 {lr.ends}（{lr.days}日）· 理由: {lr.reason}
                      </div>
                    </div>
                    {lr.status === "pending" ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => toast.success("休暇申請を却下しました")}>却下</Button>
                        <Button size="sm" onClick={() => toast.success("休暇申請を承認しました")}>承認</Button>
                      </div>
                    ) : (
                      <Badge variant={lr.status === "approved" ? "success" : "danger"}>
                        {lr.status === "approved" ? "承認済" : "却下"}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="overtime">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">36協定 月次トラッキング</h3>
              <ul className="space-y-2">
                {overtimeRanking.map((row) => {
                  const e = empMap.get(row.employee_id);
                  if (!e) return null;
                  const limit36 = 100;
                  const pct = (row.overtime_h / limit36) * 100;
                  return (
                    <li key={row.employee_id} className="rounded-md border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{e.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">{e.job_title}</div>
                        </div>
                        <span className={cn(
                          "font-mono text-sm tabular-nums",
                          row.status === "danger" ? "text-red-700 font-bold"
                            : row.status === "warning" ? "text-amber-700"
                            : "text-blue-700",
                        )}>
                          {row.overtime_h}h / 100h
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full",
                            row.status === "danger" ? "bg-red-500"
                              : row.status === "warning" ? "bg-amber-500"
                              : "bg-blue-500",
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
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
        <div className="min-w-0 flex-1">
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
