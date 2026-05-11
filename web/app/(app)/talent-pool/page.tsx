"use client";

/**
 * /talent-pool
 *
 * タレントプール CRM。
 *
 * 構成：
 *  1. 種別タブ（全件 / アルムナイ / 銀メダル / カジュアル / 過去応募者）
 *  2. KPI（合計、Open シグナル数、未接触数、再アクティベ可能数）
 *  3. 検索 + フィルター（ステータス、シグナル、経過月数）
 *  4. テーブル（候補者リスト）→ 行クリックで詳細パネル + AI 再アプローチ生成
 */

import { useMemo, useState } from "react";
import { Users2, Search, Mail, Linkedin, MessageSquare, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiGeneratePanel } from "@/components/ai-generate-panel";
import {
  DEMO_TALENT_POOL, KIND_LABEL, KIND_COLOR, STATUS_LABEL, STATUS_COLOR, SIGNAL_COLOR,
  type TalentPoolEntry, type TalentKind,
} from "@/lib/demo/talent-pool";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KIND_TABS: { id: TalentKind | "all"; label: string }[] = [
  { id: "all",            label: "全件" },
  { id: "alumni",         label: "アルムナイ" },
  { id: "silver_medal",   label: "銀メダル" },
  { id: "casual",         label: "カジュアル面談" },
  { id: "past_applicant", label: "過去応募者" },
];

const monthsAgo = (iso: string) =>
  Math.round((Date.now() - new Date(iso).getTime()) / (30.44 * 86_400_000));

export default function TalentPoolPage() {
  const [tab, setTab] = useState<TalentKind | "all">("all");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [signal, setSignal] = useState<string>("all");
  const [selected, setSelected] = useState<TalentPoolEntry | null>(null);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return DEMO_TALENT_POOL.filter((e) => {
      if (tab !== "all" && e.kind !== tab) return false;
      if (status !== "all" && e.status !== status) return false;
      if (signal !== "all" && e.open_signal !== signal) return false;
      if (qq) {
        const hay = [
          e.full_name, e.display_name_en, e.email, e.current_role, e.current_company,
          ...e.skills, ...e.tags, e.location, e.notes,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [tab, q, status, signal]);

  const stats = useMemo(() => ({
    total: DEMO_TALENT_POOL.length,
    open: DEMO_TALENT_POOL.filter((e) => e.open_signal === "open").length,
    cold: DEMO_TALENT_POOL.filter((e) => e.status === "cold").length,
    engaged: DEMO_TALENT_POOL.filter((e) => e.status === "engaged" || e.status === "warm").length,
  }), []);

  const ownerOf = (id?: string) =>
    id ? DEMO_EMPLOYEES.find((e) => e.id === id) : undefined;

  return (
    <div className="space-y-5">
      {/* ヘッダ */}
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users2 className="size-6 text-gc-700" />
          タレントプール CRM
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          過去応募者・アルムナイ・カジュアル面談者・銀メダルを再アクティベートする統合 CRM
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="プール総数" value={stats.total} unit="名" />
        <Kpi label="🔥 Open to Work" value={stats.open} unit="名" tone="success" />
        <Kpi label="未接触" value={stats.cold} unit="名" tone="warn" />
        <Kpi label="対話中" value={stats.engaged} unit="名" tone="primary" />
      </div>

      {/* タブ */}
      <div className="flex flex-wrap gap-1.5">
        {KIND_TABS.map((t) => {
          const count = t.id === "all"
            ? DEMO_TALENT_POOL.length
            : DEMO_TALENT_POOL.filter((e) => e.kind === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                tab === t.id
                  ? "border-gc-600 bg-gc-600 text-white font-semibold"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {t.label}
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 font-mono text-[9px] tabular-nums">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="名前・スキル・会社・タグ..."
            className="h-8 w-64 pl-8 text-sm"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ステータス</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={signal} onValueChange={setSignal}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全シグナル</SelectItem>
            <SelectItem value="open">🔥 Open to Work</SelectItem>
            <SelectItem value="passive">Passive</SelectItem>
            <SelectItem value="not_looking">Not looking</SelectItem>
            <SelectItem value="unknown">不明</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} 件 / 全 {DEMO_TALENT_POOL.length}
        </span>
      </div>

      {/* テーブル */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              該当する候補者がいません
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((e) => {
                const m = monthsAgo(e.last_event_at);
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => setSelected(e)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs">{initials(e.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{e.full_name}</span>
                          <Badge variant="outline" className={cn("border text-[10px]", KIND_COLOR[e.kind])}>
                            {KIND_LABEL[e.kind]}
                          </Badge>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", STATUS_COLOR[e.status])}>
                            {STATUS_LABEL[e.status]}
                          </span>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", SIGNAL_COLOR[e.open_signal])}>
                            {e.open_signal === "open" ? "🔥 Open" :
                              e.open_signal === "passive" ? "Passive" :
                              e.open_signal === "not_looking" ? "Not looking" : "?"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {e.current_role} @ {e.current_company} · {e.location}
                        </div>
                        <div className="mt-1 line-clamp-1 text-xs">
                          {e.last_event_summary}
                          <span className="ml-2 text-[10px] text-muted-foreground">{m} ヶ月前</span>
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

      {/* 詳細サイドパネル */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <DetailPanel entry={selected} owner={ownerOf(selected.owner_employee_id)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Kpi({ label, value, unit, tone }: {
  label: string; value: number; unit: string;
  tone?: "primary" | "success" | "warn";
}) {
  const cls =
    tone === "success" ? "border-emerald-200 bg-emerald-50/40" :
    tone === "warn" ? "border-amber-200 bg-amber-50/40" :
    tone === "primary" ? "border-gc-200 bg-gc-50/40" : "";
  return (
    <Card className={cn(cls)}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailPanel({
  entry, owner,
}: {
  entry: TalentPoolEntry;
  owner?: typeof DEMO_EMPLOYEES[number];
}) {
  const [channel, setChannel] = useState<"email" | "linkedin_dm" | "slack">("email");
  const months_since = monthsAgo(entry.last_event_at);

  return (
    <div className="space-y-4 p-4">
      <SheetTitle className="sr-only">{entry.full_name}</SheetTitle>

      {/* ヘッダ */}
      <div className="flex items-start gap-3">
        <Avatar className="size-12">
          <AvatarFallback>{initials(entry.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-lg font-bold">{entry.full_name}</h2>
            <Badge variant="outline" className={cn("border text-[10px]", KIND_COLOR[entry.kind])}>
              {KIND_LABEL[entry.kind]}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {entry.current_role} @ {entry.current_company}
          </div>
          <div className="text-xs text-muted-foreground">
            {entry.location} · 経験 {entry.years_of_experience ?? "?"} 年
          </div>
        </div>
      </div>

      {/* メタ情報 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ステータス</div>
          <div className="mt-0.5 font-medium">{STATUS_LABEL[entry.status]}</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">経過</div>
          <div className="mt-0.5 font-medium tabular-nums">{months_since} ヶ月前</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">シグナル</div>
          <div className="mt-0.5 font-medium">
            {entry.open_signal === "open" ? "🔥 Open to Work" :
             entry.open_signal === "passive" ? "Passive" :
             entry.open_signal === "not_looking" ? "Not looking" : "不明"}
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">担当</div>
          <div className="mt-0.5 font-medium truncate">
            {owner?.full_name ?? "—"}
          </div>
        </div>
      </div>

      {/* 過去の出来事 */}
      <div className="rounded-md border bg-amber-50/40 p-3">
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <RefreshCw className="size-3" />
          最後の接点
        </div>
        <p className="text-sm leading-relaxed">{entry.last_event_summary}</p>
      </div>

      {/* スキル */}
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">スキル</div>
        <div className="flex flex-wrap gap-1">
          {entry.skills.map((s) => (
            <span key={s} className="rounded-full border bg-background px-2 py-0.5 text-[11px]">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* タグ */}
      {entry.tags.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">タグ</div>
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((t) => (
              <span key={t} className="rounded bg-gc-50 px-1.5 py-0.5 text-[11px] text-gc-800">
                #{t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* メモ */}
      {entry.notes && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">担当メモ</div>
          <p className="rounded-md border bg-background p-2 text-sm leading-relaxed">
            {entry.notes}
          </p>
        </div>
      )}

      {/* AI 再アクティベートメッセージ生成 */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-semibold">AI 再アプローチ生成</span>
          <div className="flex gap-1">
            {([
              { id: "email" as const, icon: Mail, label: "メール" },
              { id: "linkedin_dm" as const, icon: Linkedin, label: "LinkedIn" },
              { id: "slack" as const, icon: MessageSquare, label: "Slack" },
            ]).map((c) => (
              <button
                key={c.id}
                onClick={() => setChannel(c.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                  channel === c.id
                    ? "border-gc-500 bg-gc-50 text-gc-800 font-semibold"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                <c.icon className="size-3" />
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <AiGeneratePanel
          key={channel}
          title={`${channel === "email" ? "メール" : channel === "linkedin_dm" ? "LinkedIn DM" : "Slack DM"} 下書き`}
          endpoint="/api/ai/talent-pool-message"
          buttonLabel="メッセージを生成"
          hint="経過月数 / 種別 / 過去の接点 を踏まえた再アプローチ文を作成します"
          payload={() => ({
            candidate_name: entry.full_name,
            kind: entry.kind,
            current_role: entry.current_role,
            current_company: entry.current_company,
            past_event: entry.last_event_summary,
            months_since,
            owner_name: owner?.full_name,
            channel,
          })}
        />
      </div>

      {entry.open_signal === "not_looking" && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          現職に満足している方です。強引な勧誘を避け、ライトな近況連絡から始めましょう。
        </div>
      )}
    </div>
  );
}
