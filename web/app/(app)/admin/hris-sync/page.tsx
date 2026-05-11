"use client";

/**
 * /admin/hris-sync
 *
 * HRIS（BambooHR / Workday）双方向同期管理。
 *  - 接続状態
 *  - フィールドマッピング
 *  - 同期実行ログ
 *  - 手動同期トリガ
 */

import { useState } from "react";
import {
  Database, RefreshCw, ArrowLeftRight, ArrowRight, ArrowLeft, CheckCircle2,
  AlertTriangle, XCircle, ExternalLink, Play,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_HRIS_CONNECTIONS, DEMO_BAMBOOHR_MAPPINGS, DEMO_SYNC_RUNS, PROVIDER_META,
  type HrisConnection,
} from "@/lib/integrations/hris";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_META = {
  ok:      { Icon: CheckCircle2, cls: "text-emerald-600",  label: "成功" },
  partial: { Icon: AlertTriangle, cls: "text-amber-700",   label: "部分成功" },
  error:   { Icon: XCircle,       cls: "text-red-600",     label: "失敗" },
} as const;

const fmt = (iso: string) => new Date(iso).toLocaleString("ja-JP", {
  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

export default function HrisSyncPage() {
  const [connections, setConnections] = useState<HrisConnection[]>(DEMO_HRIS_CONNECTIONS);

  const triggerSync = (conn: HrisConnection) => {
    const meta = PROVIDER_META[conn.provider];
    if (conn.status !== "connected") {
      toast.error(`${meta.label} は未接続です`);
      return;
    }
    toast.success(`${meta.label} の同期を開始しました（demo）`);
    setConnections(connections.map((c) =>
      c.provider === conn.provider ? { ...c, last_sync_at: new Date().toISOString() } : c
    ));
  };

  const total = connections.length;
  const connected = connections.filter((c) => c.status === "connected").length;
  const totalSyncs = DEMO_SYNC_RUNS.length;
  const successfulSyncs = DEMO_SYNC_RUNS.filter((r) => r.status === "ok").length;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Database className="size-6 text-gc-700" />
          HRIS 双方向同期
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          BambooHR / Workday との社員マスタ・評価・給与データの双方向同期
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="接続中" value={`${connected}/${total}`} unit="" tone={connected === total ? "ok" : "warn"} />
        <Kpi label="累計同期" value={totalSyncs} unit="回" />
        <Kpi label="成功率" value={`${Math.round((successfulSyncs / totalSyncs) * 100)}%`} unit="" tone="ok" />
        <Kpi label="次回自動同期" value="6h 後" unit="" />
      </div>

      {/* 接続状態 */}
      <div className="grid gap-3 lg:grid-cols-2">
        {connections.map((c) => {
          const meta = PROVIDER_META[c.provider];
          return (
            <Card key={c.provider} className={cn("border", meta.cls)}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{meta.logoChar}</span>
                    <div>
                      <div className="font-bold">{meta.label}</div>
                      {c.config.bamboohr && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {c.config.bamboohr.subdomain}.bamboohr.com
                        </div>
                      )}
                      {c.config.workday && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          tenant: {c.config.workday.tenant}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={c.status === "connected" ? "success" : c.status === "error" ? "danger" : "outline"} className="text-[10px]">
                    {c.status === "connected" ? "接続中" : c.status === "error" ? "エラー" : "未接続"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/30 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">同期方向</div>
                    <div className="mt-0.5 font-medium">
                      {c.sync_direction === "bidirectional" ? "↔ 双方向" :
                       c.sync_direction === "inbound_only" ? "← inbound のみ" : "→ outbound のみ"}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">最終同期</div>
                    <div className="mt-0.5 font-mono text-[11px]">
                      {c.last_sync_at ? fmt(c.last_sync_at) : "—"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => triggerSync(c)}
                    disabled={c.status !== "connected"}
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                  >
                    <Play className="size-3" />
                    今すぐ同期
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                    <a href={meta.doc_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3" />
                      API ドキュメント
                    </a>
                  </Button>
                  {c.status !== "connected" && (
                    <Button asChild variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                      <a href="/admin/integrations">接続設定</a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* フィールドマッピング */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <ArrowLeftRight className="size-4 text-gc-700" />
            BambooHR フィールドマッピング
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-1.5 text-left font-semibold">自社（Supabase）</th>
                  <th className="px-2 py-1.5 text-center font-semibold w-20">方向</th>
                  <th className="px-2 py-1.5 text-left font-semibold">BambooHR</th>
                  <th className="px-2 py-1.5 text-left font-semibold">変換ルール</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_BAMBOOHR_MAPPINGS.map((m) => (
                  <tr key={m.internal} className="border-b last:border-b-0">
                    <td className="px-2 py-1.5 font-mono text-[11px]">{m.internal}</td>
                    <td className="px-2 py-1.5 text-center">
                      {m.direction === "bidirectional" ? <ArrowLeftRight className="mx-auto size-3.5 text-gc-700" /> :
                       m.direction === "inbound" ? <ArrowLeft className="mx-auto size-3.5 text-blue-600" /> :
                                                    <ArrowRight className="mx-auto size-3.5 text-amber-600" />}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[11px]">{m.external}</td>
                    <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{m.transform ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
            <span className="inline-flex items-center gap-1"><ArrowLeftRight className="size-3 text-gc-700" /> 双方向</span>
            <span className="inline-flex items-center gap-1"><ArrowLeft className="size-3 text-blue-600" /> HRIS → 自社（inbound）</span>
            <span className="inline-flex items-center gap-1"><ArrowRight className="size-3 text-amber-600" /> 自社 → HRIS（outbound）</span>
          </div>
        </CardContent>
      </Card>

      {/* 同期ログ */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <RefreshCw className="size-4 text-gc-700" />
              同期実行ログ
            </h2>
          </div>
          <ul className="divide-y">
            {DEMO_SYNC_RUNS.map((r) => {
              const meta = STATUS_META[r.status];
              const provMeta = PROVIDER_META[r.provider];
              return (
                <li key={r.id} className="px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <meta.Icon className={cn("size-3.5 shrink-0", meta.cls)} />
                    <span className="text-base">{provMeta.logoChar}</span>
                    <span className="font-medium">{provMeta.label}</span>
                    <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">{fmt(r.ran_at)}</span>
                    <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                      {r.duration_sec}s · ↓{r.inbound_count} · ↑{r.outbound_count}
                      {r.conflicts > 0 && ` · ⚠️${r.conflicts}`}
                    </span>
                  </div>
                  {r.error_message && (
                    <div className="mt-1 rounded-md bg-amber-50 p-2 text-[11px] text-amber-900">
                      {r.error_message}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 <strong>同期ポリシー：</strong>毎日 04:00 JST に inbound（HRIS → 自社）→ 06:00 に outbound（自社 → HRIS）。
        コンフリクト発生時は <strong>BambooHR を信頼源</strong>として優先（hire_date / status）、
        評価系（1on1・OKR）は <strong>自社を信頼源</strong>としてマージします。
      </div>
    </div>
  );
}

function Kpi({ label, value, unit, tone }: {
  label: string; value: string | number; unit: string;
  tone?: "ok" | "warn";
}) {
  return (
    <Card className={cn(
      tone === "ok" ? "border-emerald-200 bg-emerald-50/40" :
      tone === "warn" ? "border-amber-200 bg-amber-50/40" : "",
    )}>
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
