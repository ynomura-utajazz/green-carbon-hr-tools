"use client";

/**
 * /interview-calibration
 *
 * 面接官の評価バイアス分析。
 *
 * 構成：
 *  1. KPI（総評価数、面接官数、全体平均、最も甘い/厳しい人）
 *  2. 面接官スコアテーブル（pattern バッジ・bias bar・hire accuracy）
 *  3. 軸別ヒートマップ（面接官 × 評価軸）
 *  4. ペア合意度マトリクス（同じ候補者の評価がどれくらい揃うか）
 *  5. 推奨アクション
 */

import { useMemo, useState } from "react";
import {
  Scale, Users2, AlertTriangle, TrendingUp, Eye, BookOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DEMO_INTERVIEW_FEEDBACK } from "@/lib/demo/interview-feedback";
import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import {
  computeInterviewerStats, computePairwiseAgreement, PATTERN_META,
  type InterviewerStat,
} from "@/lib/recruiting/calibration";
import { initials, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const AXIS_LABEL = {
  technical: "技術力",
  communication: "ｺﾐｭﾆｹｰｼｮﾝ",
  culture_fit: "カルチャー",
  leadership: "ﾘｰﾀﾞｰｼｯﾌﾟ",
} as const;

export default function InterviewCalibrationPage() {
  const [periodMonths, setPeriodMonths] = useState("12");

  const filtered = useMemo(() => {
    if (periodMonths === "all") return DEMO_INTERVIEW_FEEDBACK;
    const since = new Date();
    since.setMonth(since.getMonth() - Number(periodMonths));
    return DEMO_INTERVIEW_FEEDBACK.filter(
      (f) => new Date(f.conducted_at) >= since,
    );
  }, [periodMonths]);

  const stats = useMemo(() => computeInterviewerStats(filtered), [filtered]);
  const pairs = useMemo(() => computePairwiseAgreement(filtered), [filtered]);

  const empName = (id: string) =>
    DEMO_EMPLOYEES.find((e) => e.id === id)?.full_name ?? id;
  const empJob = (id: string) =>
    DEMO_EMPLOYEES.find((e) => e.id === id)?.job_title ?? "";

  // KPI
  const totalEval = filtered.length;
  const totalInterviewers = stats.length;
  const overallMean = filtered.length > 0
    ? filtered.reduce((s, r) => s + r.overall, 0) / filtered.length
    : 0;
  const mostLenient = [...stats].sort((a, b) => b.bias - a.bias)[0];
  const mostStrict  = [...stats].sort((a, b) => a.bias - b.bias)[0];

  // 軸別の全体平均（ヒートマップ参照値）
  const axisAvg = {
    technical:     mean(filtered.map((r) => r.technical)),
    communication: mean(filtered.map((r) => r.communication)),
    culture_fit:   mean(filtered.map((r) => r.culture_fit)),
    leadership:    mean(filtered.map((r) => r.leadership)),
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Scale className="size-6 text-gc-700" />
            面接官 Calibration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            複数面接官の評価スコアの偏り分析。甘い・厳しい・バラツキ大を検出
          </p>
        </div>
        <Select value={periodMonths} onValueChange={setPeriodMonths}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">直近 3 ヶ月</SelectItem>
            <SelectItem value="6">直近 6 ヶ月</SelectItem>
            <SelectItem value="12">直近 12 ヶ月</SelectItem>
            <SelectItem value="all">全期間</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi Icon={Eye} label="総評価数" value={totalEval} unit="件" />
        <Kpi Icon={Users2} label="面接官数" value={totalInterviewers} unit="名" />
        <Kpi Icon={TrendingUp} label="全体平均" value={overallMean.toFixed(2)} unit="/ 5" />
        <Kpi Icon={AlertTriangle} label="バイアスの幅" value={
          stats.length >= 2 ? `${(mostLenient.bias - mostStrict.bias).toFixed(2)}` : "—"
        } unit="点" tone={
          stats.length >= 2 && (mostLenient.bias - mostStrict.bias) > 1
            ? "warn" : "ok"
        } hint={
          stats.length >= 2
            ? `${empName(mostLenient.interviewer_id)} ↔ ${empName(mostStrict.interviewer_id)}`
            : undefined
        } />
      </div>

      {/* 面接官テーブル */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Users2 className="size-4 text-gc-700" />
              面接官別 スコアプロファイル
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              バイアス = 自分の平均 − 全体平均（{overallMean.toFixed(2)}）。+ なら甘め、− なら厳しめ
            </p>
          </div>
          <ul className="divide-y">
            {stats.map((s) => (
              <li key={s.interviewer_id} className="p-3">
                <InterviewerRow
                  stat={s}
                  name={empName(s.interviewer_id)}
                  job={empJob(s.interviewer_id)}
                  overallMean={overallMean}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 軸別ヒートマップ */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <Eye className="size-4 text-gc-700" />
            軸別 評価ヒートマップ
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            セルは「面接官の軸別平均 − 全体平均」。緑が高評価寄り、赤が低評価寄り
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-1.5 text-left font-semibold">面接官</th>
                  {(Object.keys(AXIS_LABEL) as (keyof typeof AXIS_LABEL)[]).map((a) => (
                    <th key={a} className="px-2 py-1.5 text-center font-semibold">
                      {AXIS_LABEL[a]}
                      <div className="font-mono text-[9px] text-muted-foreground">
                        全体 {axisAvg[a].toFixed(2)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.interviewer_id} className="border-b last:border-b-0">
                    <td className="px-2 py-1.5">
                      <div className="text-sm font-medium">{empName(s.interviewer_id)}</div>
                      <div className="text-[10px] text-muted-foreground">{empJob(s.interviewer_id)}</div>
                    </td>
                    {(Object.keys(AXIS_LABEL) as (keyof typeof AXIS_LABEL)[]).map((a) => (
                      <td key={a} className="px-1 py-1 text-center">
                        <DiffCell value={s.per_axis[a]} baseline={axisAvg[a]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ペア合意度 */}
      {pairs.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <BookOpen className="size-4 text-gc-700" />
              面接官ペア 合意度
            </h2>
            <p className="mb-3 text-[11px] text-muted-foreground">
              同じ候補者を 2 名の面接官が評価した場合の絶対差の平均。0 に近いほど合意
            </p>
            <ul className="space-y-1.5">
              {pairs.slice(0, 8).map((p) => {
                const tone = p.mean_abs_diff <= 0.7 ? "emerald"
                          : p.mean_abs_diff <= 1.4 ? "amber" : "red";
                return (
                  <li key={`${p.interviewer_a}-${p.interviewer_b}`} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Avatar className="size-5"><AvatarFallback className="text-[8px]">{initials(empName(p.interviewer_a))}</AvatarFallback></Avatar>
                      <span className="font-medium">{empName(p.interviewer_a)}</span>
                      <span className="text-muted-foreground">↔</span>
                      <Avatar className="size-5"><AvatarFallback className="text-[8px]">{initials(empName(p.interviewer_b))}</AvatarFallback></Avatar>
                      <span className="font-medium">{empName(p.interviewer_b)}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">{p.pairs} 件</span>
                      <span className={cn(
                        "font-mono font-bold tabular-nums",
                        tone === "emerald" ? "text-emerald-600" :
                        tone === "amber" ? "text-amber-700" : "text-red-700",
                      )}>
                        ±{p.mean_abs_diff.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn(
                        "h-full",
                        tone === "emerald" ? "bg-emerald-500" :
                        tone === "amber" ? "bg-amber-500" : "bg-red-500",
                      )} style={{ width: `${Math.min(100, (p.mean_abs_diff / 2) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 推奨アクション */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Scale className="size-4 text-gc-700" />
            推奨アクション
          </h2>
          <ul className="space-y-1.5 text-xs leading-relaxed">
            {mostLenient && mostLenient.bias >= 0.5 && (
              <li className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
                <span className="text-base">📈</span>
                <span>
                  <strong>{empName(mostLenient.interviewer_id)} さん</strong> は全体平均より
                  +{mostLenient.bias.toFixed(2)} 点高く採点しています。
                  <strong>後段で覆る前提</strong>で、最終判定では他面接官の評価とすり合わせを推奨。
                </span>
              </li>
            )}
            {mostStrict && mostStrict.bias <= -0.5 && (
              <li className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2">
                <span className="text-base">📉</span>
                <span>
                  <strong>{empName(mostStrict.interviewer_id)} さん</strong> は全体平均より
                  {mostStrict.bias.toFixed(2)} 点低く採点しています。
                  良い候補者を逃している可能性あり。<strong>「No-Hire 理由の構造化」</strong>を依頼して可視化を。
                </span>
              </li>
            )}
            {stats.some((s) => s.pattern === "volatile") && (
              <li className="flex items-start gap-2 rounded-md border border-purple-200 bg-purple-50 p-2">
                <span className="text-base">🌪️</span>
                <span>
                  バラツキの大きい面接官あり。<strong>採点ガイドの読み合わせ</strong>を行うと一貫性が改善します。
                </span>
              </li>
            )}
            {pairs.some((p) => p.mean_abs_diff > 1.4) && (
              <li className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2">
                <span className="text-base">🤝</span>
                <span>
                  ペア合意度が 1.4 点以上の組み合わせあり。
                  <strong>同じ候補者の評価会議</strong>で、何が違うかをレビューしてみましょう。
                </span>
              </li>
            )}
            {stats.every((s) => s.pattern === "balanced") && (
              <li className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2">
                <span className="text-base">✅</span>
                <span>全面接官がバランスの取れた採点。calibration は良好です。</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 部品 ─────────────────────────────────────

function InterviewerRow({
  stat, name, job, overallMean,
}: {
  stat: InterviewerStat;
  name: string;
  job: string;
  overallMean: number;
}) {
  const meta = PATTERN_META[stat.pattern];
  const biasPct = (stat.bias / 1.5) * 50; // -1.5 〜 +1.5 を中央 50% にスケール
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{name}</span>
            <Badge variant="outline" className={cn("border text-[10px]", meta.color)}>
              {meta.emoji} {meta.label}
            </Badge>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
              {stat.evaluations} 件
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">{job} · {meta.description}</div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right text-[10px]">
          <div>
            <div className="text-muted-foreground uppercase tracking-wider">平均</div>
            <div className="font-mono text-base font-bold tabular-nums">{stat.mean_overall}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wider">分散</div>
            <div className="font-mono text-base font-bold tabular-nums">{stat.stdev}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wider">採用整合</div>
            <div className="font-mono text-base font-bold tabular-nums">
              {stat.hire_accuracy !== undefined ? `${Math.round(stat.hire_accuracy * 100)}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* バイアスバー */}
      <div className="relative h-2 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
        <div
          className={cn(
            "absolute inset-y-0 rounded-full",
            stat.bias > 0 ? "bg-amber-400" : stat.bias < 0 ? "bg-red-400" : "bg-emerald-400",
          )}
          style={{
            left: stat.bias >= 0 ? "50%" : `${50 + biasPct}%`,
            width: `${Math.abs(biasPct)}%`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>厳しめ -1.5</span>
        <span className="font-mono tabular-nums">
          バイアス {stat.bias > 0 ? "+" : ""}{stat.bias} 点（vs 全体 {overallMean.toFixed(2)}）
        </span>
        <span>+1.5 甘め</span>
      </div>
    </div>
  );
}

function DiffCell({ value, baseline }: { value: number; baseline: number }) {
  const diff = value - baseline;
  // ±1.0 までを 0..1 にマッピング
  const norm = Math.max(-1, Math.min(1, diff / 1.0));
  const hue = norm > 0 ? 120 : norm < 0 ? 0 : 60;
  const intensity = Math.abs(norm) * 50; // 50% lightness shift
  const bg = `hsl(${hue} 70% ${88 - intensity * 0.4}%)`;
  const fg = `hsl(${hue} 70% 28%)`;
  return (
    <span
      className="inline-flex min-w-[3rem] flex-col items-center rounded px-1.5 py-1 font-mono"
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="text-xs font-bold tabular-nums">{value.toFixed(1)}</span>
      <span className="text-[9px]">
        {diff > 0 ? "+" : ""}{diff.toFixed(2)}
      </span>
    </span>
  );
}

function Kpi({
  Icon, label, value, unit, hint, tone,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; unit: string;
  hint?: string;
  tone?: "ok" | "warn";
}) {
  return (
    <Card className={cn(
      tone === "warn" && "border-amber-200 bg-amber-50/40",
    )}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          tone === "warn" ? "border-amber-300 bg-amber-100 text-amber-800" : "border-gc-200 bg-gc-50 text-gc-700",
        )}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
          {hint && <div className="truncate text-[10px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
