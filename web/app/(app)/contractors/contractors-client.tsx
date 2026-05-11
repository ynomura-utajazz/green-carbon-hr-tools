"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Handshake, Users2, Building2, Globe2, AlertTriangle, Coins, Search, Download,
  ChevronRight, X, Mail, Send, FileText, Shield, CheckCircle2, AlertCircle,
  MapPin, CalendarPlus, Filter, ClipboardList, FileType2, Star, GanttChartSquare,
  ArrowUpRight, Wallet, Plus, Clock, Inbox, Receipt, ThumbsUp, ThumbsDown,
  ExternalLink, Link as LinkIcon, MessageSquare, TrendingUp, TrendingDown,
  ArrowLeftRight, Banknote, Info,
} from "lucide-react";
import {
  type PaymentMethod, type WithholdingPolicy, FX_RATES, TRANSFER_METHODS, COUNTRY_WITHHOLDING,
  computePaymentBreakdown, recommendedTransferMethod, recommendedWithholding,
  withholdingPolicyLabel, fmtFx,
} from "@/lib/fx";
import {
  type DemoContractor, type ContractStatus, type ContractorPayment, type ContractorDocument,
  type ContractorEvaluation, type WorkRecord, type InvoiceSubmission, CONTRACTOR_STATUS_LABEL,
  PAYMENT_MODEL_LABEL, DOC_KIND_LABEL, STATUS_LABEL, STATUS_CLS, paymentsFor,
  documentsFor, evaluationsFor, workRecordsFor, invoiceSubmissionsFor, allPendingSubmissions,
  pendingSubmissionsCount,
} from "@/lib/demo/contractors";
import { type DemoEmployee } from "@/lib/demo/employees";
import { sendSlackReminder } from "@/lib/slack";
import { createGoogleCalendarEventUrl } from "@/lib/google-calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { initials, formatDate, cn } from "@/lib/utils";

type RegionFilter = "all" | "JP" | "overseas";
type TypeFilter = "all" | "individual" | "corporate";
type StatusFilter = "all" | ContractStatus;
type DetailKind = null | "expiring" | "no_nda" | "no_invoice";

function SlackIconSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

const STATUS_COLOR: Record<ContractStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  expiring_soon: "border-amber-200 bg-amber-50 text-amber-800",
  ended: "border-gray-200 bg-gray-50 text-gray-700",
  negotiating: "border-blue-200 bg-blue-50 text-blue-800",
};

const fmtCurrency = (amount: number, currency: string) => {
  if (currency === "JPY") return `¥${amount.toLocaleString()}`;
  const sym = { USD: "$", EUR: "€", SGD: "S$", GBP: "£" }[currency] ?? `${currency} `;
  return `${sym}${amount.toLocaleString()}`;
};

const daysUntil = (dateStr: string) =>
  Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);

export function ContractorsClient({
  contractors, employees,
}: {
  contractors: DemoContractor[];
  employees: DemoEmployee[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [typeF, setTypeF] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<"list" | "expiring" | "queue" | "timeline" | "ended" | "analytics">("list");
  const [detail, setDetail] = useState<DetailKind>(null);
  const [selected, setSelected] = useState<DemoContractor | null>(null);

  // KPI
  const active = contractors.filter((c) => c.status === "active");
  const expiringSoon = contractors.filter(
    (c) => c.status !== "ended" && daysUntil(c.contract_end) <= 90 && daysUntil(c.contract_end) > 0,
  );
  const totalMonthly = contractors
    .filter((c) => c.status === "active" || c.status === "expiring_soon")
    .reduce((sum, c) => sum + c.monthly_estimate_jpy, 0);
  const overseas = contractors.filter((c) => c.country_code !== "JP" && c.status !== "ended");
  const noNda = contractors.filter((c) => !c.nda_signed_at && c.status !== "ended");
  const noInvoice = contractors.filter(
    (c) => c.country_code === "JP" && c.type === "individual" && !c.has_invoice_number && c.status !== "ended",
  );

  // フィルタ後リスト
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contractors.filter((c) => {
      if (region === "JP" && c.country_code !== "JP") return false;
      if (region === "overseas" && c.country_code === "JP") return false;
      if (typeF !== "all" && c.type !== typeF) return false;
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return [c.display_name, c.legal_name ?? "", c.role, c.department, c.country_name]
        .join(" ").toLowerCase().includes(q);
    });
  }, [contractors, query, region, typeF, status]);

  const onClickKpiActive = () => { setTab("list"); setStatus("all"); setRegion("all"); setTypeF("all"); };
  const onClickKpiExpiring = () => { setTab("expiring"); };
  const onClickKpiTotal = () => { setTab("analytics"); };
  const onClickKpiOverseas = () => { setTab("list"); setRegion("overseas"); };
  const onClickKpiQueue = () => { setTab("queue"); };

  const pending = pendingSubmissionsCount();
  const totalPending = pending.workRecords + pending.invoices;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Handshake className="size-6 text-gc-700" />
            業務委託管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            国内 {contractors.filter((c) => c.country_code === "JP").length} 社／海外 {contractors.filter((c) => c.country_code !== "JP").length} 社の委託パートナーを一元管理
          </p>
        </div>
        <Button>
          <Handshake className="size-4" /> 新規委託先を登録
        </Button>
      </div>

      {/* KPI（クリック可能） */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile icon={Users2} label="稼働中委託先" value={active.length} unit="社" tone="primary" hint="全アクティブを表示" onClick={onClickKpiActive} />
        <KpiTile icon={Inbox} label="承認待ち提出" value={totalPending} unit="件" tone={totalPending > 0 ? "danger" : "muted"} hint={`稼働${pending.workRecords}件 / 請求書${pending.invoices}件`} onClick={onClickKpiQueue} disabled={totalPending === 0} />
        <KpiTile icon={AlertTriangle} label="90日以内に期限" value={expiringSoon.length} unit="件" tone={expiringSoon.length > 0 ? "warning" : "muted"} hint="更新判断が必要" onClick={onClickKpiExpiring} disabled={expiringSoon.length === 0} />
        <KpiTile icon={Coins} label="月間支払見込" value={`¥${(totalMonthly / 10000).toFixed(0)}万`} unit="" tone="primary" hint="支払分析を見る" onClick={onClickKpiTotal} />
        <KpiTile icon={Globe2} label="海外パートナー" value={overseas.length} unit="社" tone="success" hint="海外のみで絞込" onClick={onClickKpiOverseas} disabled={overseas.length === 0} />
      </div>

      {/* 警告バナー */}
      {(noNda.length > 0 || noInvoice.length > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {noNda.length > 0 && (
            <button
              onClick={() => setDetail("no_nda")}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-900 transition-colors hover:bg-red-100"
            >
              <Shield className="size-4 shrink-0" />
              <span className="flex-1">
                NDA未締結が <strong>{noNda.length}</strong> 件あります
              </span>
              <ChevronRight className="size-4 shrink-0 opacity-50" />
            </button>
          )}
          {noInvoice.length > 0 && (
            <button
              onClick={() => setDetail("no_invoice")}
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100"
            >
              <FileText className="size-4 shrink-0" />
              <span className="flex-1">
                インボイス未登録の国内個人事業主が <strong>{noInvoice.length}</strong> 件あります
              </span>
              <ChevronRight className="size-4 shrink-0 opacity-50" />
            </button>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <Users2 className="size-3.5" /> 一覧 ({filtered.length})
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-2">
            <Inbox className="size-3.5" /> 承認キュー
            {totalPending > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-700">
                {totalPending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring" className="gap-2">
            <AlertTriangle className="size-3.5" /> 期限間近
            {expiringSoon.length > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">
                {expiringSoon.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <GanttChartSquare className="size-3.5" /> タイムライン
          </TabsTrigger>
          <TabsTrigger value="ended" className="gap-2">
            終了済み
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <Coins className="size-3.5" /> 分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <FilterBar
            query={query} setQuery={setQuery}
            region={region} setRegion={setRegion}
            typeF={typeF} setTypeF={setTypeF}
            status={status} setStatus={setStatus}
            onExport={() => exportCsv(filtered)}
          />
          <ContractorsList items={filtered} empMap={empMap} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="expiring">
          <ContractorsList items={expiringSoon.sort((a, b) => daysUntil(a.contract_end) - daysUntil(b.contract_end))} empMap={empMap} onSelect={setSelected} highlightExpiry />
        </TabsContent>
        <TabsContent value="queue">
          <ApprovalQueue contractors={contractors} onPickContractor={setSelected} />
        </TabsContent>
        <TabsContent value="timeline">
          <ContractTimeline contractors={contractors.filter((c) => c.status !== "ended")} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="ended">
          <ContractorsList items={contractors.filter((c) => c.status === "ended")} empMap={empMap} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="analytics">
          <Analytics contractors={contractors} />
        </TabsContent>
      </Tabs>

      {/* 詳細サイドパネル */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selected && (
            <ContractorDetail
              c={selected}
              owner={empMap.get(selected.ownerEmployeeId)}
              onClose={() => setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 警告 Sheet */}
      <Sheet open={detail === "no_nda"} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" showClose={false}>
          <ConcernList title="NDA 未締結の委託先" subtitle="機密保持契約が未締結です。即座に対応してください。" items={noNda} empMap={empMap} onClose={() => setDetail(null)} onPick={(c) => { setDetail(null); setSelected(c); }} variant="danger" />
        </SheetContent>
      </Sheet>
      <Sheet open={detail === "no_invoice"} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" showClose={false}>
          <ConcernList title="インボイス番号 未登録" subtitle="経過措置中ですが、税務上の影響があるため登録を推奨。" items={noInvoice} empMap={empMap} onClose={() => setDetail(null)} onPick={(c) => { setDetail(null); setSelected(c); }} variant="warning" />
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
      className="group flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gc-300 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:shadow-sm"
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
        {!disabled && (
          <div className="mt-1 truncate text-[10px] text-muted-foreground/80 group-hover:text-gc-700">
            {hint} →
          </div>
        )}
      </div>
    </button>
  );
}

// ─── フィルタバー ───────────────────────
function FilterBar({
  query, setQuery, region, setRegion, typeF, setTypeF, status, setStatus, onExport,
}: {
  query: string; setQuery: (v: string) => void;
  region: RegionFilter; setRegion: (v: RegionFilter) => void;
  typeF: TypeFilter; setTypeF: (v: TypeFilter) => void;
  status: StatusFilter; setStatus: (v: StatusFilter) => void;
  onExport: () => void;
}) {
  return (
    <Card className="mb-3">
      <CardContent className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・役割・部署・国で検索..." className="pl-9" />
        </div>
        <Select value={region} onValueChange={(v) => setRegion(v as RegionFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">国: すべて</SelectItem>
            <SelectItem value="JP">🇯🇵 国内</SelectItem>
            <SelectItem value="overseas">🌐 海外</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeF} onValueChange={(v) => setTypeF(v as TypeFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">種別: 全て</SelectItem>
            <SelectItem value="individual">個人</SelectItem>
            <SelectItem value="corporate">法人</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">状態: 全て</SelectItem>
            <SelectItem value="active">稼働中</SelectItem>
            <SelectItem value="expiring_soon">期限間近</SelectItem>
            <SelectItem value="negotiating">交渉中</SelectItem>
            <SelectItem value="ended">終了</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="size-4" /> CSV
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── リスト ─────────────────────────────
function ContractorsList({
  items, empMap, onSelect, highlightExpiry,
}: {
  items: DemoContractor[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (c: DemoContractor) => void;
  highlightExpiry?: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          該当する委託先がありません
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((c) => (
        <ContractorRow key={c.id} c={c} owner={empMap.get(c.ownerEmployeeId)} onClick={() => onSelect(c)} highlightExpiry={highlightExpiry} />
      ))}
    </div>
  );
}

function ContractorRow({
  c, owner, onClick, highlightExpiry,
}: {
  c: DemoContractor;
  owner: DemoEmployee | undefined;
  onClick: () => void;
  highlightExpiry?: boolean;
}) {
  const days = daysUntil(c.contract_end);
  const urgent = days <= 30 && c.status !== "ended";
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
        highlightExpiry && urgent && "border-amber-200",
      )}
    >
      <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
          {c.type === "corporate" ? <Building2 className="size-5 text-muted-foreground" /> : <Avatar className="size-10"><AvatarFallback>{initials(c.display_name)}</AvatarFallback></Avatar>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{c.display_name}</span>
            <span className="text-sm">{c.country_emoji}</span>
            <Badge variant="outline" className="text-[10px]">
              {c.type === "individual" ? "個人" : "法人"}
            </Badge>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_COLOR[c.status])}>
              {CONTRACTOR_STATUS_LABEL[c.status]}
            </span>
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {c.role} · {c.department}{owner && ` · 担当: ${owner.full_name}`}
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">報酬</div>
          <div className="font-medium tabular-nums">
            {fmtCurrency(c.rate_amount, c.currency)}
            <span className="ml-1 text-[10px] text-muted-foreground">/{PAYMENT_MODEL_LABEL[c.payment_model] === "月額" ? "月" : PAYMENT_MODEL_LABEL[c.payment_model] === "時給" ? "時" : "件"}</span>
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">契約満了</div>
          <div className={cn("font-medium tabular-nums", urgent && "text-amber-700")}>
            {c.status === "ended" ? formatDate(c.contract_end) : `${days >= 0 ? "あと" : ""}${Math.abs(days)}日${days < 0 ? "経過" : ""}`}
          </div>
        </div>
        <div className="hidden sm:flex shrink-0 items-center gap-1">
          {!c.nda_signed_at && (
            <span title="NDA未締結"><Shield className="size-4 text-red-600" /></span>
          )}
          {c.country_code === "JP" && c.type === "individual" && !c.has_invoice_number && (
            <span title="インボイス未登録"><FileText className="size-4 text-amber-600" /></span>
          )}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

// ─── 詳細パネル（タブ式） ────────────────
function ContractorDetail({
  c, owner, onClose,
}: {
  c: DemoContractor;
  owner: DemoEmployee | undefined;
  onClose: () => void;
}) {
  const [detailTab, setDetailTab] = useState<"overview" | "submissions" | "payments" | "documents" | "evaluations">("overview");
  const payments = paymentsFor(c.id);
  const documents = documentsFor(c.id);
  const evaluations = evaluationsFor(c.id);
  const workRecords = workRecordsFor(c.id);
  const invoiceSubmissions = invoiceSubmissionsFor(c.id);
  const pendingHere = workRecords.filter((w) => w.status === "submitted").length
    + invoiceSubmissions.filter((i) => i.status === "submitted").length;

  const days = daysUntil(c.contract_end);
  const renewalAt = new Date(c.contract_end);
  renewalAt.setDate(renewalAt.getDate() - 30);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const ytdPaid = payments
    .filter((p) => p.status === "paid" && p.invoice_date >= yearStart)
    .reduce((sum, p) => sum + p.amount_jpy, 0);
  const overduePayments = payments.filter((p) => p.status === "overdue");

  const lastEval = evaluations[0];
  const avgRating = lastEval
    ? (lastEval.ratings.quality + lastEval.ratings.communication + lastEval.ratings.timeliness + lastEval.ratings.value) / 4
    : null;

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 pb-0 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
            {c.type === "corporate" ? <Building2 className="size-6 text-muted-foreground" /> : <Avatar className="size-12"><AvatarFallback>{initials(c.display_name)}</AvatarFallback></Avatar>}
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-bold">{c.display_name}</SheetTitle>
            {c.legal_name && c.legal_name !== c.display_name && (
              <div className="text-xs text-muted-foreground">{c.legal_name}</div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span>{c.country_emoji} {c.country_name} · {c.city}</span>
              <span>·</span>
              <Badge variant="outline" className="text-[10px]">
                {c.type === "individual" ? "個人事業主" : "法人"}
              </Badge>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_COLOR[c.status])}>
                {CONTRACTOR_STATUS_LABEL[c.status]}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
          <Stat label="報酬" value={`${fmtCurrency(c.rate_amount, c.currency)}/${PAYMENT_MODEL_LABEL[c.payment_model]}`} />
          <Stat label="月額換算" value={`¥${(c.monthly_estimate_jpy / 10000).toFixed(0)}万`} />
          <Stat label="YTD 支払" value={`¥${(ytdPaid / 10000).toFixed(0)}万`} />
          <Stat label="評価" value={avgRating ? `${avgRating.toFixed(1)} ★` : (c.rating ? `${c.rating} ★` : "—")} />
        </div>

        {(overduePayments.length > 0 || days <= 30 || !c.nda_signed_at) && c.status !== "ended" && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {overduePayments.length > 0 && (
              <button
                onClick={() => setDetailTab("payments")}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-800 hover:bg-red-100"
              >
                <AlertCircle className="size-3" />
                支払い遅延 {overduePayments.length} 件
              </button>
            )}
            {days <= 30 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                <Clock className="size-3" />
                契約満了まで {days} 日
              </span>
            )}
            {!c.nda_signed_at && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-800">
                <Shield className="size-3" />
                NDA 未締結
              </span>
            )}
          </div>
        )}

        <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as typeof detailTab)} className="mt-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <ClipboardList className="size-3.5" />
              概要
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-1.5">
              <Inbox className="size-3.5" />
              提出物
              {pendingHere > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">
                  {pendingHere}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5">
              <Wallet className="size-3.5" />
              支払い
              {overduePayments.length > 0 && (
                <span className="rounded-full bg-red-100 px-1 text-[9px] font-bold text-red-700">!</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileType2 className="size-3.5" />
              書類 ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-1.5">
              <Star className="size-3.5" />
              評価
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="p-5">
        {detailTab === "overview" && (
          <OverviewTab c={c} owner={owner} renewalAt={renewalAt} days={days} />
        )}
        {detailTab === "submissions" && (
          <SubmissionsTab
            contractor={c}
            workRecords={workRecords}
            invoices={invoiceSubmissions}
          />
        )}
        {detailTab === "payments" && (
          <PaymentsTab payments={payments} contractor={c} ytdPaid={ytdPaid} />
        )}
        {detailTab === "documents" && (
          <DocumentsTab documents={documents} />
        )}
        {detailTab === "evaluations" && (
          <EvaluationsTab evaluations={evaluations} />
        )}
      </div>
    </>
  );
}

// ─── 概要タブ ──────────────────────────
function OverviewTab({
  c, owner, renewalAt, days,
}: {
  c: DemoContractor;
  owner: DemoEmployee | undefined;
  renewalAt: Date;
  days: number;
}) {
  return (
    <div className="space-y-5">
      <Section title="契約情報">
          <Row label="役割">{c.role}</Row>
          <Row label="委託元部署">{c.department}{owner && ` ・ ${owner.full_name}`}</Row>
          <Row label="契約期間">
            {formatDate(c.contract_start)} 〜 {formatDate(c.contract_end)}
            <span className={cn("ml-2 text-xs", days <= 30 && c.status !== "ended" ? "font-medium text-amber-700" : "text-muted-foreground")}>
              ({c.status === "ended" ? "終了済み" : `あと${days}日`})
            </span>
          </Row>
          <Row label="自動更新">{c.auto_renew ? "あり" : "なし"}</Row>
        </Section>

        <Section title="法務・税務">
          <Row label="NDA">
            {c.nda_signed_at ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                締結済み（{formatDate(c.nda_signed_at)}）
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700">
                <AlertCircle className="size-3.5" />
                未締結
              </span>
            )}
          </Row>
          {c.country_code === "JP" && c.type === "individual" && (
            <Row label="インボイス番号">
              {c.has_invoice_number ? (
                <span className="font-mono text-xs">{c.invoice_number}</span>
              ) : (
                <span className="text-amber-700">未登録</span>
              )}
            </Row>
          )}
          <Row label="源泉徴収">
            {c.withholding_required ? "必要" : "不要"}
            {c.country_code !== "JP" && (
              <span className="ml-2 text-xs text-muted-foreground">（非居住者・租税条約適用）</span>
            )}
          </Row>
        </Section>

        {c.notes && (
          <Section title="メモ">
            <p className="text-sm leading-relaxed text-muted-foreground">{c.notes}</p>
          </Section>
        )}

        {/* 連携アクション */}
        <Section title="連携アクション">
          <div className="flex flex-wrap gap-2">
            {c.slack_user_id && (
              <Button
                variant="outline" size="sm"
                onClick={async () => {
                  await sendSlackReminder(c.slack_user_id!, `${c.display_name} さん、契約に関してご相談したい点があります。お時間ありますでしょうか。`);
                  toast.success("Slackを開きました（本文コピー済）");
                }}
                className="gap-1.5"
              >
                <SlackIconSmall className="size-3.5 text-[#4A154B]" /> Slack DM
              </Button>
            )}
            {c.status !== "ended" && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={createGoogleCalendarEventUrl({
                    title: `🤝 ${c.display_name} 契約更新ミーティング`,
                    description: `業務委託契約の更新可否を協議。\n\n役割: ${c.role}\n現契約期間: ${formatDate(c.contract_start)} 〜 ${formatDate(c.contract_end)}\n月額換算: ¥${c.monthly_estimate_jpy.toLocaleString()}`,
                    start: renewalAt,
                    attendees: [c.email, owner?.email ?? ""].filter(Boolean),
                    timezone: "Asia/Tokyo",
                  })}
                  target="_blank" rel="noopener noreferrer"
                >
                  <CalendarPlus className="size-3.5" /> 更新MTGをカレンダー
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${c.email}`}>
                <Mail className="size-3.5" /> メール
              </a>
            </Button>
          </div>
        </Section>

        {c.type === "individual" && c.rating && c.rating >= 4 && c.status !== "ended" && (
          <div className="rounded-xl border-2 border-dashed border-gc-300 bg-gc-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gc-600 text-white">
                <ArrowUpRight className="size-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gc-900">正社員への転換を検討しませんか?</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  評価 {c.rating} ★ の高パフォーマンス委託先です。雇用形態の変更で長期定着とコミットメント向上が期待できます。
                </p>
                <Button size="sm" className="mt-3 gap-1.5">
                  <Plus className="size-3.5" /> 採用パイプラインに追加
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// ─── 支払いタブ ──────────────────────────
function PaymentsTab({
  payments, contractor, ytdPaid,
}: {
  payments: ContractorPayment[];
  contractor: DemoContractor;
  ytdPaid: number;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        支払い履歴がありません
      </div>
    );
  }

  const monthlyData = [...payments].reverse();
  const maxAmount = Math.max(...monthlyData.map((p) => p.amount_jpy));

  const statusBadge = (s: ContractorPayment["status"]) => ({
    paid: { cls: "border-emerald-200 bg-emerald-50 text-emerald-800", label: "支払済" },
    pending: { cls: "border-blue-200 bg-blue-50 text-blue-800", label: "請求中" },
    overdue: { cls: "border-red-300 bg-red-50 text-red-800", label: "遅延" },
    scheduled: { cls: "border-gray-200 bg-gray-50 text-gray-700", label: "予定" },
  }[s]);

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_jpy, 0);
  const totalPending = payments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amount_jpy, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat label="YTD 支払" value={`¥${ytdPaid.toLocaleString()}`} />
        <Stat label="累計支払" value={`¥${totalPaid.toLocaleString()}`} />
        <Stat label="未払・請求中" value={totalPending > 0 ? `¥${totalPending.toLocaleString()}` : "—"} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          月別支払推移（円換算）
        </h3>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex h-32 items-end justify-between gap-2">
            {monthlyData.map((p) => {
              const heightPct = (p.amount_jpy / maxAmount) * 100;
              const month = p.invoice_date.slice(5, 7);
              return (
                <div key={p.id} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className={cn(
                        "w-full rounded-t",
                        p.status === "paid" ? "bg-gradient-to-t from-gc-700 to-gc-500"
                          : p.status === "overdue" ? "bg-gradient-to-t from-red-700 to-red-400"
                          : "bg-gradient-to-t from-blue-600 to-blue-400",
                      )}
                      style={{ height: `${heightPct}%` }}
                      title={`${p.invoice_date} ${fmtCurrency(p.amount, p.currency)}`}
                    />
                  </div>
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                    {month}月
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            支払い履歴 ({payments.length} 件)
          </h3>
          <span className="text-xs text-muted-foreground">
            通貨: {contractor.currency}
            {contractor.currency !== "JPY" && " (JPY換算併記)"}
          </span>
        </div>
        <ul className="space-y-1.5">
          {payments.map((p) => {
            const meta = statusBadge(p.status);
            const overdue = p.status === "overdue";
            return (
              <li
                key={p.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-md border bg-card p-3 text-sm",
                  overdue && "border-red-200",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{p.invoice_number}</span>
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", meta.cls)}>
                      {meta.label}
                    </span>
                    {p.freee_synced && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700" title="freee と同期済み">
                        <CheckCircle2 className="size-2.5" />
                        freee
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    請求 {p.invoice_date} · 期限 {p.due_date}
                    {p.paid_at && <span> · 支払 {p.paid_at}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">
                    {fmtCurrency(p.amount, p.currency)}
                  </div>
                  {p.currency !== "JPY" && (
                    <div className="text-[10px] tabular-nums text-muted-foreground">
                      ¥{p.amount_jpy.toLocaleString()}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── ドキュメントタブ ────────────────────
function DocumentsTab({ documents }: { documents: ContractorDocument[] }) {
  const grouped = new Map<string, ContractorDocument[]>();
  for (const d of documents) {
    if (!grouped.has(d.kind)) grouped.set(d.kind, []);
    grouped.get(d.kind)!.push(d);
  }
  const order: ContractorDocument["kind"][] = ["nda", "msa", "contract", "amendment", "invoice", "other"];

  return (
    <div className="space-y-5">
      <button className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-gc-500 hover:bg-gc-50 hover:text-gc-700">
        <Plus className="size-4" />
        ドキュメントをアップロード（NDA・契約書・請求書など）
      </button>

      {order.map((kind) => {
        const docs = grouped.get(kind);
        if (!docs?.length) return null;
        return (
          <div key={kind}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {DOC_KIND_LABEL[kind]} ({docs.length})
            </h3>
            <ul className="space-y-1.5">
              {docs.map((d) => {
                const expired = d.expires_at && new Date(d.expires_at) < new Date();
                const expiringSoon = d.expires_at && !expired
                  && (new Date(d.expires_at).getTime() - Date.now()) < 60 * 86400_000;
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm transition-colors hover:bg-accent/40"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{d.name}</span>
                        {d.status === "draft" && (
                          <Badge variant="outline" className="text-[10px]">下書き</Badge>
                        )}
                        {d.status === "expired" && (
                          <Badge variant="danger" className="text-[10px]">期限切れ</Badge>
                        )}
                        {expiringSoon && (
                          <Badge variant="warning" className="text-[10px]">期限間近</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.uploaded_by} · {d.uploaded_at} · {d.size_kb} KB
                        {d.expires_at && (
                          <span className={cn(expired && "ml-1 text-red-700", expiringSoon && "ml-1 text-amber-700")}>
                            · 有効期限 {d.expires_at}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      <Download className="size-3" />
                      DL
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ─── 評価タブ ────────────────────────────
function EvaluationsTab({ evaluations }: { evaluations: ContractorEvaluation[] }) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        まだ評価記録がありません
        <div className="mt-3">
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            評価を入力
          </Button>
        </div>
      </div>
    );
  }

  const RECOMMEND_LABEL = {
    strong_yes: { label: "強く継続推奨", cls: "border-emerald-300 bg-emerald-50 text-emerald-800" },
    yes: { label: "継続推奨", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    maybe: { label: "保留", cls: "border-amber-200 bg-amber-50 text-amber-800" },
    no: { label: "終了推奨", cls: "border-red-200 bg-red-50 text-red-800" },
  };

  const RatingBar = ({ label, value }: { label: string; value: number }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value} / 5</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-gc-500 to-gc-700"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" className="gap-1.5">
          <Plus className="size-3.5" />
          今期の評価を入力
        </Button>
      </div>

      {evaluations.map((e, idx) => {
        const avg = (e.ratings.quality + e.ratings.communication + e.ratings.timeliness + e.ratings.value) / 4;
        const rec = RECOMMEND_LABEL[e.recommend_continuation];
        const isLatest = idx === 0;
        return (
          <Card key={e.id} className={cn(isLatest && "border-gc-300 bg-gc-50/30")}>
            <div className="border-b p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{e.period}</span>
                    {isLatest && (
                      <span className="rounded-full bg-gc-600 px-1.5 py-0.5 text-[9px] font-bold text-white">最新</span>
                    )}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", rec.cls)}>
                      {rec.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    評価者: {e.evaluator} · {e.evaluated_at}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tabular-nums">{avg.toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground">/ 5.0 平均</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <RatingBar label="品質" value={e.ratings.quality} />
              <RatingBar label="コミュニケーション" value={e.ratings.communication} />
              <RatingBar label="納期遵守" value={e.ratings.timeliness} />
              <RatingBar label="費用対効果" value={e.ratings.value} />
            </div>
            {e.comment && (
              <div className="border-t p-4">
                <p className="text-sm leading-relaxed">{e.comment}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── 提出物タブ（個別） ─────────────────
function SubmissionsTab({
  contractor, workRecords, invoices,
}: {
  contractor: DemoContractor;
  workRecords: WorkRecord[];
  invoices: InvoiceSubmission[];
}) {
  const portalUrl = `/contractor-portal?cid=${contractor.id}`;

  return (
    <div className="space-y-5">
      {/* 委託先ポータルへのリンク */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ExternalLink className="size-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900">{contractor.display_name} さん用 セルフ提出ポータル</h4>
            <p className="mt-1 text-xs text-blue-900/80">
              委託先が自分で稼働レコードと請求書を提出できる専用ポータル。マジックリンクで認証。
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                <ExternalLink className="size-3" />
                ポータルを開く（プレビュー）
              </a>
              <button
                onClick={() => {
                  const link = `${window.location.origin}${portalUrl}`;
                  navigator.clipboard.writeText(link);
                  toast.success("マジックリンクをコピーしました", {
                    description: "メール or Slack で委託先に共有してください",
                  });
                }}
                className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                <LinkIcon className="size-3" />
                マジックリンクをコピー
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 稼働レコード */}
      <Section title={`稼働レコード (${workRecords.length})`}>
        {workRecords.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            稼働レコードはまだ提出されていません
          </div>
        ) : (
          <ul className="space-y-2">
            {workRecords.map((w) => <WorkRecordRow key={w.id} record={w} />)}
          </ul>
        )}
      </Section>

      {/* 請求書 */}
      <Section title={`請求書 (${invoices.length})`}>
        {invoices.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            請求書はまだ提出されていません
          </div>
        ) : (
          <ul className="space-y-2">
            {invoices.map((i) => <InvoiceSubmissionRow key={i.id} invoice={i} contractor={contractor} />)}
          </ul>
        )}
      </Section>
    </div>
  );
}

function WorkRecordRow({ record }: { record: WorkRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [draftComment, setDraftComment] = useState("");
  const isPending = record.status === "submitted";

  return (
    <li className="rounded-lg border bg-card p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
      >
        <Receipt className="size-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{record.period} 稼働</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_CLS[record.status])}>
              {STATUS_LABEL[record.status]}
            </span>
            {record.hours_total > 0 && (
              <span className="text-xs text-muted-foreground">{record.hours_total}h / {record.days_worked}日</span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{record.task_summary}</p>
          {record.submitted_at && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              提出: {record.submitted_at}
              {record.reviewed_at && ` · レビュー: ${record.reviewed_at}`}
            </p>
          )}
        </div>
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t pt-3 text-sm">
          {record.entries.length > 0 && (
            <div>
              <h5 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                稼働明細 ({record.entries.length} 件)
              </h5>
              <ul className="divide-y rounded-md border bg-muted/30">
                {record.entries.map((e, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                    <span className="w-20 shrink-0 font-mono text-muted-foreground">{e.date}</span>
                    <span className="w-12 shrink-0 text-right font-medium tabular-nums">{e.hours}h</span>
                    <span className="flex-1 truncate">{e.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {record.deliverable_urls.length > 0 && (
            <div>
              <h5 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                成果物リンク
              </h5>
              <ul className="space-y-1">
                {record.deliverable_urls.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span className="truncate">{url}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {record.reviewer_comment && (
            <div className="rounded-md bg-muted/50 p-2 text-xs">
              <span className="font-medium">レビューコメント:</span> {record.reviewer_comment}
            </div>
          )}
          {isPending && (
            <div className="space-y-2 border-t pt-3">
              <Input
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                placeholder="コメント（任意・差し戻し時は必須）"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    toast.success("稼働レコードを承認しました", {
                      description: `${record.period} の稼働を承認。請求書発行を委託先に通知します。`,
                    });
                  }}
                  className="gap-1.5"
                >
                  <ThumbsUp className="size-3.5" />
                  承認
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!draftComment) {
                      toast.error("差し戻しにはコメントが必要です");
                      return;
                    }
                    toast.success("稼働レコードを差し戻しました", {
                      description: "コメント付きで委託先に通知します",
                    });
                  }}
                  className="gap-1.5 text-red-700"
                >
                  <ThumbsDown className="size-3.5" />
                  差し戻し
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function InvoiceSubmissionRow({
  invoice, contractor,
}: {
  invoice: InvoiceSubmission;
  contractor?: DemoContractor;
}) {
  const [draftComment, setDraftComment] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const isPending = invoice.status === "submitted";
  const isForeign = invoice.currency !== "JPY";

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <FileText className="size-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{invoice.invoice_number}</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_CLS[invoice.status])}>
              {STATUS_LABEL[invoice.status]}
            </span>
            {invoice.freee_pushed && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700">
                <CheckCircle2 className="size-2.5" />
                freee 連携済
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium">
              {invoice.currency === "JPY"
                ? `¥${invoice.amount.toLocaleString()}`
                : `${invoice.currency} ${invoice.amount.toLocaleString()} (¥${invoice.amount_jpy.toLocaleString()})`}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{invoice.file_name}</span>
            <span className="text-muted-foreground">({invoice.file_size_kb} KB)</span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            提出: {invoice.submitted_at}
            {invoice.reviewed_at && ` · レビュー: ${invoice.reviewed_at}`}
            {invoice.paid_at && ` · 支払: ${invoice.paid_at}`}
          </p>
          {invoice.reviewer_comment && (
            <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
              <span className="font-medium">コメント:</span> {invoice.reviewer_comment}
            </div>
          )}
          {isPending && (
            <div className="mt-2 space-y-2 border-t pt-2">
              <Input
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                placeholder="コメント（任意）"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (isForeign && contractor) {
                      setShowPaymentDialog(true);
                    } else {
                      toast.success("請求書を承認しました", {
                        description: `${invoice.invoice_number} を freee に同期します`,
                      });
                    }
                  }}
                  className="gap-1.5"
                >
                  {isForeign && contractor ? (
                    <>
                      <ArrowLeftRight className="size-3.5" />
                      支払い処理を開く
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="size-3.5" />
                      承認 → freee へ同期
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!draftComment) {
                      toast.error("差し戻しにはコメントが必要です");
                      return;
                    }
                    toast.success("請求書を差し戻しました");
                  }}
                  className="gap-1.5 text-red-700"
                >
                  <ThumbsDown className="size-3.5" />
                  差し戻し
                </Button>
              </div>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs">
          <Download className="size-3" />
          DL
        </Button>
      </div>

      {contractor && (
        <PaymentProcessingDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          invoice={invoice}
          contractor={contractor}
        />
      )}
    </li>
  );
}

// ─── 承認キュー（一覧タブ） ─────────────
function ApprovalQueue({
  contractors, onPickContractor,
}: {
  contractors: DemoContractor[];
  onPickContractor: (c: DemoContractor) => void;
}) {
  const cMap = new Map(contractors.map((c) => [c.id, c]));
  const { workRecords: wrPending, invoices: invPending } = allPendingSubmissions();

  const allItems = [
    ...wrPending.map((w) => ({ kind: "wr" as const, item: w, submittedAt: w.submitted_at ?? "" })),
    ...invPending.map((i) => ({ kind: "inv" as const, item: i, submittedAt: i.submitted_at })),
  ].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  if (allItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          🎉 承認待ちの提出物はありません
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="flex items-center gap-2">
          <Inbox className="size-4" />
          <span className="font-medium">承認待ち {allItems.length} 件</span>
          <span className="text-xs">
            （稼働レコード {wrPending.length}・請求書 {invPending.length}）
          </span>
        </div>
      </div>

      {allItems.map(({ kind, item }) => {
        const c = cMap.get(item.contractor_id);
        if (!c) return null;
        return (
          <Card key={item.id}>
            <CardContent className="flex flex-wrap items-start gap-4 p-4 sm:flex-nowrap">
              <div className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                kind === "wr" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700",
              )}>
                {kind === "wr" ? <Receipt className="size-5" /> : <FileText className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {kind === "wr"
                      ? `${(item as WorkRecord).period} 稼働レコード`
                      : `請求書 ${(item as InvoiceSubmission).invoice_number}`}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs">
                    {c.display_name} {c.country_emoji}
                  </span>
                </div>
                {kind === "wr" ? (
                  <>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {(item as WorkRecord).task_summary}
                    </p>
                    {(item as WorkRecord).hours_total > 0 && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {(item as WorkRecord).hours_total}h / {(item as WorkRecord).days_worked}日 ・ 成果物 {(item as WorkRecord).deliverable_urls.length}件
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-0.5 text-xs">
                    <span className="font-medium tabular-nums">
                      {(item as InvoiceSubmission).currency === "JPY"
                        ? `¥${(item as InvoiceSubmission).amount.toLocaleString()}`
                        : `${(item as InvoiceSubmission).currency} ${(item as InvoiceSubmission).amount.toLocaleString()}`}
                    </span>
                    <span className="ml-2 text-muted-foreground">{(item as InvoiceSubmission).file_name}</span>
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground">提出: {item.submitted_at}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPickContractor(c)}
                  className="gap-1.5"
                >
                  <MessageSquare className="size-3.5" />
                  詳細
                </Button>
                <Button
                  size="sm"
                  onClick={() => toast.success(kind === "wr" ? "稼働レコードを承認しました" : "請求書を承認しました（freee 同期）")}
                  className="gap-1.5"
                >
                  <ThumbsUp className="size-3.5" />
                  承認
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── 支払い処理ダイアログ ────────────────
function PaymentProcessingDialog({
  open, onOpenChange, invoice, contractor,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: InvoiceSubmission;
  contractor: DemoContractor;
}) {
  // 請求日のレートはモックデータの amount_jpy / amount から逆算
  const fxRateInvoiceDate = invoice.amount > 0 ? invoice.amount_jpy / invoice.amount : 1;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    () => recommendedTransferMethod(invoice.currency, invoice.amount)
  );
  const [withholdingPolicy, setWithholdingPolicy] = useState<WithholdingPolicy>(
    () => recommendedWithholding(contractor.country_code, contractor.type)
  );

  const breakdown = computePaymentBreakdown({
    invoiceAmount: invoice.amount,
    invoiceCurrency: invoice.currency,
    fxRateInvoiceDate,
    withholdingPolicy,
    paymentMethod,
  });

  const fxRateInfo = FX_RATES[invoice.currency as keyof typeof FX_RATES];
  const treaty = COUNTRY_WITHHOLDING[contractor.country_code];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-5 text-gc-700" />
            海外送金 支払い処理
          </DialogTitle>
          <DialogDescription>
            {contractor.display_name} {contractor.country_emoji} さんへの支払を確定します。為替・送金手数料・源泉徴収を合わせた最終金額を確認してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* インボイス情報 */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">請求書</div>
                <div className="font-mono text-xs">{invoice.invoice_number}</div>
                <div className="text-[10px] text-muted-foreground">{invoice.invoice_date}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">請求額</div>
                <div className="font-bold tabular-nums">
                  {fmtFx(invoice.amount, invoice.currency)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">委託先国・形態</div>
                <div className="text-xs">{contractor.country_emoji} {contractor.country_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {contractor.type === "individual" ? "個人事業主" : "法人"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">租税条約</div>
                {treaty?.has_treaty ? (
                  <div className="inline-flex items-center gap-1 text-xs text-emerald-700">
                    <CheckCircle2 className="size-3" />
                    あり
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">なし</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* FX レート */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ArrowLeftRight className="size-3.5" />
                  為替レート ({invoice.currency} → JPY)
                </h4>
                {fxRateInfo && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {fxRateInfo.delta_30d_pct >= 0 ? <TrendingUp className="size-3 text-emerald-600" /> : <TrendingDown className="size-3 text-red-600" />}
                    30日: {fxRateInfo.delta_30d_pct >= 0 ? "+" : ""}{fxRateInfo.delta_30d_pct.toFixed(2)}%
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground">請求日のレート</div>
                  <div className="font-mono tabular-nums">¥{breakdown.fx_rate_invoice_date.toFixed(2)}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    JPY換算: ¥{breakdown.jpy_at_invoice.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">本日のレート (TTM)</div>
                  <div className="font-mono tabular-nums">¥{breakdown.fx_rate_payment_date.toFixed(2)}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    JPY換算: ¥{breakdown.jpy_at_payment.toLocaleString()}
                  </div>
                </div>
                <div className={cn(
                  "rounded-lg border p-2",
                  breakdown.fx_diff_jpy >= 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50",
                )}>
                  <div className="text-[10px] text-muted-foreground">為替差損益（当社視点）</div>
                  <div className={cn(
                    "flex items-center gap-1 font-bold tabular-nums",
                    breakdown.fx_diff_jpy >= 0 ? "text-red-700" : "text-emerald-700",
                  )}>
                    {breakdown.fx_diff_jpy >= 0 ? "+" : ""}¥{breakdown.fx_diff_jpy.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {breakdown.fx_diff_pct >= 0 ? "+" : ""}{breakdown.fx_diff_pct.toFixed(2)}%
                    {breakdown.fx_diff_jpy >= 0 ? "（円安・支払増）" : "（円高・支払減）"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 送金方法 */}
          <Card>
            <CardContent className="p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Banknote className="size-3.5" />
                送金方法
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["wise", "swift", "payoneer"] as PaymentMethod[]).map((m) => {
                  const spec = TRANSFER_METHODS[m];
                  const selected = paymentMethod === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border-2 p-3 text-left text-xs transition-all",
                        selected ? "border-gc-500 bg-gc-50 shadow-sm" : "border-border hover:border-gc-300 hover:bg-accent/30",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{spec.label}</span>
                        {selected && <CheckCircle2 className="size-3.5 text-gc-700" />}
                      </div>
                      <p className="line-clamp-2 text-[10px] text-muted-foreground">{spec.description}</p>
                      <div className="mt-0.5 flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">着金</span>
                        <span className="font-medium">{spec.estimated_days}日</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 源泉徴収 */}
          <Card>
            <CardContent className="p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Shield className="size-3.5" />
                源泉徴収・租税条約
              </h4>
              {treaty && (
                <div className="mb-3 flex items-start gap-2 rounded-md bg-blue-50 p-2 text-xs text-blue-900">
                  <Info className="size-3.5 shrink-0 mt-0.5" />
                  <span>{treaty.treaty_note}</span>
                </div>
              )}
              <div className="space-y-1.5">
                {(
                  contractor.type === "corporate"
                    ? (["exempt_corporate"] as WithholdingPolicy[])
                    : (treaty?.has_treaty
                      ? ["exempt_treaty", "reduced_treaty_10", "reduced_treaty_15", "standard_japan_20_42"]
                      : ["non_resident_no_pe", "standard_japan_20_42"]) as WithholdingPolicy[]
                ).map((p) => {
                  const selected = withholdingPolicy === p;
                  return (
                    <label
                      key={p}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors",
                        selected ? "border-gc-500 bg-gc-50" : "hover:bg-accent/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="withholding"
                        checked={selected}
                        onChange={() => setWithholdingPolicy(p)}
                        className="size-3.5"
                      />
                      <span className="flex-1 text-xs">{withholdingPolicyLabel(p)}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 最終内訳 */}
          <Card className="border-gc-300 bg-gc-50/30">
            <CardContent className="p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gc-900">
                <Coins className="size-4" />
                支払い内訳（最終確認）
              </h4>
              <div className="space-y-1.5 font-mono text-sm">
                <BreakdownRow label="請求額" value={fmtFx(invoice.amount, invoice.currency)} />
                {breakdown.withholding_local > 0 && (
                  <BreakdownRow
                    label={`源泉徴収 (${(breakdown.withholding_rate * 100).toFixed(2)}%)`}
                    value={`-${fmtFx(breakdown.withholding_local, invoice.currency)}`}
                    negative
                  />
                )}
                <div className="border-t pt-1.5" />
                <BreakdownRow
                  label="委託先 受取額（現地通貨）"
                  value={fmtFx(breakdown.net_received_local, invoice.currency)}
                  bold
                />
                <BreakdownRow
                  label="委託先 受取額（JPY換算）"
                  value={`¥${breakdown.net_received_jpy.toLocaleString()}`}
                  muted
                />
                <div className="my-2 h-px bg-border" />
                <BreakdownRow
                  label="JPY換算（本日レート）"
                  value={`¥${breakdown.jpy_at_payment.toLocaleString()}`}
                />
                <BreakdownRow
                  label={`送金手数料 (${TRANSFER_METHODS[paymentMethod].label})`}
                  value={`+¥${breakdown.transfer_fee_jpy.toLocaleString()}`}
                  muted
                />
                {breakdown.fx_markup_jpy > 0 && (
                  <BreakdownRow
                    label="為替スプレッド"
                    value={`+¥${breakdown.fx_markup_jpy.toLocaleString()}`}
                    muted
                  />
                )}
                <div className="border-t pt-1.5" />
                <BreakdownRow
                  label="当社 総支出 (JPY)"
                  value={`¥${breakdown.total_cost_jpy.toLocaleString()}`}
                  bold
                  className="text-gc-900"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button
            onClick={() => {
              toast.success("支払いを承認しました", {
                description: `${TRANSFER_METHODS[paymentMethod].label} 経由で ${fmtFx(breakdown.net_received_local, invoice.currency)} を送金。freee に同期。`,
              });
              onOpenChange(false);
            }}
            className="gap-1.5"
          >
            <Send className="size-4" />
            承認して送金処理を開始
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BreakdownRow({
  label, value, bold, muted, negative, className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  negative?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between",
      bold && "font-bold",
      muted && "text-muted-foreground text-xs",
      negative && "text-red-700",
      className,
    )}>
      <span className="font-sans">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// ─── 契約タイムライン ────────────────────
function ContractTimeline({
  contractors, onSelect,
}: {
  contractors: DemoContractor[];
  onSelect: (c: DemoContractor) => void;
}) {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setMonth(minDate.getMonth() - 6);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 12);
  const totalMs = maxDate.getTime() - minDate.getTime();

  const months: Date[] = [];
  const m = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (m <= maxDate) {
    months.push(new Date(m));
    m.setMonth(m.getMonth() + 1);
  }

  const todayPct = ((today.getTime() - minDate.getTime()) / totalMs) * 100;

  const sorted = [...contractors].sort((a, b) =>
    new Date(a.contract_end).getTime() - new Date(b.contract_end).getTime()
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded bg-gradient-to-r from-gc-500 to-gc-700" />
            稼働中
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded bg-gradient-to-r from-amber-300 to-amber-500" />
            更新ウィンドウ（期限30日前）
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded bg-blue-500" />
            交渉中
          </div>
          <div className="ml-auto text-muted-foreground">
            {minDate.getFullYear()}/{minDate.getMonth() + 1} 〜 {maxDate.getFullYear()}/{maxDate.getMonth() + 1}
          </div>
        </div>

        <div className="relative ml-48 h-6 border-b text-[10px] text-muted-foreground">
          {months.map((mDate) => {
            const pct = ((mDate.getTime() - minDate.getTime()) / totalMs) * 100;
            return (
              <span
                key={mDate.toISOString()}
                className="absolute top-0 -translate-x-1/2 tabular-nums"
                style={{ left: `${pct}%` }}
              >
                {mDate.getMonth() === 0 ? `${mDate.getFullYear()}` : `${mDate.getMonth() + 1}`}
              </span>
            );
          })}
          <span
            className="absolute top-0 h-full border-l-2 border-red-500"
            style={{ left: `${todayPct}%` }}
            title="今日"
          />
        </div>

        <ul className="mt-1 space-y-1">
          {sorted.map((c) => {
            const start = Math.max(new Date(c.contract_start).getTime(), minDate.getTime());
            const end = Math.min(new Date(c.contract_end).getTime(), maxDate.getTime());
            const startPct = ((start - minDate.getTime()) / totalMs) * 100;
            const endPct = ((end - minDate.getTime()) / totalMs) * 100;
            const widthPct = Math.max(0, endPct - startPct);

            const renewalStart = end - 30 * 86400_000;
            const renewalStartPct = ((renewalStart - minDate.getTime()) / totalMs) * 100;
            const renewalWidth = Math.max(0, endPct - renewalStartPct);

            const isNegotiating = c.status === "negotiating";

            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c)}
                  className="group flex w-full items-center gap-2 rounded-md py-1 text-left hover:bg-accent/40"
                >
                  <div className="w-48 shrink-0 truncate pl-1 text-xs">
                    <span className="font-medium">{c.display_name}</span>
                    <span className="ml-1">{c.country_emoji}</span>
                    <div className="truncate text-[10px] text-muted-foreground">{c.role}</div>
                  </div>
                  <div className="relative h-6 flex-1 rounded bg-muted/30">
                    {!isNegotiating && (
                      <div
                        className="absolute top-0 h-full bg-gradient-to-r from-amber-300/60 to-amber-500/80"
                        style={{ left: `${renewalStartPct}%`, width: `${renewalWidth}%` }}
                      />
                    )}
                    <div
                      className={cn(
                        "absolute bottom-0.5 top-0.5 rounded shadow-sm transition-all group-hover:shadow-md",
                        isNegotiating ? "bg-blue-500" : "bg-gradient-to-r from-gc-500 to-gc-700",
                      )}
                      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    >
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-medium text-white">
                        {fmtCurrency(c.rate_amount, c.currency)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
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

// ─── 警告リスト Sheet ───────────────────
function ConcernList({
  title, subtitle, items, empMap: _empMap, onClose, onPick, variant,
}: {
  title: string; subtitle: string;
  items: DemoContractor[];
  empMap: Map<string, DemoEmployee>;
  onClose: () => void;
  onPick: (c: DemoContractor) => void;
  variant: "danger" | "warning";
}) {
  return (
    <>
      <div className={cn(
        "sticky top-0 z-10 flex items-start justify-between gap-3 border-b p-5 backdrop-blur",
        variant === "danger" ? "bg-red-50/80" : "bg-amber-50/80",
      )}>
        <div>
          <SheetTitle className="text-lg font-bold">{title}</SheetTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
          <X className="size-4" />
        </Button>
      </div>
      <ul className="divide-y">
        {items.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onPick(c)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/40"
            >
              <Avatar className="size-9"><AvatarFallback>{initials(c.display_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.display_name} {c.country_emoji}</div>
                <div className="text-xs text-muted-foreground">{c.role} · {c.department}</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ─── 分析タブ ────────────────────────────
function Analytics({ contractors }: { contractors: DemoContractor[] }) {
  const active = contractors.filter((c) => c.status !== "ended");
  const byCountry = new Map<string, { name: string; emoji: string; count: number; jpy: number }>();
  for (const c of active) {
    const key = c.country_code;
    if (!byCountry.has(key)) byCountry.set(key, { name: c.country_name, emoji: c.country_emoji, count: 0, jpy: 0 });
    const entry = byCountry.get(key)!;
    entry.count += 1;
    entry.jpy += c.monthly_estimate_jpy;
  }
  const totalJpy = active.reduce((s, c) => s + c.monthly_estimate_jpy, 0);
  const sortedCountries = [...byCountry.entries()].sort((a, b) => b[1].jpy - a[1].jpy);

  const byDept = new Map<string, number>();
  for (const c of active) byDept.set(c.department, (byDept.get(c.department) ?? 0) + c.monthly_estimate_jpy);
  const sortedDepts = [...byDept.entries()].sort((a, b) => b[1] - a[1]);

  // ─── FX エクスポージャー ────────────────
  const byCurrency = new Map<string, { count: number; localTotal: number; jpyTotal: number }>();
  for (const c of active) {
    const key = c.currency;
    if (!byCurrency.has(key)) byCurrency.set(key, { count: 0, localTotal: 0, jpyTotal: 0 });
    const entry = byCurrency.get(key)!;
    entry.count += 1;
    entry.localTotal += c.rate_amount;
    entry.jpyTotal += c.monthly_estimate_jpy;
  }
  const sortedCurrencies = [...byCurrency.entries()].sort((a, b) => b[1].jpyTotal - a[1].jpyTotal);
  const foreignTotal = sortedCurrencies
    .filter(([cur]) => cur !== "JPY")
    .reduce((s, [, v]) => s + v.jpyTotal, 0);
  const fxExposurePct = totalJpy > 0 ? (foreignTotal / totalJpy) * 100 : 0;

  return (
    <>
    {/* FX エクスポージャー */}
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ArrowLeftRight className="size-4 text-gc-700" />
              為替エクスポージャー
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              月額外貨支払合計 ¥{foreignTotal.toLocaleString()}
              <span className="ml-1">
                （全支払の <strong className="text-foreground">{fxExposurePct.toFixed(1)}%</strong>）
              </span>
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground">
            レート基準日: {FX_RATES.USD.asOf} (TTM)
          </div>
        </div>

        {/* バー：通貨別 */}
        <ul className="mt-4 space-y-2">
          {sortedCurrencies.map(([cur, v]) => {
            const pct = (v.jpyTotal / totalJpy) * 100;
            const fxInfo = FX_RATES[cur as keyof typeof FX_RATES];
            const trendUp = (fxInfo?.delta_30d_pct ?? 0) >= 0;
            return (
              <li key={cur} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex w-12 justify-center rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                      {cur}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {v.count}社 · 月額 {fmtFx(v.localTotal, cur)}
                    </span>
                    {fxInfo && cur !== "JPY" && (
                      <span className={cn(
                        "inline-flex items-center gap-0.5 text-[10px] font-medium",
                        trendUp ? "text-red-700" : "text-emerald-700",
                      )}>
                        {trendUp ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                        30d {trendUp ? "+" : ""}{fxInfo.delta_30d_pct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <span className="font-medium tabular-nums">¥{(v.jpyTotal / 10000).toFixed(0)}万 ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full",
                      cur === "JPY" ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                        : trendUp ? "bg-gradient-to-r from-red-400 to-red-600"
                        : "bg-gradient-to-r from-blue-400 to-blue-600",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* 警告 / 推奨 */}
        {fxExposurePct > 30 && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>
              <strong>外貨エクスポージャーが高めです</strong>（{fxExposurePct.toFixed(1)}%）。
              主要通貨ペアで月次の為替予約・先物ヘッジを検討してください。
              特に円安基調が続く場合、四半期予算へのインパクトが大きくなります。
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-gc-700" /> 国別の月額支払見込
          </h3>
          <ul className="space-y-2">
            {sortedCountries.map(([code, v]) => {
              const pct = (v.jpy / totalJpy) * 100;
              return (
                <li key={code} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{v.emoji} {v.name} <span className="text-xs text-muted-foreground">({v.count}社)</span></span>
                    <span className="font-medium tabular-nums">¥{(v.jpy / 10000).toFixed(0)}万</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-gc-500 to-gc-700" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-semibold">
            <span>合計</span>
            <span className="tabular-nums">¥{totalJpy.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Filter className="size-4 text-gc-700" /> 部署別の月額支払見込
          </h3>
          <ul className="space-y-2">
            {sortedDepts.map(([dept, jpy]) => {
              const pct = (jpy / totalJpy) * 100;
              return (
                <li key={dept} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{dept}</span>
                    <span className="font-medium tabular-nums">¥{(jpy / 10000).toFixed(0)}万</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

// ─── CSV エクスポート ────────────────────
function exportCsv(items: DemoContractor[]) {
  const header = ["名前", "種別", "国", "都市", "役割", "部署", "ステータス", "報酬", "通貨", "月額換算(JPY)", "契約開始", "契約終了", "NDA締結日", "インボイス番号", "源泉徴収"];
  const rows = items.map((c) => [
    c.display_name, c.type === "individual" ? "個人" : "法人", c.country_name, c.city,
    c.role, c.department, CONTRACTOR_STATUS_LABEL[c.status],
    `${c.rate_amount} (${PAYMENT_MODEL_LABEL[c.payment_model]})`, c.currency, c.monthly_estimate_jpy.toString(),
    c.contract_start, c.contract_end, c.nda_signed_at ?? "未締結",
    c.invoice_number ?? "", c.withholding_required ? "必要" : "不要",
  ]);
  const csv = [header, ...rows].map((r) =>
    r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contractors_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${items.length} 件の委託先を CSV で出力しました`);
}
