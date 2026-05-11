"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Stamp, AlertTriangle, ChevronRight, X, Calendar as CalendarIcon, FileText,
  Download, Plus, CheckCircle2, AlertCircle, Clock, Globe2,
} from "lucide-react";
import {
  type VisaRecord, type VisaUrgency, STATUS_LABEL, URGENCY_LABEL, URGENCY_TONE,
  PROGRESS_LABEL, urgencyOf, daysUntilExpiry, recordsByUrgency,
} from "@/lib/demo/visa";
import { type DemoEmployee, officeByCode } from "@/lib/demo/employees";
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

const URGENCY_ORDER: VisaUrgency[] = ["critical", "warning", "watch", "ok", "expired"];

export function VisaClient({
  records, employees,
}: {
  records: VisaRecord[];
  employees: DemoEmployee[];
}) {
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const [tab, setTab] = useState<"queue" | "all" | "by_country">("queue");
  const [selected, setSelected] = useState<VisaRecord | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<VisaUrgency | "all">("all");

  const grouped = recordsByUrgency();

  // KPI
  const critical = grouped.get("critical")?.length ?? 0;
  const warning = grouped.get("warning")?.length ?? 0;
  const total = records.length;
  const inProgress = records.filter((r) => r.renewal_progress === "documents_ready" || r.renewal_progress === "submitted").length;

  // 国別グルーピング
  const byCountry = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string; records: VisaRecord[] }>();
    for (const r of records) {
      const e = empMap.get(r.employee_id);
      if (!e) continue;
      const country = e.nationality;
      if (!map.has(country)) {
        const office = officeByCode(`${country}-XXX`);
        map.set(country, { name: country, emoji: office?.countryEmoji ?? "🌐", records: [] });
      }
      map.get(country)!.records.push(r);
    }
    return map;
  }, [records, empMap]);

  // ソート（緊急度高い順）
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const order = (u: VisaUrgency) => URGENCY_ORDER.indexOf(u);
      return order(urgencyOf(a)) - order(urgencyOf(b));
    });
  }, [records]);

  const filtered = urgencyFilter === "all"
    ? sortedRecords
    : sortedRecords.filter((r) => urgencyOf(r) === urgencyFilter);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Stamp className="size-6 text-gc-700" />
            在留資格・ビザ管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            外国籍社員 {total} 名の在留カード期限・更新状況を一元管理。
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          社員を追加
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={AlertTriangle} label="緊急（30日以内）" value={critical} unit="名" tone={critical > 0 ? "danger" : "muted"} hint="即時対応必要" onClick={() => setUrgencyFilter("critical")} disabled={critical === 0} />
        <KpiTile icon={Clock} label="警告（90日以内）" value={warning} unit="名" tone={warning > 0 ? "warning" : "muted"} hint="準備開始" onClick={() => setUrgencyFilter("warning")} disabled={warning === 0} />
        <KpiTile icon={FileText} label="申請進行中" value={inProgress} unit="件" tone="primary" hint="進捗追跡" onClick={() => setUrgencyFilter("all")} />
        <KpiTile icon={Globe2} label="管理対象" value={total} unit="名" tone="muted" hint="国別ビューへ" onClick={() => setTab("by_country")} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            <AlertTriangle className="size-3.5" />
            期限管理
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            全社員
          </TabsTrigger>
          <TabsTrigger value="by_country" className="gap-2">
            <Globe2 className="size-3.5" />
            国別
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <div className="mb-3 flex items-center gap-2">
            <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v as VisaUrgency | "all")}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全レベル</SelectItem>
                {URGENCY_ORDER.map((u) => (
                  <SelectItem key={u} value={u}>
                    {URGENCY_LABEL[u]} ({grouped.get(u)?.length ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <RecordsList records={filtered} empMap={empMap} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="all">
          <RecordsList records={sortedRecords} empMap={empMap} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="by_country">
          <div className="grid gap-3 lg:grid-cols-2">
            {[...byCountry.entries()].sort((a, b) => b[1].records.length - a[1].records.length).map(([code, data]) => (
              <Card key={code}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">{data.emoji}</span>
                    <h3 className="font-semibold">{data.name}</h3>
                    <Badge variant="outline">{data.records.length} 名</Badge>
                  </div>
                  <ul className="space-y-1.5">
                    {data.records.map((r) => {
                      const e = empMap.get(r.employee_id);
                      const u = urgencyOf(r);
                      if (!e) return null;
                      return (
                        <li key={r.employee_id}>
                          <button
                            onClick={() => setSelected(r)}
                            className="flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-accent/40"
                          >
                            <Avatar className="size-6"><AvatarFallback className="text-[9px]">{initials(e.full_name)}</AvatarFallback></Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{e.full_name}</div>
                              <div className="truncate text-[10px] text-muted-foreground">{STATUS_LABEL[r.visa_status]}</div>
                            </div>
                            <span className={cn("rounded-full border px-1.5 py-0 text-[10px]", URGENCY_TONE[u])}>
                              {daysUntilExpiry(r) >= 0 ? `${daysUntilExpiry(r)}日` : "期限切れ"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
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
  records: VisaRecord[];
  empMap: Map<string, DemoEmployee>;
  onSelect: (r: VisaRecord) => void;
}) {
  return (
    <div className="space-y-2">
      {records.map((r) => {
        const e = empMap.get(r.employee_id);
        const u = urgencyOf(r);
        const days = daysUntilExpiry(r);
        if (!e) return null;
        return (
          <Card
            key={r.employee_id}
            onClick={() => onSelect(r)}
            className={cn(
              "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
              u === "critical" && "border-red-200",
              u === "warning" && "border-amber-200",
            )}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback>{initials(e.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{e.full_name}</span>
                  {e.display_name_en && (
                    <span className="text-xs text-muted-foreground">{e.display_name_en}</span>
                  )}
                  <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", URGENCY_TONE[u])}>
                    {URGENCY_LABEL[u]}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {STATUS_LABEL[r.visa_status]} · 国籍 {e.nationality}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">期限</div>
                <div className="font-bold tabular-nums">
                  {formatDate(r.expires_at)}
                </div>
                <div className={cn(
                  "text-[10px] tabular-nums",
                  u === "critical" || u === "expired" ? "text-red-700"
                    : u === "warning" ? "text-amber-700"
                    : "text-muted-foreground",
                )}>
                  {days >= 0 ? `あと ${days} 日` : `${Math.abs(days)} 日経過`}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {PROGRESS_LABEL[r.renewal_progress]}
              </Badge>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RecordDetail({
  record, employee, onClose,
}: {
  record: VisaRecord;
  employee: DemoEmployee;
  onClose: () => void;
}) {
  const u = urgencyOf(record);
  const days = daysUntilExpiry(record);
  const office = officeByCode(employee.office_location);
  const renewalDate = new Date(record.expires_at);
  renewalDate.setDate(renewalDate.getDate() - 90);

  const docsReady = record.required_documents.filter((d) => d.status === "ready").length;
  const docsTotal = record.required_documents.length;

  return (
    <>
      <div className="sticky top-0 z-10 border-b bg-background/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-bold">{employee.full_name}</SheetTitle>
            {employee.display_name_en && (
              <div className="text-xs text-muted-foreground">{employee.display_name_en}</div>
            )}
            <div className="mt-0.5 text-sm text-muted-foreground">
              {employee.job_title} · 国籍 {employee.nationality}
              {office && ` · ${office.countryEmoji} ${office.city}`}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", URGENCY_TONE[u])}>
                {URGENCY_LABEL[u]}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {PROGRESS_LABEL[record.renewal_progress]}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="size-4" />
          </Button>
        </div>

        {/* メタ */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">残り日数</div>
            <div className={cn(
              "mt-0.5 text-2xl font-bold tabular-nums",
              u === "critical" ? "text-red-700" : u === "warning" ? "text-amber-700" : "text-foreground",
            )}>
              {days >= 0 ? days : `-${Math.abs(days)}`}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">在留資格</div>
            <div className="mt-0.5 text-xs font-medium leading-tight">{STATUS_LABEL[record.visa_status]}</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">書類</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">
              {docsReady} / {docsTotal}
            </div>
          </div>
        </div>

        {/* 連携アクション */}
        <div className="mt-3 flex flex-wrap gap-2">
          {employee.slack_user_id && (
            <Button
              size="sm"
              onClick={async () => {
                await sendSlackReminder(
                  employee.slack_user_id!,
                  `${employee.full_name} さん、在留資格の期限が ${record.expires_at} です（あと ${days} 日）。更新手続きについて打ち合わせの時間をいただけますか？`,
                );
                toast.success("更新リマインドを Slack DM で送信");
              }}
              className="gap-1.5"
            >
              <SlackIconSmall className="size-3.5" />
              更新リマインド
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
                title: `🛂 ${employee.full_name} 在留資格更新`,
                description: `${STATUS_LABEL[record.visa_status]}\n期限: ${record.expires_at}\nカード番号: ${record.card_number}\n\n申請窓口: 東京入管または地方入管`,
                start: renewalDate,
                attendees: [employee.email].filter(Boolean),
                timezone: "Asia/Tokyo",
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarIcon className="size-3.5" />
              90日前リマインドを Calendar
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success("在職証明書の PDF を生成しました（デモ）")}
            className="gap-1.5"
          >
            <FileText className="size-3.5" />
            在職証明書 生成
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* 在留情報 */}
        <Section title="在留情報">
          <Row label="在留資格">{STATUS_LABEL[record.visa_status]}</Row>
          <Row label="在留カード番号"><span className="font-mono text-xs">{record.card_number}</span></Row>
          <Row label="発行日">{formatDate(record.issued_at)}</Row>
          <Row label="有効期限">
            {formatDate(record.expires_at)}
            <span className={cn("ml-2 text-xs", u === "critical" || u === "expired" ? "text-red-700" : u === "warning" ? "text-amber-700" : "text-muted-foreground")}>
              ({days >= 0 ? `あと ${days} 日` : `${Math.abs(days)} 日経過`})
            </span>
          </Row>
        </Section>

        {/* 必要書類 */}
        {record.required_documents.length > 0 && (
          <Section title={`更新必要書類（${docsReady} / ${docsTotal} 準備済）`}>
            <ul className="space-y-1.5">
              {record.required_documents.map((d, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-card p-2 text-sm",
                    d.status === "ready" && "border-emerald-200 bg-emerald-50/40",
                    d.status === "missing" && "border-red-200 bg-red-50/40",
                  )}
                >
                  {d.status === "ready" ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : d.status === "missing" ? (
                    <AlertCircle className="size-4 text-red-600" />
                  ) : (
                    <Clock className="size-4 text-amber-600" />
                  )}
                  <span className="flex-1">{d.name}</span>
                  <Badge
                    variant={d.status === "ready" ? "success" : d.status === "missing" ? "danger" : "warning"}
                    className="text-[10px]"
                  >
                    {d.status === "ready" ? "準備済" : d.status === "missing" ? "未取得" : "準備中"}
                  </Badge>
                  {d.status === "ready" && (
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Download className="size-3" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {record.notes && (
          <Section title="メモ">
            <p className="rounded-md border bg-amber-50/40 p-3 text-sm">{record.notes}</p>
          </Section>
        )}

        {/* freee 連携ヒント */}
        <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3 text-xs">
          <p className="font-medium text-emerald-900">freee 人事労務 連携</p>
          <p className="mt-1 text-muted-foreground">
            社員マスタ・契約情報は freee と双方向同期。在留資格情報の最新更新は HR ヘルプデスクまで。
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
