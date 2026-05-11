"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Inbox, Shield, Lock, ChevronRight, X, Send, CheckCircle2, ExternalLink, EyeOff,
  Plus, Filter, MessageSquare, ScrollText, FileText, ShieldAlert,
} from "lucide-react";
import {
  type Report, type ReportCategory, type ReportStatus, type Severity, CATEGORY_LABEL,
  CATEGORY_TONE, STATUS_LABEL, STATUS_TONE, SEVERITY_LABEL, SEVERITY_TONE,
  activeReports, reportsByStatus, reportsBySeverity, reportsByCategory, avgResolutionDays,
} from "@/lib/demo/voice-box";
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

export function VoiceBoxClient({
  reports, employees,
}: {
  reports: Report[];
  employees: DemoEmployee[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const [tab, setTab] = useState<"queue" | "submit" | "analytics">("queue");
  const [selected, setSelected] = useState<Report | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  // KPI
  const active = activeReports();
  const critical = reportsBySeverity("critical");
  const investigating = reportsByStatus("investigating");
  const _resolved = reportsByStatus("resolved");
  const avgDays = avgResolutionDays();

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Inbox className="size-6 text-gc-700" />
            目安箱・通報
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ハラスメント・コンプライアンス相談の安全な窓口。匿名通報可能・厳格な機密管理。
          </p>
        </div>
        <Button onClick={() => setShowSubmit(true)} className="gap-1.5">
          <Plus className="size-4" />
          新規通報
        </Button>
      </div>

      {/* プライバシー注意書き */}
      <Card className="border-purple-200 bg-purple-50/40">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Shield className="size-5 shrink-0 text-purple-700 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-purple-900">プライバシー保護</p>
            <p className="mt-1 text-xs text-muted-foreground">
              通報内容は HR・法務の指定担当者のみが閲覧可能。匿名通報は ID で照合され、本人特定情報は記録されません。
              重大事案は外部弁護士事務所にエスカレーションされます。報復行為は厳正に対処します。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={Inbox} label="進行中の通報" value={active.length} unit="件" tone="primary" hint="進行中ケース" onClick={() => setTab("queue")} />
        <KpiTile icon={ShieldAlert} label="最重要案件" value={critical.length} unit="件" tone={critical.length > 0 ? "danger" : "muted"} hint="社外エスカレーション" onClick={() => setTab("queue")} disabled={critical.length === 0} />
        <KpiTile icon={MessageSquare} label="調査中" value={investigating.length} unit="件" tone={investigating.length > 0 ? "warning" : "muted"} hint="HR/法務で調査中" onClick={() => setTab("queue")} disabled={investigating.length === 0} />
        <KpiTile icon={CheckCircle2} label="平均解決日数" value={avgDays} unit="日" tone="success" hint="完了済の平均" onClick={() => setTab("analytics")} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            <Inbox className="size-3.5" />
            通報キュー ({active.length})
          </TabsTrigger>
          <TabsTrigger value="submit" className="gap-2">
            <FileText className="size-3.5" />
            通報の流れ
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <Filter className="size-3.5" />
            分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <QueueView reports={reports} empMap={empMap} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="submit">
          <SubmitGuide onOpenSubmit={() => setShowSubmit(true)} />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsView reports={reports} />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" showClose={false}>
          {selected && (
            <ReportDetail
              report={selected}
              empMap={empMap}
              onClose={() => setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <SubmitDialog open={showSubmit} onOpenChange={setShowSubmit} />
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

function QueueView({
  reports, empMap, onSelect,
}: {
  reports: Report[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (r: Report) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const filtered = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (severityFilter !== "all" && r.severity !== severityFilter) return false;
    return true;
  }).sort((a, b) => {
    const sev = { critical: 0, high: 1, medium: 2, low: 3 };
    return sev[a.severity] - sev[b.severity] || b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs text-muted-foreground">フィルター:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReportStatus | "all")}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              {(Object.keys(STATUS_LABEL) as ReportStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as Severity | "all")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全重大度</SelectItem>
              {(Object.keys(SEVERITY_LABEL) as Severity[]).map((s) => (
                <SelectItem key={s} value={s}>{SEVERITY_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            該当する通報はありません
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => <ReportRow key={r.id} report={r} empMap={empMap} onClick={() => onSelect(r)} />)}
        </ul>
      )}
    </div>
  );
}

function ReportRow({
  report, empMap, onClick,
}: {
  report: Report;
  empMap: Map<string, DemoEmployee>;
  onClick: () => void;
}) {
  const reporter = report.reporter_id ? empMap.get(report.reporter_id) : null;
  return (
    <li>
      <Card
        onClick={onClick}
        className={cn(
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
          report.severity === "critical" && "border-l-4 border-l-red-500",
          report.severity === "high" && "border-l-4 border-l-orange-400",
        )}
      >
        <CardContent className="flex items-start gap-3 p-3">
          {/* 通報者表示 — 匿名なら専用アイコン */}
          {report.is_anonymous ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
              <EyeOff className="size-4" />
            </div>
          ) : reporter ? (
            <Avatar className="size-9 shrink-0">
              <AvatarFallback>{initials(reporter.full_name)}</AvatarFallback>
            </Avatar>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">#{report.number}</span>
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", CATEGORY_TONE[report.category])}>
                {CATEGORY_LABEL[report.category]}
              </span>
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", SEVERITY_TONE[report.severity])}>
                {SEVERITY_LABEL[report.severity]}
              </span>
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", STATUS_TONE[report.status])}>
                {STATUS_LABEL[report.status]}
              </span>
              {report.is_anonymous && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] text-purple-700">
                  <Lock className="size-2.5" />
                  匿名
                </span>
              )}
            </div>
            <h3 className="mt-1 truncate font-medium">{report.subject}</h3>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {report.is_anonymous ? "匿名通報者" : reporter?.full_name ?? "—"}
              {" · "}
              {relativeTime(report.created_at)}
              {report.investigation_notes.length > 0 && (
                <> · 調査メモ {report.investigation_notes.length}</>
              )}
            </div>
          </div>

          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </li>
  );
}

function SubmitGuide({ onOpenSubmit }: { onOpenSubmit: () => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h3 className="text-lg font-bold">通報の流れ</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              安心して通報いただけるよう、以下の手順とお約束をご確認ください。
            </p>
          </div>

          <ol className="space-y-3">
            <Step
              num={1}
              title="通報内容を記入"
              body="件名・カテゴリ・詳細を入力。匿名 / 記名は選択できます。事実関係・場所・時期など、できる範囲で具体的にお書きください。"
            />
            <Step
              num={2}
              title="HR・法務が受付"
              body="24 時間以内に受付確認メッセージをお返しします。匿名通報の場合も、ID 経由で経過確認可能です。"
            />
            <Step
              num={3}
              title="振り分けと調査"
              body="重大度に応じて HR / 法務 / 経営 / 外部弁護士へ振り分け。最重要案件は外部独立調査チームに委託します。"
            />
            <Step
              num={4}
              title="フィードバック"
              body="調査経過と最終対応をお知らせします（個人情報保護のため詳細は省略する場合があります）。"
            />
          </ol>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <h4 className="flex items-center gap-1.5 font-semibold text-emerald-900">
              <Shield className="size-4" />
              お約束
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>・通報者の身元は厳格に保護します</li>
              <li>・通報を理由とする報復行為は懲戒対象とします</li>
              <li>・調査記録は法令に従い厳重に管理します</li>
              <li>・社外専用窓口（顧問弁護士）も利用可能です</li>
            </ul>
          </div>

          <Button onClick={onOpenSubmit} className="w-full gap-1.5">
            <Plus className="size-4" />
            通報を開始する
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold">社外通報窓口</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            社内では話しにくい内容や、HR・法務以外への通報をご希望の場合は、当社顧問弁護士事務所が運営する独立窓口をご利用いただけます。
          </p>
          <Button variant="outline" size="sm" className="mt-2 gap-1.5" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              外部窓口へ（株式会社グリーンロウ法律事務所）
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ num, title, body }: { num: number; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gc-100 text-xs font-bold text-gc-800">
        {num}
      </span>
      <div className="flex-1">
        <h5 className="text-sm font-semibold">{title}</h5>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function AnalyticsView({ reports }: { reports: Report[] }) {
  const byCat = reportsByCategory();
  const total = reports.length;
  const sortedCat = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  const bySev = new Map<Severity, number>();
  for (const r of reports) bySev.set(r.severity, (bySev.get(r.severity) ?? 0) + 1);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">カテゴリ別件数</h3>
          <ul className="space-y-2">
            {sortedCat.map(([cat, count]) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <li key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", CATEGORY_TONE[cat])}>
                      {CATEGORY_LABEL[cat]}
                    </span>
                    <span className="font-bold tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">重大度分布</h3>
          <ul className="space-y-2">
            {(["critical", "high", "medium", "low"] as Severity[]).map((s) => {
              const count = bySev.get(s) ?? 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <li key={s} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", SEVERITY_TONE[s])}>
                      {SEVERITY_LABEL[s]}
                    </span>
                    <span className="font-bold tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full",
                        s === "critical" ? "bg-red-500"
                          : s === "high" ? "bg-orange-500"
                          : s === "medium" ? "bg-amber-500"
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

function ReportDetail({
  report, empMap, onClose,
}: {
  report: Report;
  empMap: Map<string, DemoEmployee>;
  onClose: () => void;
}) {
  const reporter = report.reporter_id ? empMap.get(report.reporter_id) : null;

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{report.number}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", CATEGORY_TONE[report.category])}>
                {CATEGORY_LABEL[report.category]}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", SEVERITY_TONE[report.severity])}>
                重大度 {SEVERITY_LABEL[report.severity]}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", STATUS_TONE[report.status])}>
                {STATUS_LABEL[report.status]}
              </span>
              {report.is_anonymous && (
                <Badge variant="secondary" className="text-[10px]">
                  <Lock className="mr-0.5 size-2.5" />
                  匿名
                </Badge>
              )}
            </div>
            <SheetTitle className="mt-2 text-lg font-bold">{report.subject}</SheetTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        {/* メタ */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">通報者</div>
            <div className="mt-0.5 font-medium">
              {report.is_anonymous ? "匿名" : reporter?.full_name ?? "—"}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">受付</div>
            <div className="mt-0.5 font-medium">{relativeTime(report.created_at)}</div>
          </div>
        </div>

        {/* ステータス変更 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["received", "triaging", "investigating", "escalated", "resolved", "closed"] as ReportStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => toast.success(`ステータスを「${STATUS_LABEL[s]}」に変更`)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                report.status === s ? STATUS_TONE[s] + " ring-2 ring-offset-1" : "hover:bg-accent",
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* 通報内容 */}
        <Section title="通報内容" icon={ScrollText}>
          <p className="whitespace-pre-wrap rounded-md border bg-card p-3 text-sm leading-relaxed">
            {report.body}
          </p>
        </Section>

        {/* 関連情報 */}
        <Section title="関連情報" icon={FileText}>
          <ul className="space-y-1.5">
            {report.involved_party_role && (
              <Row label="対象者の役職">{report.involved_party_role}</Row>
            )}
            {report.desired_outcome && (
              <Row label="望む対応">{report.desired_outcome}</Row>
            )}
            {report.contact_method && (
              <Row label="連絡方法">
                {report.contact_method === "no_contact" ? "連絡不要（一方向通報）" : report.contact_method}
              </Row>
            )}
            <Row label="振り分け先">
              <div className="flex flex-wrap gap-1">
                {report.triaged_to.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {t === "hr" ? "HR" : t === "legal" ? "法務" : t === "executive" ? "経営" : "外部弁護士"}
                  </Badge>
                ))}
              </div>
            </Row>
          </ul>
        </Section>

        {/* 通報者へのフィードバック */}
        {report.reporter_visible_summary && (
          <Section title="通報者宛フィードバック" icon={MessageSquare}>
            <div className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3 text-sm">
              <p className="text-emerald-900">{report.reporter_visible_summary}</p>
            </div>
          </Section>
        )}

        {/* 調査メモ */}
        <Section title={`調査メモ（${report.investigation_notes.length}）`} icon={Lock}>
          <ul className="space-y-2">
            {report.investigation_notes.map((n) => {
              const author = empMap.get(n.author_id);
              return (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-md border p-3 text-sm",
                    n.is_confidential ? "border-amber-200 bg-amber-50/40" : "bg-card",
                  )}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Avatar className="size-5"><AvatarFallback className="text-[8px]">{author ? initials(author.full_name) : "—"}</AvatarFallback></Avatar>
                    <span className="font-medium">{author?.full_name ?? "—"}</span>
                    <span className="text-muted-foreground">{relativeTime(n.created_at)}</span>
                    {n.is_confidential && (
                      <Badge variant="warning" className="text-[10px]">
                        <Lock className="mr-0.5 size-2.5" />
                        機密
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap">{n.body}</p>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 rounded-md border-2 border-dashed bg-card p-3">
            <textarea
              rows={3}
              placeholder="調査メモを追加..."
              className="w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-2 flex items-center justify-between">
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input type="checkbox" defaultChecked />
                機密扱い（社内も限定アクセス）
              </label>
              <Button size="sm" onClick={() => toast.success("調査メモを追加しました")} className="gap-1.5">
                <Send className="size-3.5" />
                メモを追加
              </Button>
            </div>
          </div>
        </Section>

        {/* 重大事案エスカレーション */}
        {report.severity === "critical" && (
          <div className="rounded-md border-2 border-red-300 bg-red-50/40 p-3 text-sm">
            <h4 className="flex items-center gap-1.5 font-semibold text-red-900">
              <ShieldAlert className="size-4" />
              最重要案件 — 社外調査委託済
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              本案件は外部弁護士事務所に独立調査を委託しています。社内関係者の閲覧は厳格に制限されます。
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function Section({
  title, icon: Icon, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-right">{children}</span>
    </li>
  );
}

function SubmitDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [category, setCategory] = useState<ReportCategory>("harassment");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [contactMethod, setContactMethod] = useState<"email" | "slack" | "no_contact">("no_contact");

  const submit = () => {
    if (!subject || body.length < 30) {
      toast.error("件名と詳細（30文字以上）を入力してください");
      return;
    }
    toast.success("通報を受付しました", {
      description: isAnonymous
        ? "匿名通報として処理されます。24時間以内にステータスを更新します。"
        : "受付確認をお送りします。HR/法務で慎重に対応します。",
    });
    setSubject(""); setBody(""); setIsAnonymous(true); setContactMethod("no_contact");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-purple-700" />
            新規通報
          </DialogTitle>
          <DialogDescription>
            あなたの安全とプライバシーを最優先に対応します。匿名通報も可能です。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 匿名/記名 */}
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="text-xs font-semibold">通報方法</div>
            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent/30">
                <input type="radio" checked={isAnonymous} onChange={() => setIsAnonymous(true)} className="mt-0.5" />
                <div>
                  <div className="font-medium">匿名で通報</div>
                  <div className="text-xs text-muted-foreground">
                    身元情報は一切記録されません。経過は ID 経由で確認可能。
                  </div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent/30">
                <input type="radio" checked={!isAnonymous} onChange={() => setIsAnonymous(false)} className="mt-0.5" />
                <div>
                  <div className="font-medium">記名で通報</div>
                  <div className="text-xs text-muted-foreground">
                    HR/法務との直接コミュニケーションが可能。情報は厳密に管理。
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">カテゴリ</label>
            <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABEL) as ReportCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">件名</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例: 上司からの不適切な発言について"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">詳細（30文字以上）</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="事実関係、いつ・どこで・誰が、どのような状況だったかをできる範囲でお書きください。"
              className="w-full rounded-md border bg-transparent p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="text-right text-[10px] text-muted-foreground">{body.length} 文字</div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">フィードバック方法</label>
            <Select value={contactMethod} onValueChange={(v) => setContactMethod(v as typeof contactMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no_contact">連絡不要（一方向通報）</SelectItem>
                <SelectItem value="email">メールで連絡</SelectItem>
                <SelectItem value="slack">Slack DM で連絡</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <Shield className="mb-1 inline size-3.5" />{" "}
            この通報内容は HR・法務の指定担当者のみアクセス可能です。報復行為は厳正に対処します。
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={submit} className="gap-1.5">
            <Send className="size-4" />
            通報を送信
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
