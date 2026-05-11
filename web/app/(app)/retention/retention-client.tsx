"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, TrendingUp, TrendingDown, Users2, ChevronRight, X, CalendarPlus,
  Sparkles, Target, AlertCircle, Activity, Filter,
} from "lucide-react";
import {
  type RetentionRecord, type RiskLevel, type RiskFactors, LEVEL_LABEL, LEVEL_TONE,
  LEVEL_DOT, FACTOR_LABEL, recordsByLevel, recordsByDepartment, avgScoreOf,
} from "@/lib/demo/retention";
import { type DemoEmployee, type DemoDept, officeByCode } from "@/lib/demo/employees";
import { sendSlackReminder } from "@/lib/slack";
import { createGoogleCalendarEventUrl } from "@/lib/google-calendar";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { useT } from "@/lib/use-t";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials, relativeTime, cn } from "@/lib/utils";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

export function RetentionClient({
  records, employees, departments,
}: {
  records: RetentionRecord[];
  employees: DemoEmployee[];
  departments: DemoDept[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const t = useT();
  const [tab, setTab] = useState<"overview" | "all" | "departments">("overview");
  const [selected, setSelected] = useState<RetentionRecord | null>(null);
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "all">("all");

  // KPI
  const critical = recordsByLevel("critical");
  const high = recordsByLevel("high");
  const medium = recordsByLevel("medium");
  const low = recordsByLevel("low");
  const _totalRisk = critical.length + high.length;
  const overallAvg = avgScoreOf(records);

  // 部門別
  const byDept = useMemo(
    () => recordsByDepartment(employees.map((e) => ({ id: e.id, department_id: e.department_id }))),
    [employees],
  );

  const displayed = levelFilter === "all" ? records : records.filter((r) => r.level === levelFilter);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <AlertTriangle className="size-6 text-gc-700" />
            {t("page.retention.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("page.retention.subtitle")}
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={AlertCircle} label="緊急対応" value={critical.length} unit="名" tone="danger" hint="即時 1on1 が必要" onClick={() => { setLevelFilter("critical"); setTab("all"); }} disabled={critical.length === 0} />
        <KpiTile icon={AlertTriangle} label="高リスク" value={high.length} unit="名" tone="warning" hint="今月中の対応推奨" onClick={() => { setLevelFilter("high"); setTab("all"); }} disabled={high.length === 0} />
        <KpiTile icon={Users2} label="観察中（中）" value={medium.length} unit="名" tone="muted" hint="兆候のあるメンバー" onClick={() => { setLevelFilter("medium"); setTab("all"); }} disabled={medium.length === 0} />
        <KpiTile icon={Activity} label="全社平均スコア" value={overallAvg} unit="/ 100" tone={overallAvg >= 35 ? "warning" : "success"} hint={overallAvg >= 35 ? "全社的に注意" : "良好"} onClick={() => setTab("overview")} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><Target className="size-3.5" />サマリー</TabsTrigger>
          <TabsTrigger value="all" className="gap-2"><Users2 className="size-3.5" />全社員</TabsTrigger>
          <TabsTrigger value="departments" className="gap-2"><Filter className="size-3.5" />部門別</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewView
            records={records}
            empMap={empMap}
            deptMap={deptMap}
            onSelect={setSelected}
            critical={critical}
            high={high}
          />
        </TabsContent>

        <TabsContent value="all">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">レベル:</span>
            <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as RiskLevel | "all")}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて ({records.length})</SelectItem>
                <SelectItem value="critical">緊急 ({critical.length})</SelectItem>
                <SelectItem value="high">高 ({high.length})</SelectItem>
                <SelectItem value="medium">中 ({medium.length})</SelectItem>
                <SelectItem value="low">低 ({low.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RecordsList records={displayed} empMap={empMap} deptMap={deptMap} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="departments">
          <DepartmentView byDept={byDept} departments={departments} empMap={empMap} onSelect={setSelected} />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selected && (
            <RecordDetail
              record={selected}
              employee={empMap.get(selected.employee_id)!}
              dept={deptMap.get(empMap.get(selected.employee_id)?.department_id ?? "")}
              manager={empMap.get(empMap.get(selected.employee_id)?.manager_id ?? "")}
              onClose={() => setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── KPI ─────────────────────────────────
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

// ─── サマリービュー ──────────────────
function OverviewView({
  records, empMap, deptMap, onSelect, critical, high,
}: {
  records: RetentionRecord[];
  empMap: Map<string, DemoEmployee>;
  deptMap: Map<string, DemoDept>;
  onSelect: (r: RetentionRecord) => void;
  critical: RetentionRecord[];
  high: RetentionRecord[];
}) {
  // レベル別分布
  const counts = {
    critical: critical.length,
    high: high.length,
    medium: records.filter((r) => r.level === "medium").length,
    low: records.filter((r) => r.level === "low").length,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* 緊急対応 */}
      <Card className="lg:col-span-2 border-red-200">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="size-4 text-red-700" />
              緊急対応・高リスク（{critical.length + high.length} 名）
            </h3>
          </div>
          {critical.length + high.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              🎉 緊急対応・高リスクのメンバーはいません
            </div>
          ) : (
            <ul className="space-y-2">
              {[...critical, ...high].slice(0, 6).map((r) => {
                const e = empMap.get(r.employee_id);
                const d = e ? deptMap.get(e.department_id) : null;
                if (!e) return null;
                return (
                  <li key={r.employee_id}>
                    <button
                      onClick={() => onSelect(r)}
                      className="flex w-full items-center gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/40"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback>{initials(e.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{e.full_name}</span>
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", LEVEL_TONE[r.level])}>
                            <span className={cn("size-1.5 rounded-full", LEVEL_DOT[r.level])} />
                            {LEVEL_LABEL[r.level]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.job_title} · {d?.name ?? "—"}
                        </div>
                        {r.signals[0] && (
                          <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                            ⚠️ {r.signals[0]}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold tabular-nums">{r.score}</div>
                        <div className={cn(
                          "text-[10px] tabular-nums",
                          r.trend_30d > 0 ? "text-red-700" : r.trend_30d < 0 ? "text-emerald-700" : "text-muted-foreground",
                        )}>
                          {r.trend_30d > 0 ? "+" : ""}{r.trend_30d} (30d)
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 分布 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Target className="size-4 text-gc-700" />
            リスク分布
          </h3>
          <ul className="space-y-2">
            {(["critical", "high", "medium", "low"] as RiskLevel[]).map((lvl) => {
              const count = counts[lvl];
              const pct = (count / records.length) * 100;
              return (
                <li key={lvl} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]", LEVEL_TONE[lvl])}>
                      <span className={cn("size-1.5 rounded-full", LEVEL_DOT[lvl])} />
                      {LEVEL_LABEL[lvl]}
                    </span>
                    <span className="text-xs font-bold tabular-nums">{count}名 ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full",
                        lvl === "critical" ? "bg-red-500"
                          : lvl === "high" ? "bg-orange-500"
                          : lvl === "medium" ? "bg-amber-500"
                          : "bg-emerald-500",
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
    </div>
  );
}

// ─── 全社員リスト ───────────────────
function RecordsList({
  records, empMap, deptMap, onSelect,
}: {
  records: RetentionRecord[];
  empMap: Map<string, DemoEmployee>;
  deptMap: Map<string, DemoDept>;
  onSelect: (r: RetentionRecord) => void;
}) {
  return (
    <div className="space-y-2">
      {records.map((r) => {
        const e = empMap.get(r.employee_id);
        const d = e ? deptMap.get(e.department_id) : null;
        if (!e) return null;
        const office = officeByCode(e.office_location);
        return (
          <Card
            key={r.employee_id}
            onClick={() => onSelect(r)}
            className={cn(
              "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
              r.level === "critical" && "border-red-200",
              r.level === "high" && "border-orange-200",
            )}
          >
            <CardContent className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback>{initials(e.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{e.full_name}</span>
                  {office && office.code !== "JP-TYO" && <span className="text-xs">{office.countryEmoji}</span>}
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", LEVEL_TONE[r.level])}>
                    <span className={cn("size-1.5 rounded-full", LEVEL_DOT[r.level])} />
                    {LEVEL_LABEL[r.level]}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {e.job_title} · {d?.name ?? "—"}
                </div>
                {r.signals[0] && (
                  <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                    ⚠️ {r.signals[0]}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums">{r.score}</div>
                <div className={cn(
                  "flex items-center justify-end gap-0.5 text-[10px] tabular-nums",
                  r.trend_30d > 0 ? "text-red-700" : r.trend_30d < 0 ? "text-emerald-700" : "text-muted-foreground",
                )}>
                  {r.trend_30d > 0 ? <TrendingUp className="size-2.5" /> : r.trend_30d < 0 ? <TrendingDown className="size-2.5" /> : null}
                  {r.trend_30d > 0 ? "+" : ""}{r.trend_30d}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── 部門別ビュー ───────────────────
function DepartmentView({
  byDept, departments, empMap, onSelect,
}: {
  byDept: Map<string, RetentionRecord[]>;
  departments: DemoDept[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (r: RetentionRecord) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {departments.filter((d) => byDept.has(d.id)).map((d) => {
        const records = byDept.get(d.id) ?? [];
        const avg = avgScoreOf(records);
        const high = records.filter((r) => r.level === "high" || r.level === "critical").length;
        const medium = records.filter((r) => r.level === "medium").length;
        return (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{d.name}</h3>
                <span className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums",
                  avg >= 50 ? "border-red-200 bg-red-50 text-red-800"
                    : avg >= 35 ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800",
                )}>
                  平均 {avg}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">{records.length}名</span>
                {high > 0 && <span className="text-red-700">高リスク {high}</span>}
                {medium > 0 && <span className="text-amber-700">中リスク {medium}</span>}
              </div>
              {high > 0 && (
                <ul className="mt-3 space-y-1">
                  {records.filter((r) => r.level === "high" || r.level === "critical").slice(0, 3).map((r) => {
                    const e = empMap.get(r.employee_id);
                    if (!e) return null;
                    return (
                      <li key={r.employee_id}>
                        <button
                          onClick={() => onSelect(r)}
                          className="flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-accent/40"
                        >
                          <Avatar className="size-6"><AvatarFallback className="text-[9px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                          <span className="flex-1 truncate text-xs">{e.full_name}</span>
                          <span className={cn("size-1.5 rounded-full", LEVEL_DOT[r.level])} />
                          <span className="text-xs font-mono">{r.score}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── 詳細パネル ──────────────────────
function RecordDetail({
  record, employee, dept, manager, onClose,
}: {
  record: RetentionRecord;
  employee: DemoEmployee;
  dept?: DemoDept;
  manager?: DemoEmployee;
  onClose: () => void;
}) {
  const office = officeByCode(employee.office_location);
  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-lg font-bold">{employee.full_name}</SheetTitle>
              {office && office.code !== "JP-TYO" && <span>{office.countryEmoji}</span>}
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", LEVEL_TONE[record.level])}>
                <span className={cn("size-1.5 rounded-full", LEVEL_DOT[record.level])} />
                リスク {LEVEL_LABEL[record.level]}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {employee.job_title} · {dept?.name ?? "—"}
              {manager && ` · マネージャー ${manager.full_name}`}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">総合スコア</div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums">{record.score}</div>
            <div className="text-[10px] text-muted-foreground">/ 100</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">30日変化</div>
            <div className={cn(
              "mt-0.5 text-2xl font-bold tabular-nums",
              record.trend_30d > 0 ? "text-red-700" : record.trend_30d < 0 ? "text-emerald-700" : "text-muted-foreground",
            )}>
              {record.trend_30d > 0 ? "+" : ""}{record.trend_30d}
            </div>
            <div className="text-[10px] text-muted-foreground">悪化↑ / 改善↓</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">最終評価</div>
            <div className="mt-0.5 text-xs font-medium">{relativeTime(record.last_evaluated_at)}</div>
          </div>
        </div>

        {/* 緊急アクション */}
        <div className="mt-3 flex flex-wrap gap-2">
          {employee.slack_user_id && (
            <Button
              size="sm"
              onClick={async () => {
                await sendSlackReminder(
                  employee.slack_user_id!,
                  `${employee.full_name} さん、最近の状況についてお話したいので、今週の都合の良い時間を教えていただけますか？`,
                );
                toast.success("緊急 1on1 のお誘いを送信しました");
              }}
              className="gap-1.5"
            >
              <SlackIconSmall className="size-3.5" />
              緊急 1on1 をセット
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            asChild
            className="gap-1.5"
          >
            <a
              href={createGoogleCalendarEventUrl({
                title: `🔔 1on1（リテンション）— ${employee.full_name}`,
                description: `離職リスクスコア ${record.score} (${LEVEL_LABEL[record.level]})\n\n主要シグナル:\n${record.signals.map((s) => `- ${s}`).join("\n")}\n\n推奨アクション:\n${record.recommended_actions.map((a) => `- ${a}`).join("\n")}`,
                start: new Date(Date.now() + 2 * 86_400_000),
                attendees: [employee.email].filter(Boolean),
                timezone: "Asia/Tokyo",
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarPlus className="size-3.5" />
              Calendar で予定
            </a>
          </Button>
        </div>
      </div>

      {/* 因子別スコア */}
      <div className="space-y-5 p-5">
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            因子別スコア（高いほど離職リスク）
          </h3>
          <ul className="space-y-2.5">
            {(Object.entries(record.factors) as [keyof RiskFactors, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([factor, score]) => (
                <li key={factor} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{FACTOR_LABEL[factor]}</span>
                    <span className="font-bold tabular-nums">{score}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full",
                        score >= 70 ? "bg-gradient-to-r from-red-400 to-red-600"
                          : score >= 50 ? "bg-gradient-to-r from-orange-400 to-orange-600"
                          : score >= 30 ? "bg-gradient-to-r from-amber-400 to-amber-600"
                          : "bg-gradient-to-r from-emerald-400 to-emerald-600",
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </div>

        {record.signals.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              観測されたシグナル
            </h3>
            <ul className="space-y-1.5">
              {record.signals.map((s, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border bg-amber-50/40 p-2.5 text-sm">
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-700 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {record.recommended_actions.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              推奨アクション
            </h3>
            <ul className="space-y-1.5">
              {record.recommended_actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border border-gc-200 bg-gc-50/40 p-2.5 text-sm">
                  <Sparkles className="size-3.5 shrink-0 text-gc-700 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI 介入プラン生成 */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI 分析・介入プラン
          </h3>
          <AiGeneratePanel
            title="離職リスクの言語化"
            endpoint="/api/ai/retention-narrative"
            hint="数値スコアを物語化し、マネージャーが今週・2 週間以内・1ヶ月以内に取るべき具体行動を生成します。"
            buttonLabel="AI で介入プラン生成"
            payload={() => ({
              employeeName: employee.full_name,
              department: dept?.name ?? "—",
              jobTitle: employee.job_title,
              tenureMonths: tenureMonths(employee.hire_date),
              riskScore: record.score,
              signals: record.signals.map((s) => ({
                label: s,
                value: s,
                weight:
                  record.score >= 70 ? "high" :
                  record.score >= 40 ? "med" : "low",
              })),
            })}
          />
        </div>
      </div>
    </>
  );
}

function tenureMonths(hireDate: string): number {
  const h = new Date(hireDate);
  if (Number.isNaN(h.getTime())) return 0;
  const months = (Date.now() - h.getTime()) / (30.44 * 86_400_000);
  return Math.round(months);
}
