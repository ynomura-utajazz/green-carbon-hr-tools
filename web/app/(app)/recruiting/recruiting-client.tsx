"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList, Users2, Briefcase, CalendarDays, Award, ChevronRight, X, Plus,
  Mail, Send, Star, ThumbsDown, ArrowRight, CalendarPlus, ExternalLink, Sparkles,
  Filter, FileText, MapPin,
} from "lucide-react";
import {
  type Position, type Candidate, type InterviewEvent, type CandidateSource,
  STAGE_ORDER, STAGE_LABEL, STAGE_TONE, SOURCE_LABEL, candidatesByStage, nextStage,
  interviewsForCandidate, candidatesForPosition, activePipelineCount,
} from "@/lib/demo/recruiting";
import { type DemoEmployee } from "@/lib/demo/employees";
import { createGoogleCalendarEventUrl } from "@/lib/google-calendar";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { AiScorecard } from "@/components/ai-scorecard";
import { RecruitingIntelligence } from "@/components/recruiting-intelligence";
import { useT } from "@/lib/use-t";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { initials, formatDate, relativeTime, cn } from "@/lib/utils";

function _SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

const SOURCE_TONE: Record<CandidateSource, string> = {
  referral: "bg-emerald-100 text-emerald-800 border-emerald-200",
  contractor_conversion: "bg-purple-100 text-purple-800 border-purple-200",
  alumni: "bg-amber-100 text-amber-800 border-amber-200",
  linkedin: "bg-blue-100 text-blue-800 border-blue-200",
  wantedly: "bg-pink-100 text-pink-800 border-pink-200",
  indeed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  agent: "bg-orange-100 text-orange-800 border-orange-200",
  direct: "bg-gray-100 text-gray-800 border-gray-200",
};

export function RecruitingClient({
  positions, candidates, interviews, employees,
}: {
  positions: Position[];
  candidates: Candidate[];
  interviews: InterviewEvent[];
  employees: DemoEmployee[];
}) {
  const t = useT();
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const positionMap = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  const [tab, setTab] = useState<"pipeline" | "positions" | "candidates" | "analytics">("pipeline");
  const [selectedPositionId, setSelectedPositionId] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // KPI
  const openPositions = positions.filter((p) => p.is_open).length;
  const inPipeline = activePipelineCount();
  const upcomingInterviews = interviews.filter((i) => i.status === "scheduled").length;
  const offerOut = candidates.filter((c) => c.stage === "offer").length;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardList className="size-6 text-gc-700" />
            {t("page.recruiting.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("page.recruiting.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5">
            <Plus className="size-4" />
            候補者を追加
          </Button>
          <Button className="gap-1.5">
            <Briefcase className="size-4" />
            求人を作成
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={Briefcase} label="募集中ポジション" value={openPositions} unit="件" tone="primary" onClick={() => setTab("positions")} hint="求人一覧へ" />
        <KpiTile icon={Users2} label="パイプライン" value={inPipeline} unit="名" tone="primary" onClick={() => setTab("pipeline")} hint="カンバンを開く" />
        <KpiTile icon={CalendarDays} label="予定された面接" value={upcomingInterviews} unit="件" tone="success" onClick={() => setTab("candidates")} hint="候補者一覧へ" />
        <KpiTile icon={Award} label="オファー中" value={offerOut} unit="名" tone={offerOut > 0 ? "warning" : "muted"} onClick={() => setTab("pipeline")} hint="オファーカラムへ" disabled={offerOut === 0} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-2">
            <Filter className="size-3.5" />
            パイプライン
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <Briefcase className="size-3.5" />
            求人 ({openPositions})
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-2">
            <Users2 className="size-3.5" />
            候補者一覧 ({candidates.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <Sparkles className="size-3.5" />
            分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PositionFilter
            positions={positions}
            selectedId={selectedPositionId}
            onChange={setSelectedPositionId}
          />
          <PipelineKanban
            candidates={candidates}
            positionId={selectedPositionId === "all" ? undefined : selectedPositionId}
            onSelect={setSelectedCandidate}
          />
        </TabsContent>

        <TabsContent value="positions">
          <PositionsList
            positions={positions}
            candidates={candidates}
            empMap={empMap}
            onSelectPosition={(p) => { setSelectedPositionId(p.id); setTab("pipeline"); }}
          />
        </TabsContent>

        <TabsContent value="candidates">
          <CandidatesTable
            candidates={candidates}
            positions={positions}
            onSelect={setSelectedCandidate}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <Analytics candidates={candidates} positions={positions} empMap={empMap} />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedCandidate} onOpenChange={(o) => !o && setSelectedCandidate(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selectedCandidate && (
            <CandidateDetail
              candidate={selectedCandidate}
              position={positionMap.get(selectedCandidate.position_id)}
              empMap={empMap}
              interviews={interviewsForCandidate(selectedCandidate.id)}
              onClose={() => setSelectedCandidate(null)}
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

// ─── ポジションフィルター ─────────────
function PositionFilter({
  positions, selectedId, onChange,
}: {
  positions: Position[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">求人で絞り込み:</span>
      <Select value={selectedId} onValueChange={onChange}>
        <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての求人</SelectItem>
          {positions.filter((p) => p.is_open).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}（{p.department}）
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── カンバン ──────────────────────────
function PipelineKanban({
  candidates: _candidates, positionId, onSelect,
}: {
  candidates: Candidate[];
  positionId?: string;
  onSelect: (c: Candidate) => void;
}) {
  const grouped = candidatesByStage(positionId);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGE_ORDER.map((stage) => {
        const items = grouped.get(stage) ?? [];
        return (
          <div key={stage} className="w-72 shrink-0">
            <div className={cn(
              "mb-2 flex items-center justify-between rounded-md border px-3 py-1.5 text-xs font-semibold",
              STAGE_TONE[stage],
            )}>
              <span>{STAGE_LABEL[stage]}</span>
              <span className="rounded-full bg-white/70 px-1.5 py-0.5 font-mono">{items.length}</span>
            </div>
            <ul className="space-y-2">
              {items.length === 0 ? (
                <li className="rounded-md border border-dashed py-4 text-center text-[11px] text-muted-foreground">
                  なし
                </li>
              ) : (
                items.map((c) => (
                  <KanbanCard key={c.id} candidate={c} onClick={() => onSelect(c)} />
                ))
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ candidate, onClick }: { candidate: Candidate; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="block w-full rounded-md border bg-card p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-gc-300 hover:shadow-md"
      >
        <div className="flex items-start gap-2">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="text-[10px]">{initials(candidate.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium">{candidate.full_name}</span>
              {candidate.rating && candidate.rating >= 4 && (
                <Star className="size-3 fill-amber-400 text-amber-400" />
              )}
            </div>
            <div className="truncate text-[10px] text-muted-foreground">
              {candidate.current_role ?? "—"}
              {candidate.years_of_experience && ` · ${candidate.years_of_experience}年`}
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className={cn("rounded-full border px-1.5 py-0 text-[9px]", SOURCE_TONE[candidate.source])}>
            {SOURCE_LABEL[candidate.source]}
          </span>
          {candidate.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-1.5 py-0 text-[9px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {relativeTime(candidate.updated_at)} 更新
        </div>
      </button>
    </li>
  );
}

// ─── 求人一覧 ──────────────────────────
function PositionsList({
  positions, candidates: _candidates, empMap, onSelectPosition,
}: {
  positions: Position[];
  candidates: Candidate[];
  empMap: Map<string, DemoEmployee>;
  onSelectPosition: (p: Position) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {positions.map((p) => {
        const cands = candidatesForPosition(p.id);
        const active = cands.filter((c) => !["rejected", "withdrawn", "hired"].includes(c.stage));
        const hiringMgr = empMap.get(p.hiring_manager_id);
        const recruiter = empMap.get(p.recruiter_id);
        const daysOpen = Math.floor((Date.now() - new Date(p.opened_at).getTime()) / 86_400_000);
        const daysToClose = Math.floor((new Date(p.target_close_at).getTime() - Date.now()) / 86_400_000);

        return (
          <Card
            key={p.id}
            onClick={() => onSelectPosition(p)}
            className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{p.title}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.department}</span>
                    <span>·</span>
                    <span>{p.job_grade}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{p.location}</span>
                  </div>
                </div>
                <Badge variant={p.is_open ? "success" : "secondary"}>
                  {p.is_open ? "募集中" : "停止"}
                </Badge>
              </div>

              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-muted/50 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">候補者</div>
                  <div className="font-bold tabular-nums">{active.length}</div>
                </div>
                <div className="rounded-md bg-muted/50 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">経過日数</div>
                  <div className="font-bold tabular-nums">{daysOpen}日</div>
                </div>
                <div className={cn(
                  "rounded-md bg-muted/50 p-2 text-center",
                  daysToClose < 14 && "bg-amber-50 text-amber-900",
                )}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">残り</div>
                  <div className="font-bold tabular-nums">{daysToClose}日</div>
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                想定年収 ¥{p.salary_min.toLocaleString()} 〜 ¥{p.salary_max.toLocaleString()}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                採用責任者: {hiringMgr?.full_name ?? "—"} · リクルーター: {recruiter?.full_name ?? "—"}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── 候補者テーブル ────────────────────
function CandidatesTable({
  candidates, positions, onSelect,
}: {
  candidates: Candidate[];
  positions: Position[];
  onSelect: (c: Candidate) => void;
}) {
  const positionMap = new Map(positions.map((p) => [p.id, p]));
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">氏名</th>
              <th className="px-4 py-3 font-medium">ポジション</th>
              <th className="px-4 py-3 font-medium">ステージ</th>
              <th className="px-4 py-3 font-medium">経路</th>
              <th className="px-4 py-3 font-medium">経験</th>
              <th className="px-4 py-3 font-medium">評価</th>
              <th className="px-4 py-3 font-medium">更新</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {candidates.map((c) => {
              const p = positionMap.get(c.position_id);
              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(c.full_name)}</AvatarFallback></Avatar>
                      <div>
                        <div className="font-medium">{c.full_name}</div>
                        {c.current_role && (
                          <div className="text-xs text-muted-foreground">{c.current_role}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p?.title ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STAGE_TONE[c.stage])}>
                      {STAGE_LABEL[c.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full border px-1.5 py-0 text-[10px]", SOURCE_TONE[c.source])}>
                      {SOURCE_LABEL[c.source]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {c.years_of_experience ? `${c.years_of_experience}年` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.rating ? (
                      <span className="inline-flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn("size-3", i < c.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
                          />
                        ))}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {relativeTime(c.updated_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── 候補者詳細パネル ──────────────────
function CandidateDetail({
  candidate, position, empMap, interviews, onClose,
}: {
  candidate: Candidate;
  position?: Position;
  empMap: Map<string, DemoEmployee>;
  interviews: InterviewEvent[];
  onClose: () => void;
}) {
  const next = nextStage(candidate.stage);
  const referrer = candidate.referrer_employee_id ? empMap.get(candidate.referrer_employee_id) : null;

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback>{initials(candidate.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-bold">{candidate.full_name}</SheetTitle>
            {candidate.display_name_en && (
              <div className="text-xs text-muted-foreground">{candidate.display_name_en}</div>
            )}
            <div className="mt-0.5 text-sm">
              {candidate.current_role}
              {candidate.current_company && ` · ${candidate.current_company}`}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STAGE_TONE[candidate.stage])}>
                {STAGE_LABEL[candidate.stage]}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", SOURCE_TONE[candidate.source])}>
                {SOURCE_LABEL[candidate.source]}
              </span>
              {candidate.rating && (
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn("size-3", i < candidate.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        {/* ステージアクション */}
        <div className="mt-4 flex flex-wrap gap-2">
          {next && (
            <Button
              size="sm"
              onClick={() => toast.success(`${candidate.full_name} を ${STAGE_LABEL[next]} に移動しました`)}
              className="gap-1.5"
            >
              <ArrowRight className="size-3.5" />
              {STAGE_LABEL[next]} へ進める
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success("見送り通知メールテンプレートを下書きしました")}
            className="gap-1.5"
          >
            <ThumbsDown className="size-3.5 text-red-700" />
            見送り
          </Button>
          {candidate.email && (
            <Button size="sm" variant="outline" asChild>
              <a href={`mailto:${candidate.email}`}>
                <Mail className="size-3.5" />
                メール
              </a>
            </Button>
          )}
          {candidate.linkedin_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                LinkedIn
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* 基本情報 */}
        <Section title="基本情報">
          <Row label="ポジション">{position?.title ?? "—"}{position && ` (${position.department})`}</Row>
          <Row label="経験年数">{candidate.years_of_experience ? `${candidate.years_of_experience}年` : "—"}</Row>
          <Row label="希望年収">
            {candidate.desired_salary
              ? `¥${candidate.desired_salary.toLocaleString()} (${candidate.desired_currency})`
              : "—"}
          </Row>
          <Row label="入社可能日">{candidate.expected_start_date ? formatDate(candidate.expected_start_date) : "—"}</Row>
          <Row label="連絡先">
            <a href={`mailto:${candidate.email}`} className="text-blue-700 hover:underline">{candidate.email}</a>
          </Row>
          {referrer && (
            <Row label="リファラー">
              <span className="inline-flex items-center gap-1.5">
                <Avatar className="size-5"><AvatarFallback className="text-[9px]">{initials(referrer.full_name)}</AvatarFallback></Avatar>
                {referrer.full_name}
              </span>
            </Row>
          )}
          {candidate.former_contractor_id && (
            <Row label="特記事項">
              <span className="inline-flex items-center gap-1 text-purple-800">
                <Sparkles className="size-3.5" />
                業務委託からの転換候補
              </span>
            </Row>
          )}
        </Section>

        {candidate.notes && (
          <Section title="メモ">
            <p className="text-sm leading-relaxed text-muted-foreground">{candidate.notes}</p>
          </Section>
        )}

        {/* 面接履歴 */}
        <Section title={`面接（${interviews.length}）`}>
          {interviews.length === 0 ? (
            <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
              まだ面接が設定されていません
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="gap-1.5"
                >
                  <a
                    href={createGoogleCalendarEventUrl({
                      title: `面接: ${candidate.full_name} (${position?.title ?? ""})`,
                      description: `候補者: ${candidate.full_name}\n現職: ${candidate.current_role ?? "—"}\n経歴: ${candidate.years_of_experience}年\n\n${candidate.notes}`,
                      start: new Date(Date.now() + 7 * 86_400_000),
                      attendees: [candidate.email],
                      timezone: "Asia/Tokyo",
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CalendarPlus className="size-3.5" />
                    面接を Google Calendar に登録
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {interviews.map((iv) => <InterviewRow key={iv.id} interview={iv} empMap={empMap} />)}
            </ul>
          )}
        </Section>

        {/* オファー連携 */}
        {candidate.stage === "offer" && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Award className="size-5 text-amber-700" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900">オファー作成中</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  候補者の希望条件を反映してオファーレターを生成・送付できます。
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1.5">
                    <FileText className="size-3.5" />
                    オファーレター生成
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success("内定通知メールを下書きしました")}
                    className="gap-1.5"
                  >
                    <Send className="size-3.5" />
                    内定通知メール
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI 評価サマリ生成（Markdown） */}
        {(candidate.notes || interviews.length > 0) && (
          <Section title="AI 評価サマリ">
            <AiGeneratePanel
              title="候補者評価サマリ"
              endpoint="/api/ai/recruiting-summary"
              hint="メモ・面接情報から、強み／懸念／推奨アクション／総合評価を Markdown で生成します。"
              payload={() => ({
                name: candidate.full_name,
                position: position?.title ?? "—",
                resumeText: candidate.current_role ? `現職: ${candidate.current_role}（経験${candidate.years_of_experience}年）` : undefined,
                interviewNotes: candidate.notes ?? "（メモなし）",
                preferences: candidate.desired_salary
                  ? `希望年収: ${candidate.desired_salary.toLocaleString()} ${candidate.desired_currency ?? "JPY"}`
                  : undefined,
              })}
            />
          </Section>
        )}

        {/* AI 構造化スコアカード（JSON 自動入力用） */}
        {(candidate.notes || interviews.length > 0) && (
          <Section title="AI 構造化スコアカード">
            <AiScorecard
              payload={() => ({
                name: candidate.full_name,
                position: position?.title ?? "—",
                resumeText: candidate.current_role ? `現職: ${candidate.current_role}（経験${candidate.years_of_experience}年）` : undefined,
                interviewNotes: candidate.notes ?? "（メモなし）",
              })}
            />
          </Section>
        )}

        {/* 採用 Intelligence（自動判定 + 類似社員 + ポジションフィット） */}
        <Section title="採用 Intelligence">
          <RecruitingIntelligence candidate={candidate} />
        </Section>

        {/* AI 面接官アシスタントへのディープリンク */}
        <Section title="AI 面接官アシスタント">
          <div className="flex items-center justify-between gap-3 rounded-md border border-gc-200 bg-gc-50/40 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">面接前ブリーフィング・ライブ質問サジェスト</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                この候補者の情報を引き継いで、面接コンパニオンを開きます
              </div>
            </div>
            <Button asChild size="sm" className="gap-1.5 shrink-0">
              <a href={`/interview-assistant?candidateId=${candidate.id}`}>
                <ArrowRight className="size-3.5" />
                面接準備を開始
              </a>
            </Button>
          </div>
        </Section>

        {/* 採用済 → オンボーディング誘導 */}
        {candidate.stage === "hired" && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <ClipboardList className="size-5 text-emerald-700" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-emerald-900">採用決定済み 🎉</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  オンボーディングテンプレートを適用して入社準備を開始しましょう。
                </p>
                <Button size="sm" className="mt-2 gap-1.5" asChild>
                  <a href="/onboarding">
                    <ArrowRight className="size-3.5" />
                    オンボーディングを開始
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function InterviewRow({
  interview, empMap,
}: {
  interview: InterviewEvent;
  empMap: Map<string, DemoEmployee>;
}) {
  const interviewers = interview.interviewer_ids.map((id) => empMap.get(id)).filter(Boolean) as DemoEmployee[];
  const isUpcoming = interview.status === "scheduled" && new Date(interview.scheduled_at) > new Date();
  const date = new Date(interview.scheduled_at);

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          isUpcoming ? "bg-blue-100 text-blue-700"
            : interview.status === "completed" ? "bg-emerald-100 text-emerald-700"
            : "bg-gray-100 text-gray-700",
        )}>
          <CalendarDays className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">第{interview.round}次面接</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(interview.scheduled_at)} {date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{interview.duration_minutes}分</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">
              {interview.format === "online" ? "🎥 オンライン" : interview.format === "onsite" ? "🏢 対面" : "🔀 ハイブリッド"}
            </span>
            {interview.status === "scheduled" && (
              <Badge variant="beta" className="text-[10px]">予定</Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {interviewers.map((iv) => (
                <Avatar key={iv.id} className="size-5 border-2 border-background">
                  <AvatarFallback className="text-[8px]">{initials(iv.full_name)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {interviewers.map((iv) => iv.full_name).join(" · ")}
            </span>
          </div>
          {interview.meet_url && isUpcoming && (
            <a
              href={interview.meet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
            >
              <ExternalLink className="size-3" /> Meet で参加
            </a>
          )}

          {/* 評価フィードバック */}
          {interview.feedback.length > 0 && (
            <div className="mt-2 space-y-2 border-t pt-2">
              {interview.feedback.map((f, i) => {
                const interviewer = empMap.get(f.interviewer_id);
                const decisionTone = {
                  strong_hire: "border-emerald-300 bg-emerald-50 text-emerald-800",
                  hire: "border-emerald-200 bg-emerald-50 text-emerald-700",
                  no_hire: "border-amber-200 bg-amber-50 text-amber-800",
                  strong_no_hire: "border-red-200 bg-red-50 text-red-800",
                }[f.decision];
                const decisionLabel = {
                  strong_hire: "強く採用",
                  hire: "採用",
                  no_hire: "見送り",
                  strong_no_hire: "強く見送り",
                }[f.decision];
                const avgScore = (f.scores.technical + f.scores.communication + f.scores.culture_fit + f.scores.motivation) / 4;
                return (
                  <div key={i} className="rounded-md bg-muted/30 p-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5"><AvatarFallback className="text-[9px]">{interviewer ? initials(interviewer.full_name) : "—"}</AvatarFallback></Avatar>
                      <span className="text-xs font-medium">{interviewer?.full_name ?? "—"}</span>
                      <span className={cn("rounded-full border px-1.5 py-0 text-[9px]", decisionTone)}>
                        {decisionLabel}
                      </span>
                      <span className="ml-auto font-mono text-[10px] tabular-nums">
                        {avgScore.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs">{f.comment}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── 分析タブ ────────────────────────
function Analytics({
  candidates, positions, empMap,
}: {
  candidates: Candidate[];
  positions: Position[];
  empMap: Map<string, DemoEmployee>;
}) {
  // 経路別の流入数
  const bySource = new Map<CandidateSource, number>();
  for (const c of candidates) {
    bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);
  }
  const sortedSource = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
  const total = candidates.length;

  // ポジションごとの状態
  const positionStats = positions.map((p) => {
    const cands = candidatesForPosition(p.id);
    const active = cands.filter((c) => !["rejected", "withdrawn", "hired"].includes(c.stage));
    const offered = cands.filter((c) => c.stage === "offer").length;
    const hired = cands.filter((c) => c.stage === "hired").length;
    return { position: p, active: active.length, offered, hired, total: cands.length };
  });

  // ファンネル
  const stageFunnel = STAGE_ORDER.map((s) => ({
    stage: s,
    count: candidates.filter((c) => c.stage === s).length,
  }));
  const maxStageCount = Math.max(...stageFunnel.map((s) => s.count), 1);

  // リファラル成果
  const referrerCounts = new Map<string, number>();
  for (const c of candidates) {
    if (c.referrer_employee_id) {
      referrerCounts.set(c.referrer_employee_id, (referrerCounts.get(c.referrer_employee_id) ?? 0) + 1);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Filter className="size-4 text-gc-700" />
            経路別 流入
          </h3>
          <ul className="space-y-2">
            {sortedSource.map(([src, count]) => {
              const pct = (count / total) * 100;
              return (
                <li key={src} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", SOURCE_TONE[src])}>
                      {SOURCE_LABEL[src]}
                    </span>
                    <span className="font-medium tabular-nums">{count}名 ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-gc-500 to-gc-700" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users2 className="size-4 text-gc-700" />
            選考ファネル
          </h3>
          <ul className="space-y-1.5">
            {stageFunnel.map(({ stage, count }) => {
              const pct = (count / maxStageCount) * 100;
              return (
                <li key={stage} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>{STAGE_LABEL[stage]}</span>
                    <span className="font-medium tabular-nums">{count}名</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full transition-all",
                        stage === "hired" ? "bg-gradient-to-r from-emerald-500 to-emerald-700"
                          : stage === "offer" ? "bg-gradient-to-r from-amber-400 to-amber-600"
                          : "bg-gradient-to-r from-gc-400 to-gc-600",
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

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Briefcase className="size-4 text-gc-700" />
            ポジション別 進捗
          </h3>
          <ul className="space-y-2">
            {positionStats.map(({ position, active, offered, hired }) => (
              <li key={position.id} className="rounded-md border bg-card p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{position.title}</span>
                  <span className="text-xs text-muted-foreground">{position.department}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <span><strong className="tabular-nums">{active}</strong> 進行中</span>
                  {offered > 0 && <span className="text-amber-700"><strong className="tabular-nums">{offered}</strong> オファー中</span>}
                  {hired > 0 && <span className="text-emerald-700"><strong className="tabular-nums">{hired}</strong> 採用済</span>}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-gc-700" />
            リファラル ヒーロー
          </h3>
          {referrerCounts.size === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              リファラル候補者はまだいません
            </div>
          ) : (
            <ul className="space-y-2">
              {[...referrerCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([id, count]) => {
                  const e = empMap.get(id);
                  if (!e) return null;
                  return (
                    <li key={id} className="flex items-center gap-3">
                      <Avatar className="size-7"><AvatarFallback className="text-[10px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{e.full_name}</div>
                        <div className="text-[10px] text-muted-foreground">{e.job_title}</div>
                      </div>
                      <span className="rounded-full border bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 tabular-nums">
                        {count}名
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
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
