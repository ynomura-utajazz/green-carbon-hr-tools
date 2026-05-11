"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Target, Building2, Users2, User, ChevronRight, ChevronDown, X, TrendingUp,
  AlertTriangle, CheckCircle2, Award, Plus, Calendar, ArrowRight, Edit3, Sparkles,
  Send,
} from "lucide-react";
import {
  type Objective, type KeyResult, type ReviewCycle, type MboReview, type OkrStatus,
  type MboGrade, STATUS_LABEL, STATUS_TONE, MBO_GRADE_TONE, childrenOf, objectivesForOwner,
  objectivesByLevel, avgProgressOf, activeCycle,
} from "@/lib/demo/okr";
import { type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import { sendSlackReminder } from "@/lib/slack";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

const STATUS_ICON: Record<OkrStatus, typeof TrendingUp> = {
  draft: Edit3,
  active: TrendingUp,
  at_risk: AlertTriangle,
  behind: AlertTriangle,
  achieved: CheckCircle2,
  missed: AlertTriangle,
};

export function MboOkrClient({
  objectives, cycles, reviews, employees, departments, currentEmployeeId,
}: {
  objectives: Objective[];
  cycles: ReviewCycle[];
  reviews: MboReview[];
  employees: DemoEmployee[];
  departments: DemoDept[];
  currentEmployeeId: string;
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const objMap = useMemo(() => new Map(objectives.map((o) => [o.id, o])), [objectives]);
  const current = activeCycle() ?? cycles[0];

  const [tab, setTab] = useState<"company" | "department" | "individual" | "mine" | "evaluations">("company");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedObj, setSelectedObj] = useState<Objective | null>(null);

  // KPI
  const allActive = objectives.filter((o) => o.cycle_id === current.id);
  const myObjs = objectivesForOwner(currentEmployeeId, current.id);
  const myAvg = avgProgressOf(myObjs);
  const companyAvg = avgProgressOf(objectivesByLevel("company", current.id));
  const atRiskCount = allActive.filter((o) => o.status === "at_risk" || o.status === "behind").length;

  const daysToEnd = Math.floor((new Date(current.ends_on).getTime() - Date.now()) / 86_400_000);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Target className="size-6 text-gc-700" />
            MBO × OKR
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            会社・部署・個人の3階層で目標管理。
            <span className="ml-1 font-medium text-foreground">{current.name}</span>
            <span className="text-muted-foreground"> · 終了まで {daysToEnd} 日</span>
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          目標を作成
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={Target} label="自分のOKR" value={myObjs.length} unit="件" tone="primary" hint={`平均達成率 ${myAvg}%`} onClick={() => setTab("mine")} />
        <KpiTile icon={Building2} label="会社OKR 平均達成" value={`${companyAvg}%`} unit="" tone={companyAvg >= 60 ? "success" : "warning"} hint="会社OKRを見る" onClick={() => setTab("company")} />
        <KpiTile icon={AlertTriangle} label="要注意・遅延" value={atRiskCount} unit="件" tone={atRiskCount > 0 ? "danger" : "muted"} hint="リスクのある目標" onClick={() => setTab("department")} />
        <KpiTile icon={Calendar} label="期末まで" value={daysToEnd} unit="日" tone={daysToEnd < 14 ? "warning" : "muted"} hint="評価準備時期" onClick={() => setTab("evaluations")} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="company" className="gap-2"><Building2 className="size-3.5" />会社</TabsTrigger>
          <TabsTrigger value="department" className="gap-2"><Users2 className="size-3.5" />部署</TabsTrigger>
          <TabsTrigger value="individual" className="gap-2"><User className="size-3.5" />個人</TabsTrigger>
          <TabsTrigger value="mine" className="gap-2"><Sparkles className="size-3.5" />マイ</TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-2"><Award className="size-3.5" />MBO評価</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanyView
            objectives={objectivesByLevel("company", current.id)}
            allObjectives={allActive}
            objMap={objMap}
            empMap={empMap}
            onSelect={setSelectedObj}
          />
        </TabsContent>

        <TabsContent value="department">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">部署で絞り込み:</span>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての部署</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DepartmentView
            objectives={objectivesByLevel("department", current.id).filter(
              (o) => selectedDept === "all" || o.department_id === selectedDept
            )}
            objMap={objMap}
            empMap={empMap}
            deptMap={deptMap}
            onSelect={setSelectedObj}
          />
        </TabsContent>

        <TabsContent value="individual">
          <IndividualView
            objectives={objectivesByLevel("individual", current.id)}
            empMap={empMap}
            onSelect={setSelectedObj}
          />
        </TabsContent>

        <TabsContent value="mine">
          <MyOkrView
            objectives={myObjs}
            objMap={objMap}
            empMap={empMap}
            onSelect={setSelectedObj}
            currentEmployeeId={currentEmployeeId}
          />
        </TabsContent>

        <TabsContent value="evaluations">
          <EvaluationsView
            cycles={cycles}
            reviews={reviews}
            empMap={empMap}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedObj} onOpenChange={(o) => !o && setSelectedObj(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selectedObj && (
            <ObjectiveDetail
              objective={selectedObj}
              parent={selectedObj.parent_id ? objMap.get(selectedObj.parent_id) : null}
              childObjectives={childrenOf(selectedObj.id)}
              owner={empMap.get(selectedObj.owner_id)}
              onClose={() => setSelectedObj(null)}
              onSelectChild={setSelectedObj}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── KPI ─────────────────────────────────
function KpiTile({
  icon: Icon, label, value, unit, tone, onClick, hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  onClick: () => void; hint: string;
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
      className="group flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gc-300 hover:shadow-md"
    >
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        <div className="mt-1 truncate text-[10px] text-muted-foreground/80 group-hover:text-gc-700">
          {hint} →
        </div>
      </div>
    </button>
  );
}

// ─── 会社 OKR ビュー（カスケード表示） ──
function CompanyView({
  objectives, allObjectives, objMap: _objMap, empMap, onSelect,
}: {
  objectives: Objective[];
  allObjectives: Objective[];
  objMap: Map<string, Objective>;
  empMap: Map<string, DemoEmployee>;
  onSelect: (o: Objective) => void;
}) {
  return (
    <div className="space-y-3">
      {objectives.map((obj) => (
        <CascadingObjectiveCard
          key={obj.id}
          objective={obj}
          allObjectives={allObjectives}
          empMap={empMap}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}

function CascadingObjectiveCard({
  objective, allObjectives, empMap, onSelect, depth,
}: {
  objective: Objective;
  allObjectives: Objective[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (o: Objective) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const children = allObjectives.filter((o) => o.parent_id === objective.id);
  const owner = empMap.get(objective.owner_id);
  const StatusIcon = STATUS_ICON[objective.status];

  return (
    <div>
      <Card
        className={cn(
          "transition-colors",
          depth === 0 && "border-gc-300",
          depth === 1 && "border-blue-200",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => children.length > 0 && setExpanded((v) => !v)}
              className={cn(
                "mt-1 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground",
                children.length === 0 && "invisible",
              )}
            >
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gc-50 text-gc-700">
              {objective.level === "company" ? <Building2 className="size-4" /> : objective.level === "department" ? <Users2 className="size-4" /> : <User className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <button
                onClick={() => onSelect(objective)}
                className="block w-full text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{objective.title}</span>
                  <span className={cn("inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px]", STATUS_TONE[objective.status])}>
                    <StatusIcon className="size-2.5" />
                    {STATUS_LABEL[objective.status]}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{objective.description}</p>
              </button>

              {/* オーナー */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {owner && (
                  <>
                    <Avatar className="size-4"><AvatarFallback className="text-[8px]">{initials(owner.full_name)}</AvatarFallback></Avatar>
                    <span>{owner.full_name}</span>
                  </>
                )}
                {children.length > 0 && (
                  <>
                    <span>·</span>
                    <span>子目標 {children.length} 件</span>
                  </>
                )}
                <span className="ml-auto font-bold tabular-nums text-foreground">{objective.progress}%</span>
              </div>

              {/* プログレスバー */}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full transition-all",
                    objective.status === "achieved" ? "bg-gradient-to-r from-purple-500 to-purple-700"
                      : objective.status === "active" ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                      : objective.status === "at_risk" ? "bg-gradient-to-r from-amber-400 to-amber-600"
                      : objective.status === "behind" ? "bg-gradient-to-r from-red-400 to-red-600"
                      : "bg-gradient-to-r from-gray-300 to-gray-500",
                  )}
                  style={{ width: `${objective.progress}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 子目標 */}
      {expanded && children.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-dashed pl-3">
          {children.map((child) => (
            <CascadingObjectiveCard
              key={child.id}
              objective={child}
              allObjectives={allObjectives}
              empMap={empMap}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 部署ビュー（フラットリスト） ──────
function DepartmentView({
  objectives, objMap, empMap, deptMap, onSelect,
}: {
  objectives: Objective[];
  objMap: Map<string, Objective>;
  empMap: Map<string, DemoEmployee>;
  deptMap: Map<string, DemoDept>;
  onSelect: (o: Objective) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {objectives.map((obj) => {
        const owner = empMap.get(obj.owner_id);
        const parent = obj.parent_id ? objMap.get(obj.parent_id) : null;
        const dept = obj.department_id ? deptMap.get(obj.department_id) : null;
        return (
          <ObjectiveCard
            key={obj.id}
            objective={obj}
            owner={owner}
            badge={dept?.name}
            parent={parent}
            onClick={() => onSelect(obj)}
          />
        );
      })}
    </div>
  );
}

// ─── 個人ビュー ──────────────────────
function IndividualView({
  objectives, empMap, onSelect,
}: {
  objectives: Objective[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (o: Objective) => void;
}) {
  // owner ごとにグループ化
  const grouped = new Map<string, Objective[]>();
  for (const o of objectives) {
    if (!grouped.has(o.owner_id)) grouped.set(o.owner_id, []);
    grouped.get(o.owner_id)!.push(o);
  }
  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([ownerId, objs]) => {
        const owner = empMap.get(ownerId);
        const avg = avgProgressOf(objs);
        return (
          <div key={ownerId}>
            <div className="mb-2 flex items-center gap-2">
              {owner && (
                <>
                  <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(owner.full_name)}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{owner.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{owner.job_title}</div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">
                    {avg}%
                  </span>
                </>
              )}
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {objs.map((obj) => (
                <ObjectiveCard
                  key={obj.id}
                  objective={obj}
                  owner={undefined}
                  onClick={() => onSelect(obj)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── マイ OKR ────────────────────────
function MyOkrView({
  objectives, objMap, empMap, onSelect, currentEmployeeId,
}: {
  objectives: Objective[];
  objMap: Map<string, Objective>;
  empMap: Map<string, DemoEmployee>;
  onSelect: (o: Objective) => void;
  currentEmployeeId: string;
}) {
  const me = empMap.get(currentEmployeeId);
  const avg = avgProgressOf(objectives);

  if (objectives.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">あなたの今期 OKR はまだ設定されていません。</p>
          <Button className="mt-3 gap-1.5">
            <Plus className="size-3.5" />
            OKR を作成
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-gc-300 bg-gc-50/30">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          {me && (
            <>
              <Avatar className="size-12">
                <AvatarFallback>{initials(me.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm font-bold">{me.full_name}</div>
                <div className="text-xs text-muted-foreground">{me.job_title}</div>
              </div>
            </>
          )}
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">マイ平均達成率</div>
            <div className="text-2xl font-bold tabular-nums">{avg}%</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {objectives.map((obj) => {
          const parent = obj.parent_id ? objMap.get(obj.parent_id) : null;
          return (
            <ObjectiveCard
              key={obj.id}
              objective={obj}
              owner={undefined}
              parent={parent}
              onClick={() => onSelect(obj)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── 共通カード ──────────────────────
function ObjectiveCard({
  objective, owner, badge, parent, onClick,
}: {
  objective: Objective;
  owner?: DemoEmployee;
  badge?: string;
  parent?: Objective | null;
  onClick: () => void;
}) {
  const StatusIcon = STATUS_ICON[objective.status];
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            objective.level === "company" ? "bg-gc-50 text-gc-700"
              : objective.level === "department" ? "bg-blue-50 text-blue-700"
              : "bg-purple-50 text-purple-700",
          )}>
            {objective.level === "company" ? <Building2 className="size-4" /> : objective.level === "department" ? <Users2 className="size-4" /> : <User className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px]", STATUS_TONE[objective.status])}>
                <StatusIcon className="size-2.5" />
                {STATUS_LABEL[objective.status]}
              </span>
              {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
            </div>
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold">{objective.title}</h3>
            {parent && (
              <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <ArrowRight className="size-2.5" />
                <span className="truncate">親: {parent.title}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                {owner && (
                  <>
                    <Avatar className="size-4"><AvatarFallback className="text-[8px]">{initials(owner.full_name)}</AvatarFallback></Avatar>
                    <span className="truncate text-[10px] text-muted-foreground">{owner.full_name}</span>
                  </>
                )}
              </div>
              <span className="font-bold tabular-nums">{objective.progress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  objective.status === "achieved" ? "bg-gradient-to-r from-purple-500 to-purple-700"
                    : objective.status === "active" ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                    : objective.status === "at_risk" ? "bg-gradient-to-r from-amber-400 to-amber-600"
                    : "bg-gradient-to-r from-red-400 to-red-600",
                )}
                style={{ width: `${objective.progress}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              KR {objective.key_results.length} 件
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 詳細パネル ──────────────────────
function ObjectiveDetail({
  objective, parent, childObjectives, owner, onClose, onSelectChild,
}: {
  objective: Objective;
  parent: Objective | null | undefined;
  childObjectives: Objective[];
  owner: DemoEmployee | undefined;
  onClose: () => void;
  onSelectChild: (o: Objective) => void;
}) {
  const StatusIcon = STATUS_ICON[objective.status];

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-lg",
            objective.level === "company" ? "bg-gc-50 text-gc-700"
              : objective.level === "department" ? "bg-blue-50 text-blue-700"
              : "bg-purple-50 text-purple-700",
          )}>
            {objective.level === "company" ? <Building2 className="size-5" /> : objective.level === "department" ? <Users2 className="size-5" /> : <User className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {objective.level === "company" ? "会社" : objective.level === "department" ? "部署" : "個人"}
              </Badge>
              <span className={cn("inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px]", STATUS_TONE[objective.status])}>
                <StatusIcon className="size-2.5" />
                {STATUS_LABEL[objective.status]}
              </span>
            </div>
            <SheetTitle className="mt-1 text-lg font-bold">{objective.title}</SheetTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">{objective.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        {/* メタ */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">オーナー</div>
            <div className="mt-1 flex items-center justify-center gap-1">
              {owner && (
                <>
                  <Avatar className="size-5"><AvatarFallback className="text-[8px]">{initials(owner.full_name)}</AvatarFallback></Avatar>
                  <span className="truncate text-xs font-medium">{owner.full_name}</span>
                </>
              )}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">達成率</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">{objective.progress}%</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">KR 数</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">{objective.key_results.length}</div>
          </div>
        </div>

        {/* 連携アクション */}
        <div className="mt-3 flex flex-wrap gap-2">
          {owner?.slack_user_id && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await sendSlackReminder(
                  owner.slack_user_id!,
                  `${objective.title} の進捗について話したいので、次回1on1のアジェンダに加えていただけますか？`,
                );
                toast.success("1on1 アジェンダ提案を Slack で送信しました");
              }}
              className="gap-1.5"
            >
              <SlackIconSmall className="size-3.5 text-[#4A154B]" />
              1on1で議論
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success("進捗共有メッセージを Slack へ準備しました")}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            進捗共有
          </Button>
        </div>
      </div>

      {/* 親目標 */}
      {parent && (
        <div className="border-b p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            親目標
          </h3>
          <button
            onClick={() => onSelectChild(parent)}
            className="flex w-full items-center gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/40"
          >
            <ArrowRight className="size-4 rotate-180 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">
                {parent.level === "company" ? "会社目標" : "部署目標"}
              </div>
              <div className="truncate text-sm font-medium">{parent.title}</div>
            </div>
            <span className="text-xs font-bold tabular-nums">{parent.progress}%</span>
          </button>
        </div>
      )}

      {/* Key Results */}
      <div className="p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Key Results ({objective.key_results.length})
        </h3>
        <ul className="space-y-3">
          {objective.key_results.map((kr) => <KeyResultRow key={kr.id} kr={kr} />)}
        </ul>
      </div>

      {/* 子目標 */}
      {childObjectives.length > 0 && (
        <div className="border-t p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            この目標を支える子目標 ({childObjectives.length})
          </h3>
          <ul className="space-y-2">
            {childObjectives.map((child) => (
              <li key={child.id}>
                <button
                  onClick={() => onSelectChild(child)}
                  className="flex w-full items-center gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="size-6 shrink-0 rounded bg-muted/50 flex items-center justify-center">
                    {child.level === "department" ? <Users2 className="size-3 text-muted-foreground" /> : <User className="size-3 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{child.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {child.level === "department" ? "部署目標" : "個人目標"} · KR {child.key_results.length} 件
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums">{child.progress}%</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function KeyResultRow({ kr }: { kr: KeyResult }) {
  const _remaining = kr.target - kr.current;
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          kr.progress >= 100 ? "bg-purple-100 text-purple-800"
            : kr.progress >= 70 ? "bg-emerald-100 text-emerald-800"
            : kr.progress >= 40 ? "bg-amber-100 text-amber-800"
            : "bg-red-100 text-red-800",
        )}>
          {kr.progress}%
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{kr.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {kr.current.toLocaleString()} / {kr.target.toLocaleString()} {kr.unit}
            </span>
            {kr.baseline > 0 && (
              <>
                <span>·</span>
                <span>初期 {kr.baseline.toLocaleString()}</span>
              </>
            )}
            <span>·</span>
            <span className={cn(
              "inline-flex items-center gap-0.5",
              kr.confidence >= 4 ? "text-emerald-700" : kr.confidence >= 3 ? "text-amber-700" : "text-red-700",
            )}>
              信頼度 {kr.confidence}/5
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full",
                kr.progress >= 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                  : kr.progress >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-600"
                  : "bg-gradient-to-r from-red-400 to-red-600",
              )}
              style={{ width: `${Math.min(kr.progress, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {relativeTime(kr.last_updated_at)} 更新
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-xs">
          <Edit3 className="size-3" />
        </Button>
      </div>
    </li>
  );
}

// ─── MBO 評価ビュー ────────────────────
function EvaluationsView({
  cycles, reviews, empMap,
}: {
  cycles: ReviewCycle[];
  reviews: MboReview[];
  empMap: Map<string, DemoEmployee>;
}) {
  const completed = cycles.filter((c) => !c.is_active);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(completed[0]?.id ?? "");
  const cycleReviews = reviews.filter((r) => r.cycle_id === selectedCycleId);

  // 分布
  const dist: Record<MboGrade, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const r of cycleReviews) {
    if (r.final_rating) dist[r.final_rating]++;
  }
  const total = cycleReviews.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">サイクル:</span>
        <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {completed.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 分布 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            最終評価の分布（{total} 名）
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {(["S", "A", "B", "C", "D"] as MboGrade[]).map((grade) => {
              const count = dist[grade];
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={grade} className={cn("rounded-lg border-2 p-3 text-center", MBO_GRADE_TONE[grade])}>
                  <div className="text-2xl font-bold">{grade}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider opacity-80">
                    {count}名 ({pct.toFixed(0)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 個別評価リスト */}
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {cycleReviews.map((r) => {
              const emp = empMap.get(r.employee_id);
              const reviewer = empMap.get(r.reviewer_id);
              if (!emp) return null;
              return (
                <li key={r.id} className="flex items-start gap-3 p-4">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(emp.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{emp.full_name}</span>
                      <span className="text-xs text-muted-foreground">{emp.job_title}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.manager_comment}</p>
                    {reviewer && (
                      <div className="mt-1 text-[10px] text-muted-foreground">評価者: {reviewer.full_name}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {r.self_rating && (
                      <div className="text-center">
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">自己</div>
                        <div className={cn("rounded-md border px-2 py-0.5 text-xs font-bold", MBO_GRADE_TONE[r.self_rating])}>
                          {r.self_rating}
                        </div>
                      </div>
                    )}
                    {r.manager_rating && (
                      <div className="text-center">
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">上長</div>
                        <div className={cn("rounded-md border px-2 py-0.5 text-xs font-bold", MBO_GRADE_TONE[r.manager_rating])}>
                          {r.manager_rating}
                        </div>
                      </div>
                    )}
                    {r.final_rating && (
                      <div className="text-center">
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">最終</div>
                        <div className={cn("rounded-md border-2 px-2 py-0.5 text-xs font-bold", MBO_GRADE_TONE[r.final_rating])}>
                          {r.final_rating}
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
