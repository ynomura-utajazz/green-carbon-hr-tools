"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, AlertTriangle, Calendar, FileCheck2, Plus, TrendingUp, Users2 } from "lucide-react";
import { type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { initials, cn } from "@/lib/utils";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveRow = {
  id: string;
  employee_id: string;
  kind: string;
  days: number;
  starts: string;
  ends: string;
  status: LeaveStatus;
  reason: string | null;
};
export type OvertimeRow = { employee_id: string; overtime_h: number; status: "danger" | "warning" | "watch" };
export type LeaveTakingRow = { dept_id: string; rate: number };

const KIND_LABEL: Record<string, string> = {
  annual: "年次有給",
  sick: "病欠",
  summer: "夏季休暇",
  special: "特別休暇",
  maternity: "産休",
  paternity: "育休",
  condolence: "慶弔",
  other: "その他",
};

export function AttendanceClient({
  leaves, overtime, leaveTaking, employees, departments, todayPresent, todayTotal,
}: {
  leaves: LeaveRow[];
  overtime: OvertimeRow[];
  leaveTaking: LeaveTakingRow[];
  employees: DemoEmployee[];
  departments: DemoDept[];
  todayPresent: number;
  todayTotal: number;
}) {
  const [tab, setTab] = useState<"summary" | "leaves" | "overtime">("summary");
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  const pending = leaves.filter((l) => l.status === "pending");
  const overtimeAlert = overtime.filter((o) => o.status === "danger" || o.status === "warning").length;
  const avgLeaveRate =
    leaveTaking.length > 0
      ? Math.round(leaveTaking.reduce((s, l) => s + l.rate, 0) / leaveTaking.length)
      : null;

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
        <KpiTile icon={Calendar} label="平均有給取得率" value={avgLeaveRate === null ? "—" : `${avgLeaveRate}%`} unit="" tone={avgLeaveRate === null ? "muted" : avgLeaveRate >= 70 ? "success" : "warning"} />
        <KpiTile icon={Users2} label="今日の出勤" value={todayPresent} unit={`/ ${todayTotal}名`} tone="success" />
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
                {leaveTaking.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">有給取得率データがありません（付与日数マスタが未整備）</p>
                ) : (
                  <ul className="space-y-2">
                    {[...leaveTaking].sort((a, b) => b.rate - a.rate).map((row) => {
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
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">残業時間 上位</h3>
                {overtime.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">残業データがありません</p>
                ) : (
                  <ul className="space-y-2">
                    {overtime.map((row) => {
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
                )}
                <p className="mt-3 text-[10px] text-muted-foreground">
                  ※ 36協定特別条項：月100時間未満・年720時間以下
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaves">
          {leaves.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">休暇申請がありません</CardContent></Card>
          ) : (
            <ul className="space-y-2">
              {leaves.map((lr) => {
                const e = empMap.get(lr.employee_id);
                if (!e) return null;
                return (
                  <Card key={lr.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <Avatar className="size-9"><AvatarFallback>{initials(e.full_name)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{e.full_name}</span>
                          <Badge variant="outline" className="text-[10px]">{KIND_LABEL[lr.kind] ?? lr.kind}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lr.starts} 〜 {lr.ends}（{lr.days}日）{lr.reason ? `· 理由: ${lr.reason}` : ""}
                        </div>
                      </div>
                      {lr.status === "pending" ? (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => toast.success("休暇申請を却下しました")}>却下</Button>
                          <Button size="sm" onClick={() => toast.success("休暇申請を承認しました")}>承認</Button>
                        </div>
                      ) : (
                        <Badge variant={lr.status === "approved" ? "success" : "danger"}>
                          {lr.status === "approved" ? "承認済" : lr.status === "cancelled" ? "取消" : "却下"}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="overtime">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">36協定 月次トラッキング</h3>
              {overtime.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">残業データがありません</p>
              ) : (
                <ul className="space-y-2">
                  {overtime.map((row) => {
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
              )}
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
