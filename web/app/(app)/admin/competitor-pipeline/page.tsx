"use client";

/**
 * /admin/competitor-pipeline
 *
 * 競合 JD 収集ジョブの監視画面（HR/IT 管理者向け）。
 *  - ジョブ一覧（ソース・cron・最終実行・成功率）
 *  - 実行ログ（直近 6 件）
 *  - ソースごとの法令・取得方法のドキュメント
 */

import { useState } from "react";
import {
  Bot, Pause, Play, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Clock, ScrollText, Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DEMO_SCRAPE_JOBS, DEMO_RUN_LOGS, SOURCE_INFO,
  type ScrapeJob,
} from "@/lib/recruiting/competitor-pipeline";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_META = {
  ok:      { label: "成功",   cls: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  running: { label: "実行中", cls: "bg-blue-100 text-blue-800", Icon: RefreshCw },
  error:   { label: "失敗",   cls: "bg-red-100 text-red-800", Icon: XCircle },
  idle:    { label: "未実行", cls: "bg-muted text-muted-foreground", Icon: Clock },
} as const;

const fmtDate = (iso: string) => new Date(iso).toLocaleString("ja-JP", {
  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

export default function CompetitorPipelinePage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>(DEMO_SCRAPE_JOBS);

  const toggleJob = (id: string) => {
    setJobs(jobs.map((j) => j.id === id ? { ...j, enabled: !j.enabled } : j));
  };
  const runNow = (job: ScrapeJob) => {
    toast.success(`${SOURCE_INFO[job.source].label} の収集ジョブを起動しました（デモ）`);
    setJobs(jobs.map((j) => j.id === job.id ? { ...j, last_status: "running" } : j));
    setTimeout(() => {
      setJobs((prev) => prev.map((j) => j.id === job.id
        ? { ...j, last_status: "ok", last_run_at: new Date().toISOString() }
        : j));
      toast.success(`${SOURCE_INFO[job.source].label}：取得完了`);
    }, 1800);
  };

  // KPI
  const totalJobs = jobs.length;
  const enabled = jobs.filter((j) => j.enabled).length;
  const errors = jobs.filter((j) => j.last_status === "error").length;
  const totalNew = jobs.reduce((s, j) => s + j.new_jobs, 0);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bot className="size-6 text-gc-700" />
          競合 JD 収集パイプライン
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          LinkedIn / Wantedly / Indeed / 公式 career ページから競合の求人情報を定期収集
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="登録ジョブ" value={totalJobs} unit="本" />
        <Kpi label="有効" value={enabled} unit="本" tone="success" />
        <Kpi label="失敗中" value={errors} unit="本" tone={errors > 0 ? "danger" : "muted"} />
        <Kpi label="直近検出 新規 JD" value={totalNew} unit="件" tone="primary" />
      </div>

      {/* ジョブ一覧 */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <RefreshCw className="size-4 text-gc-700" />
              スクレイプジョブ
            </h2>
          </div>
          <ul className="divide-y">
            {jobs.map((j) => {
              const meta = STATUS_META[j.last_status];
              const successRate = j.last_jobs_found > 0
                ? Math.round((j.last_jobs_parsed / j.last_jobs_found) * 100)
                : 0;
              return (
                <li key={j.id} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {SOURCE_INFO[j.source].label}
                        </Badge>
                        <span className="font-medium text-sm">{j.query}</span>
                        {!j.enabled && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            一時停止中
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {j.geo} · cron <code className="font-mono">{j.schedule}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        meta.cls,
                      )}>
                        <meta.Icon className={cn("size-3", j.last_status === "running" && "animate-spin")} />
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {/* メトリクス */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric label="取得" value={j.last_jobs_found} unit="件" />
                    <Metric label="構造化" value={j.last_jobs_parsed} unit="件" hint={`成功率 ${successRate}%`} />
                    <Metric label="新規 JD" value={j.new_jobs} unit="件" tone={j.new_jobs > 0 ? "primary" : undefined} />
                    <Metric label="差分検出" value={j.changed_jobs} unit="件" tone={j.changed_jobs > 0 ? "warn" : undefined} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      最終実行: {j.last_run_at ? fmtDate(j.last_run_at) : "—"} ・
                      次回: {fmtDate(j.next_run_at)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => runNow(j)}
                        variant="outline"
                        size="sm"
                        className="h-6 gap-1 px-2 text-[11px]"
                        disabled={j.last_status === "running"}
                      >
                        <Play className="size-3" />
                        今すぐ実行
                      </Button>
                      <Button
                        onClick={() => toggleJob(j.id)}
                        variant="outline"
                        size="sm"
                        className="h-6 gap-1 px-2 text-[11px]"
                      >
                        {j.enabled ? <Pause className="size-3" /> : <Play className="size-3" />}
                        {j.enabled ? "停止" : "再開"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* 実行ログ */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <ScrollText className="size-4 text-gc-700" />
              実行ログ（直近 6 件）
            </h2>
          </div>
          <ul className="divide-y">
            {DEMO_RUN_LOGS.map((l) => {
              const job = jobs.find((j) => j.id === l.job_id);
              const meta = STATUS_META[l.status];
              return (
                <li key={l.id} className="px-3 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <meta.Icon className={cn(
                      "size-3.5 shrink-0",
                      l.status === "ok" ? "text-emerald-600" :
                      l.status === "error" ? "text-red-600" : "text-blue-600",
                    )} />
                    <span className="font-medium">{job ? SOURCE_INFO[job.source].label : l.job_id}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(l.ran_at)}</span>
                    <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                      {l.duration_sec}s · {l.jobs_parsed}/{l.jobs_found} 構造化
                    </span>
                  </div>
                  {l.error_message && (
                    <div className="mt-1 flex items-start gap-1 rounded-md bg-red-50 p-1.5 text-[11px] text-red-700">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                      <span>{l.error_message}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* ソース別ドキュメント */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Info className="size-4 text-gc-700" />
            ソース別 法令・取得方法
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(SOURCE_INFO) as Array<keyof typeof SOURCE_INFO>).map((src) => (
              <li key={src} className="rounded-md border bg-muted/30 p-3">
                <div className="font-semibold text-sm">{SOURCE_INFO[src].label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  <strong>取得方法：</strong> {SOURCE_INFO[src].api_method}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                  <strong>法令注意：</strong> {SOURCE_INFO[src].legal}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
            <strong>⚠️ 重要：</strong> 公開された求人情報の収集は基本的に問題ありませんが、
            LinkedIn のような利用規約で明示的にスクレイピングを禁止しているサイトでは、
            必ず公式 API（Talent Solutions 等）契約を行ってください。
            違反すると IP ブロック・法的措置のリスクがあります。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, unit, tone }: {
  label: string; value: number; unit: string;
  tone?: "primary" | "success" | "warn" | "danger" | "muted";
}) {
  const cls = {
    primary: "border-gc-200 bg-gc-50/40",
    success: "border-emerald-200 bg-emerald-50/40",
    warn:    "border-amber-200 bg-amber-50/40",
    danger:  "border-red-200 bg-red-50/40",
    muted:   "",
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

function Metric({ label, value, unit, hint, tone }: {
  label: string; value: number; unit: string; hint?: string;
  tone?: "primary" | "warn";
}) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-0.5">
        <span className={cn(
          "text-base font-bold tabular-nums",
          tone === "primary" && "text-gc-700",
          tone === "warn"    && "text-amber-700",
        )}>{value}</span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
      {hint && <div className="text-[9px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
