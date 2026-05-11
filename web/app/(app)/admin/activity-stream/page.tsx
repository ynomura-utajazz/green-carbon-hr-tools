"use client";

/**
 * /admin/activity-stream — Activity Log v2
 *
 * 統合監査タイムライン：audit_logs + ai_usage_log + user_actions を 1 本に。
 *  - カテゴリ／重大度／アクター／全文検索でフィルタ
 *  - イベント詳細ドロワー（diff / token / metadata 全表示）
 *  - CSV エクスポート（ブラウザ完結）
 *
 * 既存の /admin/audit-log は table-only ビュー、こちらが統合タイムライン。
 * 経営層・HR 管理者向け。
 */

import { useMemo, useState } from "react";
import {
  ScrollText, Filter, Download, Search, ChevronRight,
  ShieldAlert, Sparkles, MousePointerClick, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  DEMO_ACTIVITY, CATEGORY_META, SEVERITY_META,
  type ActivityEvent, type ActivityCategory, type ActivitySeverity,
} from "@/lib/demo/activity-stream";
import { filterActivity, summarizeActivity, activityToCsv } from "@/lib/activity";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CATEGORY_ICON: Record<ActivityCategory, typeof ScrollText> = {
  audit: ShieldAlert,
  ai:    Sparkles,
  user:  MousePointerClick,
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = (now - d.getTime()) / 60_000;
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${Math.floor(diffMin)} 分前`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)} 時間前`;
  return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "medium" });

export default function ActivityStreamPage() {
  const [cat, setCat] = useState<ActivityCategory | "all">("all");
  const [sev, setSev] = useState<ActivitySeverity | "all">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ActivityEvent | null>(null);

  const filtered = useMemo(
    () => filterActivity(DEMO_ACTIVITY, { category: cat, severity: sev, query: q }),
    [cat, sev, q],
  );

  // ── KPI ──（純粋関数で集計、テスト可能）
  const summary = useMemo(() => summarizeActivity(DEMO_ACTIVITY), []);
  const total = summary.total;
  const aiCount = summary.byCategory.ai;
  const auditCount = summary.byCategory.audit;
  const destructive = summary.destructiveCount;

  const exportCsv = () => {
    const csv = activityToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-stream-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} 件を CSV ダウンロード`);
  };

  return (
    <div className="space-y-5">
      {/* ヘッダ */}
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ScrollText className="size-6 text-gc-700" />
            Activity Log v2
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            audit_logs + ai_usage_log + ユーザー操作を 1 本のタイムラインに統合。
            HR 管理者・経営層向け監査ビュー
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-1.5">
          <Download className="size-4" />
          CSV エクスポート
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="総イベント" value={total} unit="件" />
        <Kpi label="AI 利用" value={aiCount} unit="件" tone="violet" />
        <Kpi label="監査記録" value={auditCount} unit="件" tone="blue" />
        <Kpi label="破壊的操作" value={destructive} unit="件" tone={destructive > 0 ? "red" : "muted"} />
      </div>

      {/* フィルタ */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="size-3.5" />
            <span>絞り込み</span>
            <span className="ml-auto font-mono tabular-nums">
              {filtered.length} / {total} 件
            </span>
          </div>

          {/* カテゴリ */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={cat === "all"} onClick={() => setCat("all")}>すべて</FilterChip>
            {(Object.keys(CATEGORY_META) as ActivityCategory[]).map((c) => (
              <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
                <span>{CATEGORY_META[c].emoji}</span>
                {CATEGORY_META[c].label}
              </FilterChip>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            <FilterChip active={sev === "all"} onClick={() => setSev("all")}>全重大度</FilterChip>
            {(Object.keys(SEVERITY_META) as ActivitySeverity[]).map((s) => (
              <FilterChip key={s} active={sev === s} onClick={() => setSev(s)}>
                <span className={cn("size-1.5 rounded-full", {
                  info: "bg-muted-foreground",
                  notice: "bg-blue-600",
                  warn: "bg-amber-600",
                  destructive: "bg-red-600",
                }[s])} />
                {SEVERITY_META[s].label}
              </FilterChip>
            ))}
          </div>

          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="アクター名・対象・サマリで検索..."
              className="pl-8 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* タイムライン + 詳細 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* タイムライン */}
        <Card className={cn("lg:col-span-2", selected ? "" : "lg:col-span-3")}>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                該当するイベントがありません
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((e) => {
                  const cm = CATEGORY_META[e.category];
                  const sm = SEVERITY_META[e.severity];
                  const Icon = CATEGORY_ICON[e.category];
                  const isActive = selected?.id === e.id;
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => setSelected(isActive ? null : e)}
                        className={cn(
                          "group flex w-full items-start gap-3 p-3 text-left transition-colors",
                          isActive ? "bg-gc-50" : "hover:bg-accent",
                        )}
                      >
                        <span className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border",
                          cm.cls,
                        )}>
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold">{e.actor}</span>
                            <Badge variant="outline" className="px-1 py-0 text-[9px] font-normal">
                              {e.action}
                            </Badge>
                            <span className={cn("text-[10px]", sm.cls)}>{sm.label}</span>
                            <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">
                              {fmtTime(e.occurred_at)}
                            </span>
                          </div>
                          <div className="mt-0.5 text-sm">{e.summary}</div>
                          <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                            {e.target}
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
                          isActive && "rotate-90",
                        )} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 詳細パネル */}
        {selected && (
          <Card className="lg:col-span-1">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <span>{CATEGORY_META[selected.category].emoji}</span>
                  <h3 className="font-semibold text-sm">{selected.summary}</h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent"
                  aria-label="閉じる"
                >
                  <X className="size-4" />
                </button>
              </div>

              <dl className="space-y-1.5 text-xs">
                <Row label="ID" value={<code className="font-mono">{selected.id}</code>} />
                <Row label="発生時刻" value={fmtFull(selected.occurred_at)} />
                <Row label="アクター" value={`${selected.actor}${selected.actor_role ? ` (${selected.actor_role})` : ""}`} />
                <Row label="アクション" value={<code className="font-mono">{selected.action}</code>} />
                <Row label="対象" value={<code className="font-mono break-all">{selected.target}</code>} />
                <Row label="重大度" value={
                  <span className={SEVERITY_META[selected.severity].cls}>
                    {SEVERITY_META[selected.severity].label}
                  </span>
                } />
              </dl>

              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div>
                  <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    メタデータ
                  </h4>
                  <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-[10px] leading-relaxed">
{JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selected.severity === "destructive" && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] leading-relaxed text-red-900">
                  ⚠️ <strong>破壊的操作</strong>として記録されています。30 日以上経過しても削除されません（GDPR 例外）
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 説明 */}
      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 <strong>3 ソース統合：</strong>
        <code className="font-mono">audit_logs</code>（人 + システムによる行レベル変更）・
        <code className="font-mono">ai_usage_log</code>（Claude / Whisper 呼び出し）・
        <code className="font-mono">user_actions</code>（ログイン・エクスポート等）を
        共通スキーマに正規化。本番では Supabase の <code className="font-mono">marts.v_activity_stream</code>
        ビューに集約されます。
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  );
}

function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-gc-400 bg-gc-50 text-gc-900"
          : "border-border bg-background text-muted-foreground hover:border-gc-300 hover:bg-gc-50/30",
      )}
    >
      {children}
    </button>
  );
}

function Kpi({
  label, value, unit, tone,
}: {
  label: string; value: string | number; unit: string;
  tone?: "violet" | "blue" | "red" | "muted";
}) {
  const cls = {
    violet: "border-violet-200 bg-violet-50/40",
    blue:   "border-blue-200 bg-blue-50/40",
    red:    "border-red-200 bg-red-50/40",
    muted:  "",
  }[tone ?? "muted"];
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
