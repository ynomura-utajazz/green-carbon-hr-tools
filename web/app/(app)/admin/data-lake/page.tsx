"use client";

/**
 * /admin/data-lake
 *
 * dbt モデルレジストリ + 直近 build ログ + KPI プレビュー。
 *
 * 本番では `dbt run` の結果（target/run_results.json）と Supabase の
 * `marts.kpi_*` ビューを参照。デモではモックデータ。
 */

import { useState } from "react";
import {
  Database, Play, Clock, CheckCircle2, XCircle, BarChart3,
  AlertTriangle, GitBranch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ModelStatus = "ok" | "warn" | "error" | "skipped";

const MODELS = [
  { name: "stg_employees",            type: "staging", status: "ok" as ModelStatus,    rows: 287, runtime_sec: 2.3 },
  { name: "stg_oneonones",            type: "staging", status: "ok" as ModelStatus,    rows: 1842, runtime_sec: 1.8 },
  { name: "stg_candidates",           type: "staging", status: "ok" as ModelStatus,    rows: 326, runtime_sec: 0.9 },
  { name: "stg_ai_usage_log",         type: "staging", status: "ok" as ModelStatus,    rows: 4129, runtime_sec: 3.1 },
  { name: "kpi_attrition_monthly",    type: "mart",    status: "ok" as ModelStatus,    rows: 25,   runtime_sec: 4.2 },
  { name: "kpi_engagement_by_dept",   type: "mart",    status: "ok" as ModelStatus,    rows: 168,  runtime_sec: 3.5 },
  { name: "kpi_recruiting_funnel",    type: "mart",    status: "ok" as ModelStatus,    rows: 96,   runtime_sec: 5.8 },
  { name: "kpi_ai_usage_cost",        type: "mart",    status: "ok" as ModelStatus,    rows: 30,   runtime_sec: 1.2 },
  { name: "kpi_diversity_pipeline",   type: "mart",    status: "warn" as ModelStatus,  rows: 5,    runtime_sec: 2.1 },
  { name: "kpi_team_health_index",    type: "mart",    status: "ok" as ModelStatus,    rows: 14,   runtime_sec: 6.4 },
] as const;

const RUN_LOGS = [
  { id: "r1", started: "03:00", duration: "2m 14s", status: "ok",      models: 24, errors: 0, ts: "今朝" },
  { id: "r2", started: "昨日",   duration: "2m 8s",  status: "warn",   models: 24, errors: 1, ts: "昨日 03:00" },
  { id: "r3", started: "2 日前", duration: "2m 12s", status: "ok",     models: 24, errors: 0, ts: "2 日前 03:00" },
  { id: "r4", started: "3 日前", duration: "Failed", status: "error",  models: 8,  errors: 16, ts: "3 日前 03:00" },
];

// ── サンプル KPI クエリ結果（プレビュー用） ─────────
const SAMPLE_ATTRITION = [
  { month: "2025-09", rate: 0.082, ttm: 0.094 },
  { month: "2025-10", rate: 0.071, ttm: 0.092 },
  { month: "2025-11", rate: 0.103, ttm: 0.095 },
  { month: "2025-12", rate: 0.115, ttm: 0.097 },
  { month: "2026-01", rate: 0.088, ttm: 0.099 },
  { month: "2026-02", rate: 0.092, ttm: 0.097 },
  { month: "2026-03", rate: 0.078, ttm: 0.094 },
  { month: "2026-04", rate: 0.085, ttm: 0.092 },
  { month: "2026-05", rate: 0.067, ttm: 0.089 },
];

const STATUS_META: Record<ModelStatus, { Icon: typeof CheckCircle2; cls: string; label: string }> = {
  ok:      { Icon: CheckCircle2,  cls: "text-emerald-600",  label: "成功" },
  warn:    { Icon: AlertTriangle, cls: "text-amber-700",    label: "警告" },
  error:   { Icon: XCircle,       cls: "text-red-600",      label: "失敗" },
  skipped: { Icon: Clock,         cls: "text-muted-foreground", label: "スキップ" },
};

export default function DataLakePage() {
  const [running, setRunning] = useState(false);

  const triggerBuild = () => {
    setRunning(true);
    toast.success("dbt run を開始しました（demo）");
    setTimeout(() => {
      setRunning(false);
      toast.success("✅ 24 モデル全て成功（デモ）");
    }, 2000);
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Database className="size-6 text-gc-700" />
            データレイクハウス
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            dbt モデル × Supabase で全 HR ツールのデータを統合。経営 KPI を時系列で SQL 化
          </p>
        </div>
        <Button onClick={triggerBuild} disabled={running} className="gap-1.5">
          <Play className="size-4" />
          {running ? "実行中..." : "今すぐ dbt run"}
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="モデル数" value={MODELS.length} unit="本" tone="primary" />
        <Kpi label="staging" value={MODELS.filter(m => m.type === "staging").length} unit="本" />
        <Kpi label="marts (KPI)" value={MODELS.filter(m => m.type === "mart").length} unit="本" tone="success" />
        <Kpi label="最終 build" value="03:00" unit="" hint="今朝・成功" />
      </div>

      {/* モデルレジストリ */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <GitBranch className="size-4 text-gc-700" />
              モデルレジストリ
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-1.5 text-left font-semibold">モデル</th>
                  <th className="px-3 py-1.5 text-left font-semibold">種別</th>
                  <th className="px-3 py-1.5 text-right font-semibold">行数</th>
                  <th className="px-3 py-1.5 text-right font-semibold">実行時間</th>
                  <th className="px-3 py-1.5 text-center font-semibold">状態</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => {
                  const meta = STATUS_META[m.status];
                  return (
                    <tr key={m.name} className="border-b last:border-b-0">
                      <td className="px-3 py-1.5 font-mono">{m.name}</td>
                      <td className="px-3 py-1.5">
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          m.type === "mart" && "border-emerald-300 bg-emerald-50",
                        )}>
                          {m.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">{m.rows.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                        {m.runtime_sec.toFixed(1)}s
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={cn("inline-flex items-center gap-0.5 text-[10px]", meta.cls)}>
                          <meta.Icon className="size-3" />
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 実行ログ */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="size-4 text-gc-700" />
              直近の build 履歴
            </h2>
          </div>
          <ul className="divide-y">
            {RUN_LOGS.map((r) => {
              const status = r.status as ModelStatus;
              const meta = STATUS_META[status];
              return (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <meta.Icon className={cn("size-4 shrink-0", meta.cls)} />
                  <span className="font-medium">{r.ts}</span>
                  <span className="text-xs text-muted-foreground">{r.duration}</span>
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {r.models} models
                    {r.errors > 0 && <span className="ml-2 text-red-600">⚠️ {r.errors} errors</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* KPI プレビュー */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <BarChart3 className="size-4 text-gc-700" />
            プレビュー: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">marts.kpi_attrition_monthly</code>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-2 py-1.5 text-left font-semibold">month</th>
                  <th className="px-2 py-1.5 text-right font-semibold">monthly_attrition_rate</th>
                  <th className="px-2 py-1.5 text-right font-semibold">ttm_attrition_rate</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ATTRITION.map((r) => (
                  <tr key={r.month} className="border-b last:border-b-0">
                    <td className="px-2 py-1.5 font-mono">{r.month}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{(r.rate * 100).toFixed(2)}%</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                      {(r.ttm * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            このマートは Metabase / Looker / Superset から直接参照可能。
            BI 担当者向けに `marts.kpi_*` スキーマへの read 権限を付与してください。
          </p>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 dbt プロジェクトは <code className="font-mono">web/supabase/dbt/</code> 配下。
        モデル追加 → PR → CI で <code className="font-mono">dbt test</code> 通過 → main 反映で本番に展開。
      </div>
    </div>
  );
}

function Kpi({ label, value, unit, tone, hint }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "success";
  hint?: string;
}) {
  return (
    <Card className={cn(
      tone === "primary" && "border-gc-200 bg-gc-50/40",
      tone === "success" && "border-emerald-200 bg-emerald-50/40",
    )}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
