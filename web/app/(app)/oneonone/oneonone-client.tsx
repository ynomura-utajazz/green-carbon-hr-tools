"use client";

import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  CalendarPlus, Clock, AlertCircle, CheckCircle2, MessageSquare,
  Sparkles, Users, ListChecks, X, ChevronRight, Video, Calendar as CalendarIcon,
  Send,
} from "lucide-react";
import {
  type DemoEmployee, type DemoDept, officeByCode,
} from "@/lib/demo/employees";
import {
  MOOD_EMOJI, MOOD_COLOR, MOOD_RANK,
  type OneOnOneSession, type ActionItem, type OneOnOneMood,
} from "@/lib/demo/oneonones";
import {
  createGoogleCalendarEventUrl, fakeGoogleMeetUrl,
} from "@/lib/google-calendar";
import { openSlackDm, sendSlackReminder } from "@/lib/slack";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import { PresenceAvatars } from "@/components/presence-avatars";
import { usePresence } from "@/lib/use-presence";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { initials, formatDate, relativeTime, cn } from "@/lib/utils";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

type Props = {
  currentEmployeeId: string;
  employees: DemoEmployee[];
  departments: DemoDept[];
  sessions: OneOnOneSession[];
  actionItems: ActionItem[];
};

type TabId = "my-team" | "my-1on1" | "actions";
type MemberFilter = "all" | "stale";
type ActionFilter = "all" | "overdue";
type DetailKind = null | "completed" | "mood";

const FILTER_LABEL: Record<MemberFilter | ActionFilter, string> = {
  all: "すべて",
  stale: "2週間以上未実施",
  overdue: "期限超過のみ",
};

export function OneOnOneClient({
  currentEmployeeId, employees, departments, sessions, actionItems,
}: Props) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const me = empMap.get(currentEmployeeId);

  const myReports = useMemo(
    () => employees.filter((e) => e.manager_id === currentEmployeeId),
    [employees, currentEmployeeId]
  );
  const myManagerSessions = useMemo(
    () => sessions.filter((s) => s.member_id === currentEmployeeId),
    [sessions, currentEmployeeId]
  );

  // 状態：タブ・フィルター・サイドパネル
  const [activeTab, setActiveTab] = useState<TabId>("my-team");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [detailKind, setDetailKind] = useState<DetailKind>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForMemberId, setScheduleForMemberId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const selectedMember = selectedMemberId ? empMap.get(selectedMemberId) : null;

  // 派生データ
  const myTeamCompleted = useMemo(
    () => sessions.filter(
      (s) => s.manager_id === currentEmployeeId
        && myReports.some((r) => r.id === s.member_id)
        && s.completed_at
    ),
    [sessions, myReports, currentEmployeeId]
  );

  const staleMembers = useMemo(() => {
    return myReports.filter((r) => {
      const last = myTeamCompleted
        .filter((s) => s.member_id === r.id)
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))[0];
      if (!last?.completed_at) return true;
      return Date.now() - new Date(last.completed_at).getTime() > 14 * 86400000;
    });
  }, [myReports, myTeamCompleted]);

  const teamActions = useMemo(
    () => actionItems.filter((a) => myReports.some((r) => r.id === a.member_id)),
    [actionItems, myReports]
  );
  const overdueActions = useMemo(
    () => teamActions.filter(
      (a) => !a.completed_at && a.due_date && new Date(a.due_date) < new Date()
    ),
    [teamActions]
  );

  // 表示メンバー（フィルター後）
  const displayedMembers = useMemo(() => {
    if (memberFilter === "stale") return staleMembers;
    return myReports;
  }, [memberFilter, staleMembers, myReports]);

  // 表示アクション（フィルター後）
  const displayedActions = useMemo(() => {
    if (actionFilter === "overdue") return overdueActions;
    return teamActions;
  }, [actionFilter, teamActions, overdueActions]);

  // KPI クリックハンドラ
  const scrollToTabs = () => {
    setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const onClickCompleted = () => {
    setDetailKind("completed");
  };
  const onClickMood = () => {
    setDetailKind("mood");
  };
  const onClickStale = () => {
    setActiveTab("my-team");
    setMemberFilter("stale");
    scrollToTabs();
  };
  const onClickOverdue = () => {
    setActiveTab("actions");
    setActionFilter("overdue");
    scrollToTabs();
  };

  // KPI 値
  const moodValues = myTeamCompleted.map((s) => s.mood ? MOOD_RANK[s.mood] : 0).filter((v) => v > 0);
  const avgMood = moodValues.length
    ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1)
    : "—";

  // me が未解決の場合は静的なメッセージ画面に切り替え（manager={me!} のクラッシュ防止）
  if (!me) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">1on1 管理</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            社員プロフィールが見つかりません。HR 管理者に連絡してください。
            <br />
            <span className="mt-2 inline-block text-xs">
              (currentEmployeeId: {currentEmployeeId})
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OneOnOneHeader
        meName={me.full_name}
        meId={me.id}
        onSchedule={() => { setScheduleForMemberId(null); setScheduleOpen(true); }}
      />

      {/* KPI（クリック可能） */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="完了した1on1"
          value={myTeamCompleted.length}
          unit="回"
          tone="primary"
          icon={CheckCircle2}
          onClick={onClickCompleted}
          hint="セッション履歴を見る"
        />
        <KpiTile
          label="平均気分"
          value={avgMood}
          unit="/ 5.0"
          tone="success"
          icon={Sparkles}
          onClick={onClickMood}
          hint="メンバー別トレンド"
        />
        <KpiTile
          label="2週間超え"
          value={staleMembers.length}
          unit="名"
          tone={staleMembers.length > 0 ? "warning" : "muted"}
          icon={Clock}
          onClick={onClickStale}
          hint="該当メンバーで絞り込み"
          disabled={staleMembers.length === 0}
        />
        <KpiTile
          label="期限超過アクション"
          value={overdueActions.length}
          unit="件"
          tone={overdueActions.length > 0 ? "danger" : "muted"}
          icon={AlertCircle}
          onClick={onClickOverdue}
          hint="該当アクションで絞り込み"
          disabled={overdueActions.length === 0}
        />
      </div>

      <div ref={tabsRef}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <TabsList>
            <TabsTrigger value="my-team" className="gap-2">
              <Users className="size-3.5" /> 私のメンバー（{myReports.length}）
            </TabsTrigger>
            <TabsTrigger value="my-1on1" className="gap-2">
              <MessageSquare className="size-3.5" /> 私の1on1
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <ListChecks className="size-3.5" /> アクション
              {overdueActions.length > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-700">
                  {overdueActions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-team">
            {memberFilter !== "all" && (
              <FilterChip
                label={FILTER_LABEL[memberFilter]}
                count={displayedMembers.length}
                total={myReports.length}
                onClear={() => setMemberFilter("all")}
              />
            )}
            {displayedMembers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  {memberFilter === "stale"
                    ? "🎉 すべてのメンバーが2週間以内に1on1を実施しています。"
                    : "あなたが直接マネジメントしているメンバーはまだいません。"}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {displayedMembers.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    manager={me!}
                    sessions={sessions}
                    actionItems={actionItems}
                    deptName={deptMap.get(m.department_id)?.name ?? "—"}
                    onClick={() => setSelectedMemberId(m.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-1on1">
            <MyOwnSessions
              sessions={myManagerSessions}
              actionItems={actionItems.filter((a) => a.member_id === currentEmployeeId)}
              empMap={empMap}
            />
          </TabsContent>

          <TabsContent value="actions">
            {actionFilter !== "all" && (
              <FilterChip
                label={FILTER_LABEL[actionFilter]}
                count={displayedActions.length}
                total={teamActions.length}
                onClear={() => setActionFilter("all")}
              />
            )}
            <AllActions
              actionItems={displayedActions}
              empMap={empMap}
              showOnlyOverdue={actionFilter === "overdue"}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* メンバー詳細 */}
      <Sheet open={!!selectedMemberId} onOpenChange={(o) => !o && setSelectedMemberId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selectedMember && (
            <MemberDetail
              member={selectedMember}
              manager={me!}
              sessions={sessions.filter(
                (s) => s.member_id === selectedMember.id && s.manager_id === currentEmployeeId
              )}
              actionItems={actionItems.filter((a) => a.member_id === selectedMember.id)}
              deptName={deptMap.get(selectedMember.department_id)?.name ?? "—"}
              onClose={() => setSelectedMemberId(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* スケジュールダイアログ */}
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaultMemberId={scheduleForMemberId}
        manager={me!}
        members={myReports}
      />

      {/* KPI 詳細シート（完了した1on1 / 平均気分） */}
      <Sheet open={detailKind !== null} onOpenChange={(o) => !o && setDetailKind(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {detailKind === "completed" && (
            <CompletedSessionsDetail
              sessions={myTeamCompleted}
              actionItems={actionItems}
              empMap={empMap}
              onClose={() => setDetailKind(null)}
              onPickMember={(memberId) => {
                setDetailKind(null);
                setSelectedMemberId(memberId);
              }}
            />
          )}
          {detailKind === "mood" && (
            <MoodTrendDetail
              members={myReports}
              sessions={myTeamCompleted}
              avg={avgMood}
              onClose={() => setDetailKind(null)}
              onPickMember={(memberId) => {
                setDetailKind(null);
                setSelectedMemberId(memberId);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── ヘッダ（プレゼンス付き） ─────────────
function OneOnOneHeader({
  meName, meId, onSchedule,
}: {
  meName: string;
  meId?: string;
  onSchedule: () => void;
}) {
  // 同じ 1on1 ハブを開いている他マネージャーを表示
  const others = usePresence("oneonone-hub", { user_id: meId, name: meName });

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
          1on1 マネージャー
          <PresenceAvatars users={others} label="閲覧中" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meName} さんのメンバーとの1on1を一括管理。
          気分トレンド・アクション追跡・スケジュール調整を1画面で。
        </p>
      </div>
      <Button onClick={onSchedule}>
        <CalendarPlus className="size-4" /> 1on1 をスケジュール
      </Button>
    </div>
  );
}

// ─── KPIタイル（ボタン化） ─────────────────
function KpiTile({
  label, value, unit, tone, icon: Icon, onClick, hint, disabled,
}: {
  label: string;
  value: number | string;
  unit: string;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  hint?: string;
  disabled?: boolean;
}) {
  const cls = {
    primary: "text-gc-700 bg-gc-50 border-gc-200",
    success: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warning: "text-amber-800 bg-amber-50 border-amber-200",
    danger: "text-red-800 bg-red-50 border-red-200",
    muted: "text-muted-foreground bg-muted/50 border-border",
  }[tone];

  const interactive = onClick && !disabled;

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all",
        interactive
          ? "hover:-translate-y-0.5 hover:border-gc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "cursor-default opacity-90",
      )}
      title={interactive ? hint : undefined}
    >
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          {interactive && (
            <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
          )}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {interactive && hint && (
          <div className="mt-1 truncate text-[10px] text-muted-foreground/80 group-hover:text-gc-700">
            {hint} →
          </div>
        )}
      </div>
    </button>
  );
}

// ─── フィルターチップ ───────────────────
function FilterChip({
  label, count, total, onClear,
}: {
  label: string;
  count: number;
  total: number;
  onClear: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gc-300 bg-gc-50 px-3 py-1 text-xs font-medium text-gc-800">
        絞り込み: {label}
        <span className="text-muted-foreground">({count} / {total})</span>
        <button
          onClick={onClear}
          className="ml-1 rounded-full p-0.5 hover:bg-gc-200"
          aria-label="絞り込みを解除"
        >
          <X className="size-3" />
        </button>
      </span>
    </div>
  );
}

// ─── メンバー1行 ──────────────────────────
function MemberRow({
  member, manager, sessions, actionItems, deptName, onClick,
}: {
  member: DemoEmployee;
  manager?: DemoEmployee;
  sessions: OneOnOneSession[];
  actionItems: ActionItem[];
  deptName: string;
  onClick: () => void;
}) {
  if (!member) return null;
  const memberSessions = sessions.filter(
    (s) => s.member_id === member.id && s.manager_id === (manager?.id ?? "")
  );
  const completed = memberSessions
    .filter((s) => s.completed_at)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const last = completed[0];
  const upcoming = memberSessions
    .filter((s) => !s.completed_at)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
  const moods = completed.slice(0, 5).reverse().map((s) => s.mood);
  const openActions = actionItems.filter((a) => a.member_id === member.id && !a.completed_at);

  const daysSinceLast = last?.completed_at
    ? Math.floor((Date.now() - new Date(last.completed_at).getTime()) / 86400000)
    : null;
  const stale = daysSinceLast === null || daysSinceLast > 14;
  const office = officeByCode(member.office_location);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
        stale && "border-amber-200"
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
        <Avatar className="size-11 shrink-0">
          <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{member.full_name}</span>
            {office && office.code !== "JP-TYO" && (
              <span className="text-xs">{office.countryEmoji}</span>
            )}
            {member.is_foreign_national && (
              <Badge variant="outline" className="text-[10px]">{member.nationality}</Badge>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {member.job_title} · {deptName}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">気分</span>
          <MoodSparkline moods={moods} />
        </div>

        <div className="text-right text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">前回</div>
          <div className={cn("font-medium", stale ? "text-amber-700" : "text-foreground")}>
            {last?.completed_at ? `${daysSinceLast}日前` : "未実施"}
          </div>
        </div>

        <div className="text-right text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">次回</div>
          <div className="font-medium">
            {upcoming ? formatDate(upcoming.scheduled_at).slice(5) : (
              <span className="text-amber-700">未設定</span>
            )}
          </div>
        </div>

        <div className="text-right text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">未対応</div>
          <div className={cn("font-medium", openActions.length > 0 && "text-orange-700")}>
            {openActions.length} 件
          </div>
        </div>

        {/* クイックアクション（カードクリックを止めるため stopPropagation） */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {upcoming?.meet_url && (
            <a
              href={upcoming.meet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50"
              title="Google Meet で参加"
            >
              <Video className="size-4" />
            </a>
          )}
          {member.slack_user_id && (
            <button
              onClick={() => {
                openSlackDm(member.slack_user_id!);
                toast.success(`${member.full_name} さんへのDMを開いています...`);
              }}
              className="rounded p-1.5 text-[#4A154B] hover:bg-[#4A154B]/10"
              title="Slack で DM"
            >
              <SlackIconSmall className="size-4" />
            </button>
          )}
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function MoodSparkline({ moods }: { moods: (OneOnOneMood | null)[] }) {
  if (moods.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1">
      {moods.map((m, i) => (
        <span
          key={i}
          className="inline-block size-4 rounded-full"
          style={{ background: m ? MOOD_COLOR[m] : "var(--muted)" }}
          title={m ? `${MOOD_EMOJI[m]} ${m}` : "—"}
        />
      ))}
    </div>
  );
}

// ─── メンバー詳細パネル ───────────────────
function MemberDetail({
  member, manager, sessions, actionItems, deptName, onClose,
}: {
  member: DemoEmployee;
  manager?: DemoEmployee;
  sessions: OneOnOneSession[];
  actionItems: ActionItem[];
  deptName: string;
  onClose: () => void;
}) {
  if (!member) return null;
  const [recordOpen, setRecordOpen] = useState(false);
  const completed = sessions
    .filter((s) => s.completed_at)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const upcoming = sessions
    .filter((s) => !s.completed_at)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];

  const moodValues = completed.map((s) => s.mood ? MOOD_RANK[s.mood] : 0).filter((v) => v > 0);
  const avgMood = moodValues.length
    ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1)
    : "—";

  const openActions = actionItems.filter((a) => !a.completed_at);
  const office = officeByCode(member.office_location);

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-bold">{member.full_name}</SheetTitle>
            {member.display_name_en && (
              <div className="text-xs text-muted-foreground">{member.display_name_en}</div>
            )}
            <div className="mt-0.5 truncate text-sm">{member.job_title} · {deptName}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {office && <span>{office.countryEmoji} {office.city}</span>}
              {member.is_foreign_national && <span>· 国籍 {member.nationality}</span>}
              {member.slack_user_id && <span>· Slack {member.slack_user_id}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
              <X className="size-4" />
            </Button>
            {manager && (
              <Button size="sm" variant="outline" onClick={() => setRecordOpen(true)} className="gap-1.5">
                <CheckCircle2 className="size-3.5" /> 1on1 を記録
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">完了</div>
            <div className="font-bold">{completed.length} 回</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">平均気分</div>
            <div className="font-bold">{avgMood} / 5.0</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">未対応</div>
            <div className={cn("font-bold", openActions.length > 0 && "text-orange-700")}>
              {openActions.length} 件
            </div>
          </div>
        </div>

        {upcoming && (
          <div className="mt-3 rounded-lg border bg-gc-50 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-gc-800">
                <CalendarPlus className="size-3.5" />
                <span className="font-medium">
                  次回予定: {formatDate(upcoming.scheduled_at)} {new Date(upcoming.scheduled_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} ({relativeTime(upcoming.scheduled_at)})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {upcoming.meet_url && (
                  <a
                    href={upcoming.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-100"
                  >
                    <Video className="size-3.5" /> Meetで参加
                  </a>
                )}
                <a
                  href={createGoogleCalendarEventUrl({
                    title: `1on1: ${member.full_name} × ${manager?.full_name ?? "マネージャー"}`,
                    description: upcoming.agenda || "1on1 ミーティング",
                    start: upcoming.scheduled_at,
                    end: new Date(new Date(upcoming.scheduled_at).getTime() + upcoming.duration_minutes * 60000),
                    attendees: [member.email, ...(manager?.email ? [manager.email] : [])],
                    location: upcoming.meet_url ?? undefined,
                    timezone: "Asia/Tokyo",
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900 transition-colors hover:bg-blue-100"
                >
                  <CalendarIcon className="size-3.5" /> カレンダー
                </a>
                {member.slack_user_id && (
                  <button
                    onClick={() => {
                      openSlackDm(member.slack_user_id!);
                      toast.success(`${member.full_name} さんへのDMを開いています...`);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[#4A154B]/30 bg-[#4A154B]/5 px-2.5 py-1 text-xs font-medium text-[#4A154B] transition-colors hover:bg-[#4A154B]/10"
                  >
                    <SlackIconSmall className="size-3.5" /> Slack
                  </button>
                )}
              </div>
            </div>
            {upcoming.agenda && (
              <div className="mt-2 text-xs text-muted-foreground">{upcoming.agenda}</div>
            )}
          </div>
        )}
      </div>

      {openActions.length > 0 && (
        <div className="p-5 pb-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            未完了のアクション ({openActions.length})
          </h3>
          <ul className="space-y-1.5">
            {openActions.map((a) => {
              const overdue = a.due_date && new Date(a.due_date) < new Date();
              return (
                <li key={a.id} className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-sm">
                  <input type="checkbox" className="size-4 rounded border" disabled />
                  <div className="flex-1">{a.title}</div>
                  {a.due_date && (
                    <span className={cn("text-xs whitespace-nowrap", overdue && "font-medium text-red-700")}>
                      期限 {a.due_date.slice(5)}
                    </span>
                  )}
                  {member.slack_user_id && (
                    <button
                      onClick={async () => {
                        const dueLabel = a.due_date
                          ? `（期限: ${a.due_date}${overdue ? "・期限超過" : ""}）`
                          : "";
                        const message = `お疲れさまです。前回の1on1で合意したアクション「${a.title}」${dueLabel} の進捗を教えてください 🙏`;
                        await sendSlackReminder(member.slack_user_id!, message);
                        toast.success("Slackを開きました。本文がクリップボードにコピー済みです。", {
                          description: "DM入力欄に Cmd+V で貼り付けて送信できます。",
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded border border-[#4A154B]/30 bg-[#4A154B]/5 px-1.5 py-1 text-xs font-medium text-[#4A154B] transition-colors hover:bg-[#4A154B]/10"
                      title="Slackで催促DMを送る"
                    >
                      <Send className="size-3" />
                      催促
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          1on1 タイムライン
        </h3>
        {completed.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            まだ1on1の記録がありません
          </div>
        ) : (
          <ol className="space-y-3">
            {completed.map((s) => {
              const sessionActions = actionItems.filter((a) => a.one_on_one_id === s.id);
              return (
                <li key={s.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{formatDate(s.completed_at!)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{s.duration_minutes}分</span>
                    {s.mood && (
                      <span className="ml-auto inline-flex items-center gap-1">
                        <span style={{ color: MOOD_COLOR[s.mood] }}>●</span>
                        <span className="text-muted-foreground">{MOOD_EMOJI[s.mood]}</span>
                      </span>
                    )}
                  </div>
                  {s.topics.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.topics.map((t) => (
                        <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                  {s.notes && (
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">{s.notes}</p>
                  )}
                  {sessionActions.length > 0 && (
                    <ul className="mt-2.5 space-y-1 border-t pt-2">
                      {sessionActions.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-xs">
                          {a.completed_at ? (
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                          ) : (
                            <span className="size-3.5 rounded-sm border" />
                          )}
                          <span className={cn(a.completed_at && "text-muted-foreground line-through")}>
                            {a.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {manager && (
        <RecordDialog
          open={recordOpen}
          onOpenChange={setRecordOpen}
          manager={manager}
          member={member}
        />
      )}
    </>
  );
}

// ─── 1on1 を記録するダイアログ ─────────────
function RecordDialog({
  open, onOpenChange, manager, member,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  manager: DemoEmployee;
  member: DemoEmployee;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(today);
  const [duration, setDuration] = useState<string>("30");
  const [mood, setMood] = useState<OneOnOneMood | "">("");
  const [topicsInput, setTopicsInput] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    setSaving(true);
    try {
      // scheduled_at と completed_at を同じ日付に設定（過去 1on1 の事後記録）
      const isoAt = new Date(`${date}T14:00:00+09:00`).toISOString();
      const topics = topicsInput
        .split(/[,\s、]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/oneonones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          manager_id: manager.id,
          member_id: member.id,
          scheduled_at: isoAt,
          completed_at: isoAt,
          duration_minutes: Number(duration),
          mood: mood || null,
          topics,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "記録に失敗しました");
        setSaving(false);
        return;
      }
      toast.success(`${member.full_name} さんとの 1on1 を記録しました`);
      onOpenChange(false);
      // ページをリロードして KPI を更新
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("通信エラーが発生しました");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>1on1 を記録</DialogTitle>
          <DialogDescription>
            {member.full_name} さんとの 1on1 の実施内容を記録します（事後記録）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm">
              <div className="text-xs font-medium text-muted-foreground">実施日</div>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm">
              <div className="text-xs font-medium text-muted-foreground">所要時間（分）</div>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 分</SelectItem>
                  <SelectItem value="30">30 分</SelectItem>
                  <SelectItem value="45">45 分</SelectItem>
                  <SelectItem value="60">60 分</SelectItem>
                  <SelectItem value="90">90 分</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-medium text-muted-foreground">気分</div>
            <Select value={mood} onValueChange={(v) => setMood(v as OneOnOneMood)}>
              <SelectTrigger><SelectValue placeholder="未選択" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="great">{MOOD_EMOJI.great} 非常に良い</SelectItem>
                <SelectItem value="good">{MOOD_EMOJI.good} 良い</SelectItem>
                <SelectItem value="ok">{MOOD_EMOJI.ok} 普通</SelectItem>
                <SelectItem value="down">{MOOD_EMOJI.down} やや低調</SelectItem>
                <SelectItem value="bad">{MOOD_EMOJI.bad} 低調</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-medium text-muted-foreground">トピック（カンマ区切り）</div>
            <Input
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="OKR進捗, キャリア相談, チーム課題"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-medium text-muted-foreground">メモ・要点</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="何が議論されたか、合意事項、次回までのフォロー等"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            キャンセル
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? "保存中..." : "記録する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── 完了セッション詳細 Sheet ─────────────
function CompletedSessionsDetail({
  sessions, actionItems, empMap, onClose, onPickMember,
}: {
  sessions: OneOnOneSession[];
  actionItems: ActionItem[];
  empMap: Map<string, DemoEmployee>;
  onClose: () => void;
  onPickMember: (id: string) => void;
}) {
  const sorted = [...sessions].sort(
    (a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")
  );

  return (
    <>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background/95 p-5 backdrop-blur">
        <div>
          <SheetTitle className="text-lg font-bold">完了した1on1の履歴</SheetTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            あなたのチームで完了した {sorted.length} 件のセッション。新しい順に表示。
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
          <X className="size-4" />
        </Button>
      </div>
      <ol className="space-y-2 p-5">
        {sorted.map((s) => {
          const member = empMap.get(s.member_id);
          const sActions = actionItems.filter((a) => a.one_on_one_id === s.id);
          return (
            <li key={s.id}>
              <button
                onClick={() => member && onPickMember(member.id)}
                className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-gc-300 hover:bg-accent/40"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="text-[10px]">
                    {member ? initials(member.full_name) : "—"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member?.full_name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.completed_at!)}
                    </span>
                    <span className="text-xs text-muted-foreground">· {s.duration_minutes}分</span>
                    {s.mood && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs">
                        <span style={{ color: MOOD_COLOR[s.mood] }}>●</span>
                        <span>{MOOD_EMOJI[s.mood]}</span>
                      </span>
                    )}
                  </div>
                  {s.topics.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.topics.map((t) => (
                        <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                  {s.notes && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{s.notes}</p>
                  )}
                  {sActions.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-muted-foreground">
                      アクション {sActions.length} 件（完了 {sActions.filter((a) => a.completed_at).length}件）
                    </div>
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

// ─── 平均気分トレンド Sheet ───────────────
function MoodTrendDetail({
  members, sessions, avg, onClose, onPickMember,
}: {
  members: DemoEmployee[];
  sessions: OneOnOneSession[];
  avg: string;
  onClose: () => void;
  onPickMember: (id: string) => void;
}) {
  const memberMoodData = members.map((m) => {
    const memberSessions = sessions
      .filter((s) => s.member_id === m.id)
      .sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""));
    const moods = memberSessions.map((s) => s.mood).filter(Boolean) as OneOnOneMood[];
    const ranks = moods.map((md) => MOOD_RANK[md]);
    const memberAvg = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
    return { member: m, moods, avg: memberAvg };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background/95 p-5 backdrop-blur">
        <div>
          <SheetTitle className="text-lg font-bold">気分トレンド</SheetTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            チーム平均 <span className="font-bold text-foreground">{avg}</span> / 5.0。
            メンバーごとの推移を確認できます。
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-3 p-5">
        {memberMoodData.map(({ member, moods, avg: mAvg }) => (
          <button
            key={member.id}
            onClick={() => onPickMember(member.id)}
            className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-gc-300 hover:bg-accent/40"
          >
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="text-[10px]">{initials(member.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{member.full_name}</span>
                <span className="text-xs text-muted-foreground">{member.job_title}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {moods.length === 0 ? (
                  <span className="text-xs text-muted-foreground">記録なし</span>
                ) : (
                  moods.slice(-8).map((m, i) => (
                    <span
                      key={i}
                      className="inline-block size-3.5 rounded-full"
                      style={{ background: MOOD_COLOR[m] }}
                      title={`${MOOD_EMOJI[m]} ${m}`}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">平均</div>
              <div className="text-lg font-bold">{mAvg ? mAvg.toFixed(1) : "—"}</div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </>
  );
}

// ─── 自分の1on1 タブ ──────────────────────
function MyOwnSessions({
  sessions, actionItems, empMap,
}: {
  sessions: OneOnOneSession[];
  actionItems: ActionItem[];
  empMap: Map<string, DemoEmployee>;
}) {
  const completed = sessions
    .filter((s) => s.completed_at)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const upcoming = sessions
    .filter((s) => !s.completed_at)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          あなたの上司との1on1記録はまだありません。
        </CardContent>
      </Card>
    );
  }

  const myManager = sessions[0] ? empMap.get(sessions[0].manager_id) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Avatar className="size-10">
            <AvatarFallback>{myManager ? initials(myManager.full_name) : "—"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm">あなたのマネージャー</div>
            <div className="font-semibold">{myManager?.full_name ?? "—"}</div>
          </div>
          {upcoming && (
            <div className="text-right text-xs">
              <div className="text-muted-foreground">次回</div>
              <div className="font-medium">{formatDate(upcoming.scheduled_at)}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">最近の1on1</h3>
      <ol className="space-y-3">
        {completed.map((s) => {
          const sessionActions = actionItems.filter((a) => a.one_on_one_id === s.id);
          return (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{formatDate(s.completed_at!)}</span>
                  <span className="text-muted-foreground">· {s.duration_minutes}分</span>
                  {s.mood && (
                    <span className="ml-auto">{MOOD_EMOJI[s.mood]}</span>
                  )}
                </div>
                {s.topics.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.topics.map((t) => (
                      <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
                {s.notes && <p className="mt-2 text-sm">{s.notes}</p>}
                {sessionActions.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
                    {sessionActions.map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        {a.completed_at ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <span className="size-3.5 rounded-sm border" />}
                        <span className={cn(a.completed_at && "text-muted-foreground line-through")}>{a.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.notes && (
                  <div className="mt-3">
                    <AiGeneratePanel
                      title="議事録要約"
                      endpoint="/api/ai/oneonone-summary"
                      hint="生メモをハイライト・アクション・気になる兆候の構造化議事録に整形します。"
                      buttonLabel="AI で議事録を整形"
                      payload={() => ({
                        managerName: "（マネージャー）",
                        memberName: "（メンバー）",
                        date: s.completed_at ?? new Date().toISOString(),
                        rawNotes: s.notes ?? "",
                        previousActions: sessionActions
                          .filter((a) => !a.completed_at)
                          .map((a) => a.title),
                      })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </ol>
    </div>
  );
}

// ─── スケジュールダイアログ ────────────
function nextBusinessSlot(): Date {
  // 翌平日の14:00 JST にスナップ。週末なら月曜
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  return d;
}

function ScheduleDialog({
  open, onOpenChange, defaultMemberId, manager, members,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMemberId: string | null;
  manager?: DemoEmployee;
  members: DemoEmployee[];
}) {
  const [memberId, setMemberId] = useState<string>(defaultMemberId ?? members[0]?.id ?? "");
  const [dateValue, setDateValue] = useState<string>(() => {
    const d = nextBusinessSlot();
    // YYYY-MM-DDTHH:mm 形式（datetime-local 入力用、ローカルTZ）
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [duration, setDuration] = useState<string>("30");
  const [agenda, setAgenda] = useState<string>("Q2 OKR 進捗確認 / 直近のチャレンジ / キャリア相談");

  const member = members.find((m) => m.id === memberId);
  const start = new Date(dateValue);
  const end = new Date(start.getTime() + Number(duration) * 60000);
  const meetUrl = fakeGoogleMeetUrl(`new-${memberId}-${dateValue}`);

  const calendarUrl = member && memberId
    ? createGoogleCalendarEventUrl({
        title: `1on1: ${member.full_name} × ${manager?.full_name ?? "マネージャー"}`,
        description: `${agenda}\n\nGoogle Meet: ${meetUrl}\n（このリンクは Green Carbon HR Tools が生成）`,
        start, end,
        attendees: [member.email, ...(manager?.email ? [manager.email] : [])],
        location: meetUrl,
        timezone: "Asia/Tokyo",
      })
    : "#";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>1on1 をスケジュール</DialogTitle>
          <DialogDescription>
            Google Calendar にイベントを作成します。Slack の事前リマインドも送れます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">メンバー</label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="メンバーを選択" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name} — {m.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">日時（JST）</label>
              <Input
                type="datetime-local"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">所要時間</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 分</SelectItem>
                  <SelectItem value="30">30 分</SelectItem>
                  <SelectItem value="45">45 分</SelectItem>
                  <SelectItem value="60">60 分</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">アジェンダ</label>
            <Input value={agenda} onChange={(e) => setAgenda(e.target.value)} />
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <div className="font-medium">招待プレビュー</div>
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              <div>件名: 1on1: {member?.full_name ?? "—"} × {manager?.full_name ?? "—"}</div>
              <div>参加者: {member?.email ?? "—"}, {manager?.email ?? "—"}</div>
              <div className="truncate">Google Meet: {meetUrl}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {member?.slack_user_id && (
            <Button
              variant="outline"
              onClick={async () => {
                const message = `${member.full_name} さん、1on1 を ${formatDate(start)} ${start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} (${duration}分) にお願いします。\nアジェンダ: ${agenda}\nMeet: ${meetUrl}`;
                await sendSlackReminder(member.slack_user_id!, message);
                toast.success("Slackを開きました。本文をクリップボードからDM入力欄に貼り付けてください。");
              }}
              className="gap-1.5"
            >
              <SlackIconSmall className="size-3.5 text-[#4A154B]" />
              Slackで先に共有
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={async () => {
              toast.success("Google Calendar を新しいタブで開きました", {
                description: "プリフィル済みのイベント作成画面を確認して保存してください。",
              });
              // DB にも 1on1 セッション（未完了）として保存
              if (member && manager) {
                try {
                  await fetch("/api/oneonones", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      manager_id: manager.id,
                      member_id: member.id,
                      scheduled_at: start.toISOString(),
                      duration_minutes: Number(duration),
                      agenda,
                      meet_url: meetUrl,
                    }),
                  });
                } catch (e) {
                  console.error("Failed to save 1on1 to DB:", e);
                }
              }
              setTimeout(() => onOpenChange(false), 200);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <CalendarIcon className="size-4" />
            Google Calendar で作成
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── アクションタブ ───────────────────────
function AllActions({
  actionItems, empMap, showOnlyOverdue,
}: {
  actionItems: ActionItem[];
  empMap: Map<string, DemoEmployee>;
  showOnlyOverdue?: boolean;
}) {
  const open = actionItems.filter((a) => !a.completed_at);
  const done = actionItems.filter((a) => a.completed_at);

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {showOnlyOverdue ? `期限超過 (${open.length})` : `未完了 (${open.length})`}
        </h3>
        {open.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {showOnlyOverdue ? "🎉 期限超過のアクションはありません" : "未完了のアクションはありません"}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {open.map((a) => {
              const member = empMap.get(a.member_id);
              const overdue = a.due_date && new Date(a.due_date) < new Date();
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-md border bg-card p-3">
                  <input type="checkbox" className="size-4 rounded border" />
                  <Avatar className="size-7"><AvatarFallback className="text-[10px]">{member ? initials(member.full_name) : "—"}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{member?.full_name ?? "—"}</div>
                  </div>
                  {a.due_date && (
                    <span className={cn("text-xs", overdue ? "font-medium text-red-700" : "text-muted-foreground")}>
                      期限 {a.due_date.slice(5)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!showOnlyOverdue && done.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            完了済み ({done.length})
          </h3>
          <ul className="space-y-1.5">
            {done.slice(0, 8).map((a) => {
              const member = empMap.get(a.member_id);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-md border bg-card/50 p-3 opacity-70">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <Avatar className="size-7"><AvatarFallback className="text-[10px]">{member ? initials(member.full_name) : "—"}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm line-through">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{member?.full_name ?? "—"}</div>
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
