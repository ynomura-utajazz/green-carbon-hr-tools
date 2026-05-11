"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ListChecks, AlertCircle, Clock, CheckCircle2, X, CalendarPlus, Send, Plus,
  Sparkles, Lock, RotateCcw, FileText, Users2, ArrowRight,
} from "lucide-react";
import {
  type OnboardingRun, type OnboardingTemplate, type TaskState, type OnboardingPhase,
  type TaskTemplate, PHASE_ORDER, PHASE_LABEL, OWNER_LABEL, OWNER_COLOR, templateById,
  progressOf, currentPhaseOf, overdueTasksOf, tasksDueSoon,
} from "@/lib/demo/onboarding";
import { type DemoEmployee, type DemoDept, officeByCode } from "@/lib/demo/employees";
import { sendSlackReminder } from "@/lib/slack";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { initials, formatDate, cn } from "@/lib/utils";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

const PHASE_TONE: Record<OnboardingPhase, string> = {
  pre_arrival: "bg-purple-100 text-purple-800 border-purple-200",
  day_1: "bg-amber-100 text-amber-900 border-amber-300",
  week_1: "bg-blue-100 text-blue-800 border-blue-200",
  month_1: "bg-emerald-100 text-emerald-800 border-emerald-200",
  month_3: "bg-gc-100 text-gc-800 border-gc-200",
};

export function OnboardingClient({
  runs, templates, employees, departments,
}: {
  runs: OnboardingRun[];
  templates: OnboardingTemplate[];
  employees: DemoEmployee[];
  departments: DemoDept[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const [selected, setSelected] = useState<OnboardingRun | null>(null);
  const [tab, setTab] = useState<"active" | "templates">("active");

  // KPI 計算
  const activeRuns = runs.filter((r) => r.status === "active");
  const totalDueSoon = activeRuns.reduce((sum, r) => sum + tasksDueSoon(r), 0);
  const totalOverdue = activeRuns.reduce((sum, r) => {
    const tpl = templateById(r.template_id);
    return sum + (tpl ? overdueTasksOf(r, tpl) : 0);
  }, 0);
  const avgProgress = activeRuns.length > 0
    ? Math.round(activeRuns.reduce((s, r) => s + progressOf(r).pct, 0) / activeRuns.length)
    : 0;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ListChecks className="size-6 text-gc-700" />
            オンボーディング
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            入社前から3ヶ月目までの定着支援を、HRとマネージャー・バディが分担して進捗管理。
          </p>
        </div>
        <Button>
          <Plus className="size-4" /> 新規オンボーディング開始
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={Users2} label="進行中" value={activeRuns.length} unit="名" tone="primary" />
        <KpiTile icon={Clock} label="今週期限のタスク" value={totalDueSoon} unit="件" tone={totalDueSoon > 0 ? "warning" : "muted"} />
        <KpiTile icon={AlertCircle} label="期限超過" value={totalOverdue} unit="件" tone={totalOverdue > 0 ? "danger" : "muted"} />
        <KpiTile icon={Sparkles} label="平均完了率" value={`${avgProgress}%`} unit="" tone="success" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Users2 className="size-3.5" />
            進行中（{activeRuns.length}）
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="size-3.5" />
            テンプレート（{templates.length}）
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid gap-3 lg:grid-cols-2">
            {activeRuns.map((run) => {
              const employee = empMap.get(run.employee_id);
              if (!employee) return null;
              return (
                <RunCard
                  key={run.id}
                  run={run}
                  employee={employee}
                  manager={empMap.get(run.manager_id)}
                  buddy={run.buddy_id ? empMap.get(run.buddy_id) : undefined}
                  deptName={deptMap.get(employee.department_id)?.name ?? "—"}
                  onClick={() => setSelected(run)}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid gap-3 lg:grid-cols-2">
            {templates.map((tpl) => <TemplateCard key={tpl.id} template={tpl} />)}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-3xl" showClose={false}>
          {selected && (
            <RunDetail
              run={selected}
              empMap={empMap}
              deptMap={deptMap}
              onClose={() => setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── KPIタイル ──────────────────────────
function KpiTile({
  icon: Icon, label, value, unit, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  unit: string;
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
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 進行中カード ──────────────────────
function RunCard({
  run, employee, manager, buddy, deptName, onClick,
}: {
  run: OnboardingRun;
  employee: DemoEmployee;
  manager?: DemoEmployee;
  buddy?: DemoEmployee;
  deptName: string;
  onClick: () => void;
}) {
  const progress = progressOf(run);
  const phase = currentPhaseOf(run);
  const tpl = templateById(run.template_id);
  const overdue = tpl ? overdueTasksOf(run, tpl) : 0;
  const dueSoon = tasksDueSoon(run);
  const office = officeByCode(employee.office_location);

  const dayDiff = Math.floor((Date.now() - new Date(run.start_date).getTime()) / 86_400_000);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
        overdue > 0 && "border-amber-200",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold">{employee.full_name}</span>
              {office && office.code !== "JP-TYO" && <span className="text-xs">{office.countryEmoji}</span>}
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", PHASE_TONE[phase])}>
                {PHASE_LABEL[phase]}
              </span>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {employee.job_title} · {deptName}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              入社 {formatDate(run.start_date)}（{dayDiff < 0 ? `${Math.abs(dayDiff)}日後` : `${dayDiff}日経過`}）
              {manager && ` · マネージャー: ${manager.full_name}`}
              {buddy && ` · バディ: ${buddy.full_name}`}
            </div>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">完了率</span>
            <span className="font-semibold tabular-nums">
              {progress.done} / {progress.total} ({progress.pct}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-gc-500 to-gc-700 transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>

        {/* アラート */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {overdue > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] text-red-800">
              <AlertCircle className="size-2.5" />
              期限超過 {overdue} 件
            </span>
          )}
          {dueSoon > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">
              <Clock className="size-2.5" />
              今週期限 {dueSoon} 件
            </span>
          )}
          {overdue === 0 && dueSoon === 0 && progress.pct < 100 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800">
              <CheckCircle2 className="size-2.5" />
              順調
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── テンプレートカード ────────────────
function TemplateCard({ template }: { template: OnboardingTemplate }) {
  const phaseCounts = PHASE_ORDER.map((p) => ({
    phase: p,
    count: template.tasks.filter((t) => t.phase === p).length,
  }));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gc-100 text-gc-700">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{template.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {template.applicable_to.map((a) => (
                <Badge key={a} variant="outline" className="text-[10px]">
                  {a === "all" ? "全社" : a === "engineer" ? "エンジニア" : a === "designer" ? "デザイナー" : a === "intern" ? "インターン" : "ビジネス"}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs">編集</Button>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {phaseCounts.map(({ phase, count }) => (
            <div key={phase} className="rounded-md border bg-muted/30 p-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{PHASE_LABEL[phase]}</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums">{count}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          合計 <strong className="text-foreground">{template.tasks.length}</strong> タスク
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 詳細パネル ────────────────────────
function RunDetail({
  run, empMap, deptMap, onClose,
}: {
  run: OnboardingRun;
  empMap: Map<string, DemoEmployee>;
  deptMap: Map<string, DemoDept>;
  onClose: () => void;
}) {
  const employee = empMap.get(run.employee_id)!;
  const manager = empMap.get(run.manager_id);
  const buddy = run.buddy_id ? empMap.get(run.buddy_id) : undefined;
  const tpl = templateById(run.template_id);
  const progress = progressOf(run);
  const phase = currentPhaseOf(run);
  const office = officeByCode(employee.office_location);

  if (!tpl) return null;

  const stateMap = new Map(run.task_states.map((s) => [s.task_id, s]));

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-bold">{employee.full_name}</SheetTitle>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {employee.job_title} · {deptMap.get(employee.department_id)?.name ?? "—"}
              {office && office.code !== "JP-TYO" && <span className="ml-1">{office.countryEmoji} {office.city}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", PHASE_TONE[phase])}>
                {PHASE_LABEL[phase]}
              </span>
              <span className="text-muted-foreground">入社 {formatDate(run.start_date)}</span>
              {manager && <span className="text-muted-foreground">· マネージャー {manager.full_name}</span>}
              {buddy && <span className="text-muted-foreground">· バディ {buddy.full_name}</span>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        {/* 進捗 */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">全体進捗</span>
            <span className="font-bold tabular-nums">{progress.done} / {progress.total} ({progress.pct}%)</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-gc-500 to-gc-700"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>

        {/* クイックアクション */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const slackId = employee.slack_user_id;
              if (slackId) {
                await sendSlackReminder(
                  slackId,
                  `${employee.full_name} さん、Green Carbon へようこそ！🌿\n何か困ったことがあればいつでも聞いてください。`,
                );
                toast.success("ウェルカムDM をコピーし Slack を開きました");
              }
            }}
            className="gap-1.5"
          >
            <SlackIconSmall className="size-3.5 text-[#4A154B]" />
            Slack ウェルカム
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.success("Day 1 と Week 1 のミーティング群を Google Calendar に一括スケジュールしました（デモ）", {
                description: "オフィスツアー・ランチ・1on1・コンプラ研修など 7 件",
              });
            }}
            className="gap-1.5"
          >
            <CalendarPlus className="size-3.5" />
            ミーティング一括スケジュール
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const text = `🎉 新メンバー紹介\n${employee.full_name} さん（${employee.job_title}）が ${formatDate(run.start_date)} に入社しました！どうぞよろしくお願いします。`;
              navigator.clipboard.writeText(text).catch(() => {});
              toast.success("#all-hands 用の文面をコピーしました");
            }}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            #all-hands で紹介
          </Button>
        </div>
      </div>

      {/* フェーズ別タスクリスト */}
      <div className="space-y-5 p-5">
        {PHASE_ORDER.map((p) => {
          const tasks = tpl.tasks.filter((t) => t.phase === p);
          const states = tasks.map((t) => stateMap.get(t.id)).filter(Boolean) as TaskState[];
          const doneCount = states.filter((s) => s.status === "done").length;
          const isCurrent = phase === p;

          return (
            <div key={p}>
              <div className="mb-2 flex items-center gap-2">
                <span className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-[11px] font-bold",
                  isCurrent && "ring-2 ring-gc-500 ring-offset-2",
                  doneCount === tasks.length ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-border bg-card",
                )}>
                  {doneCount === tasks.length ? <CheckCircle2 className="size-3.5" /> : doneCount}
                </span>
                <h3 className="text-sm font-bold tracking-tight">{PHASE_LABEL[p]}</h3>
                <span className="text-xs text-muted-foreground">
                  {doneCount} / {tasks.length} 完了
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-gc-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    現在
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {tasks.map((t) => {
                  const s = stateMap.get(t.id);
                  if (!s) return null;
                  return <TaskRow key={t.id} task={t} state={s} employee={employee} />;
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── タスク行 ────────────────────────
function TaskRow({
  task, state, employee: _employee,
}: {
  task: TaskTemplate;
  state: TaskState;
  employee: DemoEmployee;
}) {
  const isDone = state.status === "done";
  const isBlocked = state.status === "blocked";
  const today = new Date().toISOString().slice(0, 10);
  const overdue = !isDone && state.due_date < today;

  return (
    <li className={cn(
      "flex items-start gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent/30",
      isDone && "opacity-60",
      overdue && "border-red-200 bg-red-50/30",
      isBlocked && "border-orange-200 bg-orange-50/30",
    )}>
      <button
        onClick={() => toast.success(isDone ? "タスクを未完了に戻しました" : "タスクを完了にしました")}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
          isDone ? "border-emerald-500 bg-emerald-500 text-white"
            : isBlocked ? "border-orange-400 bg-orange-100"
            : "border-muted-foreground/40 hover:border-gc-500",
        )}
      >
        {isDone && <CheckCircle2 className="size-3" />}
        {isBlocked && <Lock className="size-2.5 text-orange-700" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm font-medium", isDone && "line-through")}>{task.title}</span>
          <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", OWNER_COLOR[task.owner])}>
            {OWNER_LABEL[task.owner]}
          </span>
          {task.triggers_calendar && (
            <span title="カレンダー予定対象" className="text-[10px] text-blue-600"><CalendarPlus className="size-3" /></span>
          )}
          {task.triggers_slack && (
            <span title="Slack 告知対象" className="text-[10px] text-[#4A154B]"><SlackIconSmall className="size-3" /></span>
          )}
        </div>
        {task.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span>期限 {state.due_date}</span>
          {overdue && <span className="font-medium text-red-700">期限超過</span>}
          {task.estimated_minutes && <span>· 想定 {task.estimated_minutes}分</span>}
          {state.completed_at && <span>· 完了 {state.completed_at}</span>}
        </div>
        {state.notes && (
          <div className="mt-2 rounded-md border border-orange-200 bg-orange-50 p-2 text-xs text-orange-900">
            <AlertCircle className="mb-0.5 inline size-3" /> {state.notes}
          </div>
        )}
      </div>

      {!isDone && (
        <Button variant="ghost" size="sm" className="shrink-0 text-xs">
          {isBlocked ? <RotateCcw className="size-3.5" /> : <ArrowRight className="size-3.5" />}
        </Button>
      )}
    </li>
  );
}
