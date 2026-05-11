"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LifeBuoy, Inbox, Plus, Send, ChevronRight, X, Clock, AlertTriangle, MessageSquare,
  BookOpen, Search, Filter, ThumbsUp, Lock, ExternalLink, User as UserIcon,
} from "lucide-react";
import {
  type Ticket, type TicketCategory, type TicketStatus, type TicketPriority,
  type Faq, CATEGORY_LABEL, CATEGORY_TONE, STATUS_LABEL, STATUS_TONE, PRIORITY_LABEL,
  PRIORITY_TONE, SLA_HOURS, ticketsByStatus, ticketsForRequester, slaState,
  ticketsByCategory, avgResolutionHours,
} from "@/lib/demo/helpdesk";
import { type DemoEmployee } from "@/lib/demo/employees";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { initials, relativeTime, cn } from "@/lib/utils";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

export function HelpdeskClient({
  tickets, faqs, employees, currentEmployeeId,
}: {
  tickets: Ticket[];
  faqs: Faq[];
  employees: DemoEmployee[];
  currentEmployeeId: string;
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const [tab, setTab] = useState<"queue" | "mine" | "faq" | "analytics">("queue");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<Faq | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // KPI
  const open = tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting");
  const breached = tickets.filter((t) => slaState(t).breached);
  const myTickets = ticketsForRequester(currentEmployeeId);
  const avgResolution = avgResolutionHours();

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LifeBuoy className="size-6 text-gc-700" />
            HRヘルプデスク
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            社員の問い合わせをチケット管理。SLA・FAQ・Slack 連携。
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="size-4" />
          チケット起票
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={Inbox} label="未対応・対応中" value={open.length} unit="件" tone="primary" hint="HR キューを開く" onClick={() => setTab("queue")} />
        <KpiTile icon={AlertTriangle} label="SLA 違反" value={breached.length} unit="件" tone={breached.length > 0 ? "danger" : "muted"} hint="即時対応必要" onClick={() => setTab("queue")} disabled={breached.length === 0} />
        <KpiTile icon={Clock} label="平均解決時間" value={avgResolution} unit="時間" tone="success" hint="過去30日" onClick={() => setTab("analytics")} />
        <KpiTile icon={UserIcon} label="自分のチケット" value={myTickets.length} unit="件" tone="muted" hint="自分が起票" onClick={() => setTab("mine")} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            <Inbox className="size-3.5" />
            キュー ({open.length})
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-2">
            <UserIcon className="size-3.5" />
            マイチケット
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <BookOpen className="size-3.5" />
            FAQ ({faqs.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <Filter className="size-3.5" />
            分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <QueueView tickets={tickets} empMap={empMap} onSelect={setSelectedTicket} />
        </TabsContent>

        <TabsContent value="mine">
          <MyTicketsView tickets={myTickets} empMap={empMap} onSelect={setSelectedTicket} />
        </TabsContent>

        <TabsContent value="faq">
          <FaqView faqs={faqs} onSelect={setSelectedFaq} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsView tickets={tickets} />
        </TabsContent>
      </Tabs>

      {/* チケット詳細 */}
      <Sheet open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selectedTicket && (
            <TicketDetail
              ticket={selectedTicket}
              empMap={empMap}
              faqs={faqs}
              onClose={() => setSelectedTicket(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* FAQ 詳細 */}
      <Sheet open={!!selectedFaq} onOpenChange={(o) => !o && setSelectedFaq(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl" showClose={false}>
          {selectedFaq && (
            <FaqDetail faq={selectedFaq} onClose={() => setSelectedFaq(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* 起票ダイアログ */}
      <CreateTicketDialog open={showCreate} onOpenChange={setShowCreate} />
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

// ─── HRキュー ──────────────────────────
function QueueView({
  tickets, empMap, onSelect,
}: {
  tickets: Ticket[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (t: Ticket) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (t.status === "closed") return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (query && !`${t.subject} ${t.body}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority] || a.created_at.localeCompare(b.created_at);
    });
  }, [tickets, statusFilter, categoryFilter, query]);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="件名・本文で検索..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              <SelectItem value="open">未対応</SelectItem>
              <SelectItem value="in_progress">対応中</SelectItem>
              <SelectItem value="waiting">回答待ち</SelectItem>
              <SelectItem value="resolved">解決</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TicketCategory | "all")}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全カテゴリ</SelectItem>
              {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              🎉 未対応のチケットはありません
            </CardContent>
          </Card>
        ) : (
          filtered.map((t) => <TicketRow key={t.id} ticket={t} empMap={empMap} onClick={() => onSelect(t)} />)
        )}
      </div>
    </div>
  );
}

function TicketRow({
  ticket, empMap, onClick,
}: {
  ticket: Ticket;
  empMap: Map<string, DemoEmployee>;
  onClick: () => void;
}) {
  const requester = empMap.get(ticket.requester_id);
  const assignee = ticket.assignee_id ? empMap.get(ticket.assignee_id) : null;
  const sla = slaState(ticket);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
        sla.breached && ticket.status !== "resolved" && ticket.status !== "closed" && "border-red-200",
        ticket.priority === "urgent" && "border-l-4 border-l-red-500",
      )}
    >
      <CardContent className="flex flex-wrap items-start gap-3 p-3 sm:flex-nowrap">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback>{requester ? initials(requester.full_name) : "—"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">#{ticket.number}</span>
            <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", STATUS_TONE[ticket.status])}>
              {STATUS_LABEL[ticket.status]}
            </span>
            <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", CATEGORY_TONE[ticket.category])}>
              {CATEGORY_LABEL[ticket.category]}
            </span>
            <span className={cn("text-[10px]", PRIORITY_TONE[ticket.priority])}>
              {PRIORITY_LABEL[ticket.priority]}
            </span>
            {ticket.channel === "slack" && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-[#4A154B]/30 bg-[#4A154B]/5 px-1.5 py-0.5 text-[9px] text-[#4A154B]">
                <SlackIconSmall className="size-2.5" /> Slack
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate font-medium">{ticket.subject}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{requester?.full_name ?? "—"}</span>
            <span>·</span>
            <span>{relativeTime(ticket.created_at)}</span>
            {ticket.comments.length > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <MessageSquare className="size-2.5" />
                  {ticket.comments.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* SLA */}
        <div className="text-right text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SLA</div>
          <div className={cn(
            "font-bold tabular-nums",
            sla.breached ? "text-red-700" : sla.hoursLeft < 4 ? "text-amber-700" : "text-foreground",
          )}>
            {sla.breached
              ? `${Math.abs(sla.hoursLeft)}h 超過`
              : ticket.status === "resolved" || ticket.status === "closed"
              ? "—"
              : `あと ${sla.hoursLeft}h`}
          </div>
        </div>

        {assignee && (
          <Avatar className="size-7 shrink-0" title={`担当: ${assignee.full_name}`}>
            <AvatarFallback className="text-[10px]">{initials(assignee.full_name)}</AvatarFallback>
          </Avatar>
        )}

        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

// ─── マイチケット ──────────────────────
function MyTicketsView({
  tickets, empMap, onSelect,
}: {
  tickets: Ticket[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (t: Ticket) => void;
}) {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          自分が起票したチケットはありません
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {tickets.map((t) => <TicketRow key={t.id} ticket={t} empMap={empMap} onClick={() => onSelect(t)} />)}
    </div>
  );
}

// ─── FAQ ビュー ────────────────────────
function FaqView({
  faqs, onSelect,
}: {
  faqs: Faq[];
  onSelect: (f: Faq) => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");

  const filtered = faqs.filter((f) => {
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    if (query && !`${f.question} ${f.answer}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="質問を検索..." className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TicketCategory | "all")}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全カテゴリ</SelectItem>
              {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-2 lg:grid-cols-2">
        {filtered.map((f) => (
          <Card
            key={f.id}
            onClick={() => onSelect(f)}
            className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gc-50 text-gc-700">
                  <BookOpen className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", CATEGORY_TONE[f.category])}>
                      {CATEGORY_LABEL[f.category]}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold">{f.question}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{f.answer}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{f.views} 表示</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <ThumbsUp className="size-2.5" />
                      {f.helpful_count}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── 分析タブ ─────────────────────────
function AnalyticsView({ tickets }: { tickets: Ticket[] }) {
  const byCategory = ticketsByCategory();
  const total = tickets.length;
  const sortedCat = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  // ステータス分布
  const byStatus = ticketsByStatus();
  const statusOrder: TicketStatus[] = ["open", "in_progress", "waiting", "resolved", "closed"];

  // 優先度別
  const byPriority = new Map<TicketPriority, number>();
  for (const t of tickets) byPriority.set(t.priority, (byPriority.get(t.priority) ?? 0) + 1);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">カテゴリ別 件数</h3>
          <ul className="space-y-2">
            {sortedCat.map(([cat, count]) => {
              const pct = (count / total) * 100;
              return (
                <li key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", CATEGORY_TONE[cat])}>
                      {CATEGORY_LABEL[cat]}
                    </span>
                    <span className="font-bold tabular-nums">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-gc-400 to-gc-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">ステータス分布</h3>
          <ul className="space-y-2">
            {statusOrder.map((s) => {
              const count = byStatus.get(s)?.length ?? 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <li key={s} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_TONE[s])}>
                      {STATUS_LABEL[s]}
                    </span>
                    <span className="font-bold tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${pct}%` }} />
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

// ─── チケット詳細 ─────────────────────
function TicketDetail({
  ticket, empMap, faqs, onClose,
}: {
  ticket: Ticket;
  empMap: Map<string, DemoEmployee>;
  faqs: Faq[];
  onClose: () => void;
}) {
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const requester = empMap.get(ticket.requester_id);
  const assignee = ticket.assignee_id ? empMap.get(ticket.assignee_id) : null;
  const sla = slaState(ticket);
  const relatedFaqs = ticket.related_faq_ids
    ? faqs.filter((f) => ticket.related_faq_ids?.includes(f.id))
    : [];

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{ticket.number}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_TONE[ticket.status])}>
                {STATUS_LABEL[ticket.status]}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", CATEGORY_TONE[ticket.category])}>
                {CATEGORY_LABEL[ticket.category]}
              </span>
              <span className={cn("text-[10px]", PRIORITY_TONE[ticket.priority])}>
                優先度: {PRIORITY_LABEL[ticket.priority]}
              </span>
            </div>
            <SheetTitle className="mt-2 text-lg font-bold">{ticket.subject}</SheetTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SLA</div>
            <div className={cn(
              "mt-0.5 text-base font-bold tabular-nums",
              sla.breached ? "text-red-700" : sla.hoursLeft < 4 ? "text-amber-700" : "text-foreground",
            )}>
              {sla.breached
                ? `${Math.abs(sla.hoursLeft)}h 超過`
                : ticket.status === "resolved" || ticket.status === "closed"
                ? "—"
                : `${sla.hoursLeft}h`}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">起票者</div>
            <div className="mt-0.5 truncate text-xs font-medium">{requester?.full_name ?? "—"}</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">担当</div>
            <div className="mt-0.5 truncate text-xs font-medium">{assignee?.full_name ?? "未割当"}</div>
          </div>
        </div>

        {/* ステータス変更 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["open", "in_progress", "waiting", "resolved", "closed"] as TicketStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => toast.success(`ステータスを ${STATUS_LABEL[s]} に変更しました`)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                ticket.status === s ? STATUS_TONE[s] + " ring-2 ring-offset-1" : "hover:bg-accent",
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* スレッド */}
      <div className="space-y-3 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          会話スレッド
        </h3>

        {/* 起票内容 */}
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-start gap-2">
            <Avatar className="size-7"><AvatarFallback className="text-[10px]">{requester ? initials(requester.full_name) : "—"}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{requester?.full_name ?? "—"}</span>
                <span className="text-[10px] text-muted-foreground">{relativeTime(ticket.created_at)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">{ticket.body}</p>
            </div>
          </div>
        </div>

        {/* コメント */}
        {ticket.comments.map((c) => {
          const author = empMap.get(c.author_id);
          return (
            <div key={c.id} className={cn(
              "rounded-lg border p-3",
              c.is_internal ? "border-amber-200 bg-amber-50/40" : "bg-card",
            )}>
              <div className="flex items-start gap-2">
                <Avatar className="size-7"><AvatarFallback className="text-[10px]">{author ? initials(author.full_name) : "—"}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{author?.full_name ?? "—"}</span>
                    {c.is_internal && (
                      <Badge variant="warning" className="text-[10px]"><Lock className="mr-0.5 size-2.5" />社内メモ</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{relativeTime(c.created_at)}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* 返信フォーム */}
        {ticket.status !== "closed" && (
          <div className="rounded-lg border-2 border-dashed bg-card p-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="返信を入力..."
              className="w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-2 flex items-center justify-between">
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                社内メモ（申請者には非公開）
              </label>
              <Button
                size="sm"
                onClick={() => {
                  if (!reply) return;
                  toast.success(internal ? "社内メモを追加しました" : "返信を送信しました");
                  setReply(""); setInternal(false);
                }}
                className="gap-1.5"
              >
                <Send className="size-3.5" />
                送信
              </Button>
            </div>
          </div>
        )}

        {/* 関連 FAQ */}
        {relatedFaqs.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              関連 FAQ
            </h3>
            <ul className="space-y-1.5">
              {relatedFaqs.map((f) => (
                <li key={f.id}>
                  <div className="flex items-start gap-2 rounded-md border bg-card p-2 text-sm">
                    <BookOpen className="size-3.5 shrink-0 text-gc-700 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">{f.question}</div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{f.answer}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Slack 連携 */}
        {ticket.channel === "slack" && (
          <div className="rounded-md border border-[#4A154B]/30 bg-[#4A154B]/5 p-3 text-xs">
            <div className="flex items-center gap-2">
              <SlackIconSmall className="size-4 text-[#4A154B]" />
              <span className="font-medium text-[#4A154B]">Slack 由来のチケット</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              元の Slack スレッドに返信を同期できます。
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 gap-1.5"
              onClick={() => toast.success("Slack スレッドを開きました（デモ）")}
            >
              <ExternalLink className="size-3.5" />
              Slack で開く
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function FaqDetail({ faq, onClose }: { faq: Faq; onClose: () => void }) {
  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", CATEGORY_TONE[faq.category])}>
              {CATEGORY_LABEL[faq.category]}
            </span>
            <SheetTitle className="mt-2 text-lg font-bold">{faq.question}</SheetTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{faq.answer}</p>
        {faq.related_link && (
          <Button variant="outline" size="sm" asChild>
            <a href={faq.related_link} className="gap-1.5">
              <ExternalLink className="size-3.5" />
              関連ページへ
            </a>
          </Button>
        )}
        <div className="flex items-center gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span>{faq.views} 表示</span>
          <span>·</span>
          <span>最終更新 {faq.last_updated_at}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("「役に立った」を記録しました")}
            className="gap-1.5"
          >
            <ThumbsUp className="size-3.5" />
            役に立った ({faq.helpful_count})
          </Button>
        </div>
      </div>
    </>
  );
}

function CreateTicketDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<TicketCategory>("policy");
  const [priority, setPriority] = useState<TicketPriority>("medium");

  const submit = () => {
    if (!subject || !body) {
      toast.error("件名と本文を入力してください");
      return;
    }
    toast.success("チケットを起票しました", {
      description: `SLA ${SLA_HOURS[priority]} 時間以内に対応します。Slack でも進捗をお知らせします。`,
    });
    setSubject(""); setBody(""); setCategory("policy"); setPriority("medium");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>HR にチケット起票</DialogTitle>
          <DialogDescription>
            問い合わせ内容を入力してください。SLA に基づき優先度順に対応します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">カテゴリ</label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">優先度</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}（SLA {SLA_HOURS[p]}h）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">件名</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例: 賞与支給日について" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">詳細</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="質問の詳細を記入してください"
              className="w-full rounded-md border bg-transparent p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={submit} className="gap-1.5">
            <Send className="size-4" />
            起票
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
