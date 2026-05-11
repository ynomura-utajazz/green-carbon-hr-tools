"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity, TrendingUp, TrendingDown, Users2, ChevronRight, X, Plus, CheckCircle2,
  AlertCircle, Sparkles, Calendar, Clock, Smile, Award, Target,
} from "lucide-react";
import {
  type Campaign, type Question, type ActionPlan, KIND_LABEL, STATUS_LABEL,
  STATUS_TONE, DIMENSION_LABEL, DIMENSION_COLOR, responseRate, actionsForCampaign,
  latestAnalyzedCampaign, activeCampaigns,
} from "@/lib/demo/surveys";
import { type DemoEmployee, type DemoDept } from "@/lib/demo/employees";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { initials, cn } from "@/lib/utils";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

export function PulseSurveyClient({
  campaigns, actionPlans, employees, departments, trend,
}: {
  campaigns: Campaign[];
  actionPlans: ActionPlan[];
  employees: DemoEmployee[];
  departments: DemoDept[];
  trend: { month: string; engagement: number; manager: number; work_life: number }[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const [tab, setTab] = useState<"dashboard" | "campaigns" | "actions">("dashboard");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const active = activeCampaigns();
  const latest = latestAnalyzedCampaign();
  const openActions = actionPlans.filter((a) => a.status !== "done").length;
  const _lowDeptCount = latest?.results
    ? Object.values(latest.results.by_department).filter((s) => s < 3.5).length
    : 0;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Activity className="size-6 text-gc-700" />
            パルスサーベイ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            月次の定点観測 + 年次のエンゲージメントサーベイで組織の鼓動を捉える。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          新規キャンペーン
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          icon={Smile}
          label="直近エンゲージメント"
          value={latest?.results?.dimensions.engagement?.toFixed(1) ?? "—"}
          unit="/ 5.0"
          tone="success"
          hint={latest ? `${latest.title}` : ""}
          onClick={() => latest && setSelectedCampaign(latest)}
        />
        <KpiTile
          icon={Award}
          label="eNPS"
          value={latest?.results?.enps?.score ?? "—"}
          unit=""
          tone={(latest?.results?.enps?.score ?? 0) >= 0 ? "success" : "warning"}
          hint="年次エンゲージメント"
          onClick={() => latest && setSelectedCampaign(latest)}
        />
        <KpiTile
          icon={Users2}
          label="アクティブ回答中"
          value={active.length > 0 ? `${responseRate(active[0])}%` : "—"}
          unit=""
          tone="primary"
          hint={active[0]?.title ?? ""}
          onClick={() => active[0] && setSelectedCampaign(active[0])}
          disabled={active.length === 0}
        />
        <KpiTile
          icon={Target}
          label="未対応アクション"
          value={openActions}
          unit="件"
          tone={openActions > 0 ? "warning" : "muted"}
          hint="アクションプランを見る"
          onClick={() => setTab("actions")}
          disabled={openActions === 0}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <Activity className="size-3.5" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Calendar className="size-3.5" />
            キャンペーン ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <Target className="size-3.5" />
            アクション
            {openActions > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">
                {openActions}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardView
            latest={latest}
            active={active[0]}
            trend={trend}
            departments={departments}
            onSelectCampaign={setSelectedCampaign}
          />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignsList campaigns={campaigns} onSelect={setSelectedCampaign} />
        </TabsContent>

        <TabsContent value="actions">
          <ActionsTab actions={actionPlans} campaigns={campaigns} empMap={empMap} />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedCampaign} onOpenChange={(o) => !o && setSelectedCampaign(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selectedCampaign && (
            <CampaignDetail
              campaign={selectedCampaign}
              actions={actionsForCampaign(selectedCampaign.id)}
              empMap={empMap}
              deptMap={deptMap}
              onClose={() => setSelectedCampaign(null)}
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
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
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

// ─── ダッシュボード ────────────────────
function DashboardView({
  latest, active, trend, departments, onSelectCampaign,
}: {
  latest?: Campaign;
  active?: Campaign;
  trend: { month: string; engagement: number; manager: number; work_life: number }[];
  departments: DemoDept[];
  onSelectCampaign: (c: Campaign) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* eNPS（年次がある場合） */}
      {latest?.results?.enps && (
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Award className="size-4 text-gc-700" />
              eNPS（{latest.title}）
            </h3>
            <div className="text-center">
              <div className="text-5xl font-extrabold tabular-nums">
                <span className={cn(
                  latest.results.enps.score >= 30 ? "text-emerald-700"
                    : latest.results.enps.score >= 0 ? "text-amber-700"
                    : "text-red-700",
                )}>
                  {latest.results.enps.score >= 0 ? "+" : ""}{latest.results.enps.score}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">業界平均 +12</div>
            </div>
            <div className="mt-4 space-y-2">
              <ENPSBar label="推奨者 (9-10)" value={latest.results.enps.promoter} total={latest.response_count} color="bg-emerald-500" />
              <ENPSBar label="中立 (7-8)" value={latest.results.enps.passive} total={latest.response_count} color="bg-amber-400" />
              <ENPSBar label="批判者 (0-6)" value={latest.results.enps.detractor} total={latest.response_count} color="bg-red-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* トレンド */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-gc-700" />
            主要指標の推移（直近 6 ヶ月）
          </h3>
          <div className="space-y-3">
            <TrendChart label="エンゲージメント" data={trend.map((t) => ({ x: t.month, y: t.engagement }))} color="from-gc-400 to-gc-600" />
            <TrendChart label="マネージャー" data={trend.map((t) => ({ x: t.month, y: t.manager }))} color="from-blue-400 to-blue-600" />
            <TrendChart label="ワークライフ" data={trend.map((t) => ({ x: t.month, y: t.work_life }))} color="from-emerald-400 to-emerald-600" />
          </div>
        </CardContent>
      </Card>

      {/* ディメンション別スコア */}
      {latest?.results && (
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-gc-700" />
              ディメンション別 スコア（{latest.title}）
            </h3>
            <ul className="space-y-2.5">
              {Object.entries(latest.results.dimensions)
                .sort((a, b) => b[1] - a[1])
                .map(([dim, score]) => (
                  <li key={dim} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{DIMENSION_LABEL[dim] ?? dim}</span>
                      <span className="font-bold tabular-nums">{score.toFixed(1)} / 5.0</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full bg-gradient-to-r", DIMENSION_COLOR[dim])}
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
            <div className="mt-3 text-right">
              <Button size="sm" variant="ghost" onClick={() => onSelectCampaign(latest)} className="gap-1.5 text-xs">
                詳細を見る <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 部門別 */}
      {latest?.results && (
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users2 className="size-4 text-gc-700" />
              部門別ヒートマップ
            </h3>
            <ul className="space-y-1.5">
              {Object.entries(latest.results.by_department)
                .sort((a, b) => b[1] - a[1])
                .map(([deptId, score]) => {
                  const d = departments.find((x) => x.id === deptId);
                  if (!d) return null;
                  return (
                    <li key={deptId} className="flex items-center gap-2">
                      <span className="flex-1 truncate text-xs">{d.name}</span>
                      <span className={cn(
                        "rounded-md border px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                        score >= 4.0 ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : score >= 3.5 ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-red-200 bg-red-50 text-red-800",
                      )}>
                        {score.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* アクティブキャンペーン */}
      {active && (
        <Card className="lg:col-span-3 border-emerald-300 bg-emerald-50/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Activity className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_TONE[active.status])}>
                    {STATUS_LABEL[active.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {KIND_LABEL[active.kind]} · {active.is_anonymous ? "匿名" : "記名"}
                  </span>
                </div>
                <h3 className="mt-1 font-bold">{active.title}</h3>
                <div className="mt-1 text-xs text-muted-foreground">
                  {active.starts_at} 〜 {active.ends_at} ・ あと {Math.max(0, Math.ceil((new Date(active.ends_at).getTime() - Date.now()) / 86_400_000))} 日
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">回答状況</span>
                      <span className="font-bold tabular-nums">
                        {active.response_count} / {active.target_count}（{responseRate(active)}%）
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                        style={{ width: `${responseRate(active)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success("Slack #all-hands でリマインドを送信しました（デモ）")}
                  className="gap-1.5"
                >
                  <SlackIconSmall className="size-3.5 text-[#4A154B]" />
                  Slack でリマインド
                </Button>
                <Button size="sm" onClick={() => onSelectCampaign(active)} className="gap-1.5">
                  詳細
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ENPSBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TrendChart({
  label, data, color,
}: {
  label: string;
  data: { x: string; y: number }[];
  color: string;
}) {
  const max = Math.max(...data.map((d) => d.y), 5);
  const min = Math.min(...data.map((d) => d.y), 0);
  const latest = data[data.length - 1].y;
  const previous = data[data.length - 2]?.y ?? latest;
  const delta = latest - previous;

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono tabular-nums">{latest.toFixed(1)}</span>
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[10px]",
            delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-700" : "text-muted-foreground",
          )}>
            {delta > 0 ? <TrendingUp className="size-3" /> : delta < 0 ? <TrendingDown className="size-3" /> : null}
            {delta > 0 ? "+" : ""}{delta.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex h-12 items-end gap-1">
        {data.map((d, i) => {
          const range = max - min || 1;
          const heightPct = ((d.y - min) / range) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className={cn("w-full rounded-t bg-gradient-to-t", color)}
                  style={{ height: `${Math.max(heightPct, 8)}%` }}
                  title={`${d.x}: ${d.y.toFixed(1)}`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{d.x}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── キャンペーン一覧 ────────────────
function CampaignsList({
  campaigns, onSelect,
}: {
  campaigns: Campaign[];
  onSelect: (c: Campaign) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {campaigns.map((c) => (
        <Card
          key={c.id}
          onClick={() => onSelect(c)}
          className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                c.kind === "engagement" ? "bg-purple-100 text-purple-700" : "bg-gc-100 text-gc-700",
              )}>
                <Activity className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_TONE[c.status])}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{KIND_LABEL[c.kind]}</Badge>
                  {c.is_anonymous && <Badge variant="secondary" className="text-[10px]">匿名</Badge>}
                </div>
                <h3 className="mt-1 font-semibold">{c.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground">期間</div>
                    <div className="text-[10px] font-medium">{c.starts_at}</div>
                    <div className="text-[10px] text-muted-foreground">〜{c.ends_at}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">回答率</div>
                    <div className="font-bold tabular-nums">{responseRate(c)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">設問</div>
                    <div className="font-bold tabular-nums">{c.questions.length} 問</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── アクションタブ ───────────────────
function ActionsTab({
  actions, campaigns, empMap,
}: {
  actions: ActionPlan[];
  campaigns: Campaign[];
  empMap: Map<string, DemoEmployee>;
}) {
  const cMap = new Map(campaigns.map((c) => [c.id, c]));
  const open = actions.filter((a) => a.status !== "done");
  const done = actions.filter((a) => a.status === "done");

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          進行中・未対応 ({open.length})
        </h3>
        <ul className="space-y-2">
          {open.map((a) => {
            const c = cMap.get(a.campaign_id);
            const owner = empMap.get(a.owner_id);
            const overdue = new Date(a.due_date) < new Date();
            return (
              <li key={a.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    a.status === "in_progress" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800",
                  )}>
                    {a.status === "in_progress" ? <Clock className="size-4" /> : <Target className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{a.title}</span>
                      <Badge variant={a.status === "in_progress" ? "warning" : "outline"} className="text-[10px]">
                        {a.status === "in_progress" ? "進行中" : "未着手"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {DIMENSION_LABEL[a.related_dimension] ?? a.related_dimension}
                      </Badge>
                      {overdue && <Badge variant="danger" className="text-[10px]">期限超過</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <span>由来: {c?.title ?? "—"}</span>
                      <span>·</span>
                      <span>期限 {a.due_date}</span>
                      {owner && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Avatar className="size-3.5"><AvatarFallback className="text-[7px]">{initials(owner.full_name)}</AvatarFallback></Avatar>
                            {owner.full_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {done.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            完了済み ({done.length})
          </h3>
          <ul className="space-y-1.5">
            {done.map((a) => {
              const owner = empMap.get(a.owner_id);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-md border bg-card/50 p-3 opacity-70">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm line-through">{a.title}</div>
                    {owner && <div className="text-[10px] text-muted-foreground">{owner.full_name}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── キャンペーン詳細 ────────────────
function CampaignDetail({
  campaign, actions, empMap: _empMap, deptMap, onClose,
}: {
  campaign: Campaign;
  actions: ActionPlan[];
  empMap: Map<string, DemoEmployee>;
  deptMap: Map<string, DemoDept>;
  onClose: () => void;
}) {
  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gc-50 text-gc-700">
            <Activity className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_TONE[campaign.status])}>
                {STATUS_LABEL[campaign.status]}
              </span>
              <Badge variant="outline" className="text-[10px]">{KIND_LABEL[campaign.kind]}</Badge>
              {campaign.is_anonymous && <Badge variant="secondary" className="text-[10px]">匿名</Badge>}
            </div>
            <SheetTitle className="mt-1 text-lg font-bold">{campaign.title}</SheetTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">{campaign.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">期間</div>
            <div className="text-xs font-medium">{campaign.starts_at.slice(5)}〜{campaign.ends_at.slice(5)}</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">回答率</div>
            <div className="text-lg font-bold tabular-nums">{responseRate(campaign)}%</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">設問</div>
            <div className="text-lg font-bold tabular-nums">{campaign.questions.length}</div>
          </div>
        </div>
      </div>

      {/* 結果 */}
      {campaign.results && (
        <div className="space-y-5 p-5">
          {campaign.results.enps && (
            <Section title="eNPS">
              <div className="rounded-lg border bg-card p-4">
                <div className="text-center">
                  <div className="text-4xl font-extrabold tabular-nums">
                    {campaign.results.enps.score >= 0 ? "+" : ""}{campaign.results.enps.score}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                    <div className="font-bold text-emerald-700">{campaign.results.enps.promoter}</div>
                    <div className="text-[10px] text-emerald-700">推奨</div>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                    <div className="font-bold text-amber-700">{campaign.results.enps.passive}</div>
                    <div className="text-[10px] text-amber-700">中立</div>
                  </div>
                  <div className="rounded-md border border-red-200 bg-red-50 p-2">
                    <div className="font-bold text-red-700">{campaign.results.enps.detractor}</div>
                    <div className="text-[10px] text-red-700">批判</div>
                  </div>
                </div>
              </div>
            </Section>
          )}

          <Section title="ディメンション別 スコア">
            <ul className="space-y-2">
              {Object.entries(campaign.results.dimensions).map(([dim, score]) => (
                <li key={dim} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{DIMENSION_LABEL[dim] ?? dim}</span>
                    <span className="font-bold tabular-nums">{score.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full bg-gradient-to-r", DIMENSION_COLOR[dim])}
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="部門別 スコア">
            <ul className="space-y-1.5">
              {Object.entries(campaign.results.by_department)
                .sort((a, b) => b[1] - a[1])
                .map(([deptId, score]) => {
                  const d = deptMap.get(deptId);
                  if (!d) return null;
                  return (
                    <li key={deptId} className="flex items-center gap-2">
                      <span className="flex-1 text-xs">{d.name}</span>
                      <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full bg-gradient-to-r", DIMENSION_COLOR.engagement)} style={{ width: `${(score / 5) * 100}%` }} />
                      </div>
                      <span className={cn(
                        "rounded-md border px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                        score >= 4.0 ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : score >= 3.5 ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-red-200 bg-red-50 text-red-800",
                      )}>
                        {score.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </Section>

          {campaign.results.sentiment_keywords.length > 0 && (
            <Section title="自由記述から抽出されたキーワード">
              <div className="flex flex-wrap gap-1.5">
                {campaign.results.sentiment_keywords.map((kw) => (
                  <span key={kw} className="rounded-full border bg-muted/50 px-2 py-1 text-xs">
                    #{kw}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {campaign.results.top_actions.length > 0 && (
            <Section title="推奨アクション">
              <ul className="space-y-1.5">
                {campaign.results.top_actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md border bg-amber-50/40 p-2.5 text-sm">
                    <Sparkles className="size-3.5 shrink-0 text-amber-700 mt-0.5" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {/* 設問 */}
      <div className="border-t p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          設問一覧 ({campaign.questions.length})
        </h3>
        <ul className="space-y-1.5">
          {campaign.questions.map((q, i) => <QuestionRow key={q.id} q={q} idx={i + 1} />)}
        </ul>
      </div>

      {/* 紐付くアクションプラン */}
      {actions.length > 0 && (
        <div className="border-t p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            紐付くアクションプラン ({actions.length})
          </h3>
          <ul className="space-y-1.5">
            {actions.map((a) => (
              <li key={a.id} className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-sm">
                {a.status === "done" ? <CheckCircle2 className="size-4 text-emerald-600" />
                  : a.status === "in_progress" ? <Clock className="size-4 text-amber-600" />
                  : <AlertCircle className="size-4 text-blue-600" />}
                <div className="flex-1">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-[10px] text-muted-foreground">期限 {a.due_date}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function QuestionRow({ q, idx }: { q: Question; idx: number }) {
  return (
    <li className="rounded-md border bg-card p-2.5 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono text-muted-foreground">Q{idx}.</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm">{q.text}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="rounded-full bg-muted px-1.5 py-0.5">
              {q.kind === "scale_5" ? "5段階" : q.kind === "scale_10" ? "10段階" : q.kind === "enps" ? "eNPS" : q.kind === "text" ? "自由記述" : q.kind}
            </span>
            <span>·</span>
            <span>{DIMENSION_LABEL[q.dimension] ?? q.dimension}</span>
            {q.required && <span className="text-red-600">必須</span>}
          </div>
        </div>
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
