"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  HeartPulse, AlertTriangle, CheckCircle2, ChevronRight, X, CalendarPlus, Plus,
  Clock, AlertCircle, ScrollText, ClipboardCheck, Building2,
} from "lucide-react";
import {
  type HealthRecord, type LawComplianceItem, RESULT_LABEL, RESULT_TONE, recordsByResult,
  followupNeeded, unscheduled, completionRate, recordsByDept,
} from "@/lib/demo/health-check";
import { type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import { sendSlackReminder } from "@/lib/slack";
import { createGoogleCalendarEventUrl } from "@/lib/google-calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials, formatDate, cn } from "@/lib/utils";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

export function HealthCheckClient({
  records, compliance, employees, departments,
}: {
  records: HealthRecord[];
  compliance: LawComplianceItem[];
  employees: DemoEmployee[];
  departments: DemoDept[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const [tab, setTab] = useState<"dashboard" | "all" | "law">("dashboard");
  const [selected, setSelected] = useState<HealthRecord | null>(null);

  // KPI
  const completion = completionRate();
  const followups = followupNeeded();
  const unscheduledList = unscheduled();
  const grouped = recordsByResult();
  const violations = compliance.filter((c) => c.status !== "ok").length;

  const byDept = recordsByDept(employees.map((e) => ({ id: e.id, department_id: e.department_id })));

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HeartPulse className="size-6 text-gc-700" />
            健康診断管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            労安法に基づく定期健診・要再検査・産業医面談の一元管理。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          受診記録を追加
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={ClipboardCheck} label="受診率" value={`${completion}%`} unit="" tone={completion >= 80 ? "success" : "warning"} hint={`${records.filter(r => r.checked_at).length} / ${records.length} 名`} onClick={() => setTab("dashboard")} />
        <KpiTile icon={AlertCircle} label="要再検査・要精密" value={followups.length} unit="名" tone={followups.length > 0 ? "danger" : "muted"} hint="C・D 判定" onClick={() => setTab("all")} disabled={followups.length === 0} />
        <KpiTile icon={Clock} label="未予約" value={unscheduledList.length} unit="名" tone={unscheduledList.length > 0 ? "warning" : "muted"} hint="日程調整必要" onClick={() => setTab("all")} disabled={unscheduledList.length === 0} />
        <KpiTile icon={ScrollText} label="法令準拠" value={`${compliance.length - violations} / ${compliance.length}`} unit="" tone={violations > 0 ? "warning" : "success"} hint="法令チェック" onClick={() => setTab("law")} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2"><HeartPulse className="size-3.5" />ダッシュボード</TabsTrigger>
          <TabsTrigger value="all" className="gap-2">全社員 ({records.length})</TabsTrigger>
          <TabsTrigger value="law" className="gap-2"><ScrollText className="size-3.5" />法令チェック</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* 結果分布 */}
            <Card className="lg:col-span-1">
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold">結果分布</h3>
                <ul className="space-y-2">
                  {(["A", "B", "C", "D"] as const).map((r) => {
                    const count = grouped.get(r)?.length ?? 0;
                    const pct = (count / records.length) * 100;
                    return (
                      <li key={r} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", RESULT_TONE[r])}>
                            {r}: {RESULT_LABEL[r]}
                          </span>
                          <span className="font-bold tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full",
                              r === "A" ? "bg-emerald-500"
                                : r === "B" ? "bg-blue-500"
                                : r === "C" ? "bg-amber-500"
                                : "bg-red-500",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                  <li className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="rounded-full border bg-muted px-2 py-0.5 text-[10px]">未受診</span>
                      <span className="font-bold tabular-nums">{grouped.get("未受診")?.length ?? 0}</span>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 部署別受診率 */}
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="size-4 text-gc-700" />
                  部署別 受診率
                </h3>
                <ul className="space-y-2">
                  {[...byDept.entries()]
                    .map(([deptId, v]) => ({ deptId, ...v, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0 }))
                    .sort((a, b) => b.pct - a.pct)
                    .map((row) => {
                      const d = deptMap.get(row.deptId);
                      if (!d) return null;
                      return (
                        <li key={row.deptId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{d.name}</span>
                            <span className="font-bold tabular-nums">
                              {row.done} / {row.total}（{row.pct}%）
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full",
                                row.pct >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                                  : row.pct >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-600"
                                  : "bg-gradient-to-r from-red-400 to-red-600",
                              )}
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </CardContent>
            </Card>

            {/* 要再検査リスト */}
            {followups.length > 0 && (
              <Card className="lg:col-span-3 border-red-200">
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="size-4 text-red-700" />
                    要再検査・要精密検査（{followups.length}）
                  </h3>
                  <ul className="space-y-2">
                    {followups.map((r) => {
                      const e = empMap.get(r.employee_id);
                      if (!e) return null;
                      return (
                        <li key={r.employee_id}>
                          <button
                            onClick={() => setSelected(r)}
                            className="flex w-full items-center gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/40"
                          >
                            <Avatar className="size-9"><AvatarFallback>{initials(e.full_name)}</AvatarFallback></Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{e.full_name}</span>
                                <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", RESULT_TONE[r.result!])}>
                                  {r.result}
                                </span>
                              </div>
                              {r.notes && (
                                <div className="text-xs text-muted-foreground">{r.notes}</div>
                              )}
                            </div>
                            {r.scheduled_at && (
                              <div className="text-xs text-muted-foreground">
                                再検査 {formatDate(r.scheduled_at)}
                              </div>
                            )}
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <RecordsList records={records} empMap={empMap} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="law">
          <ComplianceView items={compliance} />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selected && (
            <RecordDetail
              record={selected}
              employee={empMap.get(selected.employee_id)!}
              onClose={() => setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiTile({
  icon: Icon, label, value, unit, tone, onClick, hint, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  onClick: () => void; hint: string; disabled?: boolean;
}) {
  const cls = {
    primary: "text-gc-700 bg-gc-50 border-gc-200",
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-800 bg-amber-50 border-amber-200",
    danger: "text-red-800 bg-red-50 border-red-200",
    muted: "text-muted-foreground bg-muted/50 border-border",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gc-300 hover:shadow-md disabled:cursor-default"
    >
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          {!disabled && <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {!disabled && hint && (
          <div className="mt-1 truncate text-[10px] text-muted-foreground/80 group-hover:text-gc-700">
            {hint} →
          </div>
        )}
      </div>
    </button>
  );
}

function RecordsList({
  records, empMap, onSelect,
}: {
  records: HealthRecord[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (r: HealthRecord) => void;
}) {
  const [filter, setFilter] = useState<"all" | "unfinished" | "followup">("all");

  const filtered = useMemo(() => {
    if (filter === "unfinished") return records.filter((r) => !r.checked_at);
    if (filter === "followup") return records.filter((r) => r.followup_required);
    return records;
  }, [records, filter]);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全件</SelectItem>
              <SelectItem value="unfinished">未受診のみ</SelectItem>
              <SelectItem value="followup">要再検査のみ</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.map((r) => {
          const e = empMap.get(r.employee_id);
          if (!e) return null;
          return (
            <Card
              key={r.employee_id}
              onClick={() => onSelect(r)}
              className={cn(
                "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
                r.followup_required && "border-red-200",
              )}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <Avatar className="size-9 shrink-0"><AvatarFallback>{initials(e.full_name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.full_name}</span>
                    {r.result && (
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", RESULT_TONE[r.result])}>
                        {r.result}
                      </span>
                    )}
                    {!r.checked_at && (
                      <Badge variant="outline" className="text-[10px]">未受診</Badge>
                    )}
                    {r.followup_required && (
                      <Badge variant="danger" className="text-[10px]">要対応</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.checked_at ? `受診日: ${formatDate(r.checked_at)}` : r.scheduled_at ? `予約: ${formatDate(r.scheduled_at)}` : "未予約"}
                    {r.clinic && ` · ${r.clinic}`}
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ComplianceView({ items }: { items: LawComplianceItem[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <Card
          key={item.id}
          className={cn(
            item.status === "ok" && "border-l-4 border-l-emerald-500",
            item.status === "warning" && "border-l-4 border-l-amber-500",
            item.status === "violation" && "border-l-4 border-l-red-500",
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {item.status === "ok" ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                : item.status === "warning" ? <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                : <AlertCircle className="size-5 shrink-0 text-red-600" />}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{item.reference}</div>
                <p className="mt-2 text-xs leading-relaxed">{item.note}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecordDetail({
  record, employee, onClose,
}: {
  record: HealthRecord;
  employee: DemoEmployee;
  onClose: () => void;
}) {
  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <Avatar className="size-12"><AvatarFallback>{initials(employee.full_name)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-bold">{employee.full_name}</SheetTitle>
            <div className="mt-0.5 text-sm text-muted-foreground">{employee.job_title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {record.result ? (
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", RESULT_TONE[record.result])}>
                  判定 {record.result}: {RESULT_LABEL[record.result]}
                </span>
              ) : (
                <Badge variant="outline" className="text-[10px]">未受診</Badge>
              )}
              {record.followup_required && (
                <Badge variant="danger" className="text-[10px]">要対応</Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        {/* アクション */}
        <div className="mt-3 flex flex-wrap gap-2">
          {!record.checked_at && employee.slack_user_id && (
            <Button
              size="sm"
              onClick={async () => {
                await sendSlackReminder(
                  employee.slack_user_id!,
                  `${employee.full_name} さん、定期健康診断の予約をお願いします。受診期限が近づいています。`,
                );
                toast.success("Slack で受診リマインドを送信");
              }}
              className="gap-1.5"
            >
              <SlackIconSmall className="size-3.5" />
              受診リマインド
            </Button>
          )}
          {record.scheduled_at && (
            <Button size="sm" variant="outline" asChild className="gap-1.5">
              <a
                href={createGoogleCalendarEventUrl({
                  title: `🏥 ${employee.full_name} 健康診断`,
                  description: `クリニック: ${record.clinic ?? "未定"}`,
                  start: new Date(record.scheduled_at),
                  attendees: [employee.email].filter(Boolean),
                  timezone: "Asia/Tokyo",
                })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CalendarPlus className="size-3.5" />
                Calendar に登録
              </a>
            </Button>
          )}
          {record.followup_required && (
            <Button size="sm" variant="outline" className="gap-1.5">
              産業医面談 設定
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <Section title="受診情報">
          <Row label="受診日">{record.checked_at ? formatDate(record.checked_at) : "未受診"}</Row>
          <Row label="予約日">{record.scheduled_at ? formatDate(record.scheduled_at) : "未予約"}</Row>
          <Row label="医療機関">{record.clinic ?? "—"}</Row>
          {record.result && <Row label="判定">{record.result}: {RESULT_LABEL[record.result]}</Row>}
          {record.followup_required && (
            <Row label="フォローアップ">
              <span className="text-red-700">必要 / 状態: {record.followup_status === "scheduled" ? "予約済" : record.followup_status === "in_progress" ? "進行中" : record.followup_status === "completed" ? "完了" : "未対応"}</span>
            </Row>
          )}
        </Section>

        {record.notes && (
          <Section title="メモ">
            <p className="rounded-md border bg-muted/30 p-3 text-sm">{record.notes}</p>
          </Section>
        )}

        <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3 text-xs">
          <p className="font-medium text-blue-900">プライバシー保護</p>
          <p className="mt-1 text-muted-foreground">
            健診結果は HR管理者・産業医・本人のみ閲覧可能。データは暗号化保存され、5 年間保管後に廃棄されます。
          </p>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-right">{children}</span>
    </div>
  );
}
