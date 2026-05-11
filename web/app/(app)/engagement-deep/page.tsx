"use client";

/**
 * /engagement-deep
 *
 * エンゲージメントサーベイ深掘り：ステージ別離脱要因分析。
 *
 *  - 在籍ステージ別の eNPS と離脱率
 *  - ステージ × ドライバーのヒートマップ
 *  - 退職理由クラスタリング
 *  - 推奨アクション（弱いドライバーをステージ別に提示）
 */

import { useMemo } from "react";
import {
  Activity, Users2, TrendingDown, AlertTriangle, MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_STAGE_DRIVERS, DEMO_STAGE_ATTRITION, DEMO_STAGE_ENPS,
  DEMO_EXIT_CLUSTERS, TENURE_STAGE_LABEL, DRIVER_LABEL,
  overallDrivers, type TenureStage, type Driver,
} from "@/lib/demo/engagement-deep";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGES: TenureStage[] = ["onboarding", "new_hire", "established", "veteran", "lifer"];
const DRIVERS: Driver[] = ["compensation", "growth", "manager", "culture", "workload", "mission"];

export default function EngagementDeepPage() {
  const overall = useMemo(overallDrivers, []);

  // 全体の状況
  const totalHeadcount = STAGES.reduce((s, st) => s + DEMO_STAGE_ATTRITION[st].headcount, 0);
  const totalLeft = STAGES.reduce((s, st) => s + DEMO_STAGE_ATTRITION[st].left, 0);
  const overallAttrition = totalLeft / totalHeadcount;

  // 最も低いドライバー
  const lowestDriver = DRIVERS.reduce((min, d) =>
    overall[d] < overall[min] ? d : min, "compensation" as Driver);

  // ステージ別の最弱ドライバー（推奨アクション用）
  const stageWeakness = STAGES.map((st) => {
    const scores = DEMO_STAGE_DRIVERS[st];
    const weakest = DRIVERS.reduce((min, d) =>
      scores[d] < scores[min] ? d : min, "compensation" as Driver);
    return { stage: st, weakest, score: scores[weakest] };
  });

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Activity className="size-6 text-gc-700" />
          エンゲージメント深掘り
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          在籍ステージ別の離脱要因を 6 ドライバーで分析。退職理由クラスタリングと連動
        </p>
      </div>

      {/* 全体 KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="総ヘッドカウント" value={totalHeadcount} unit="名" />
        <Kpi label="過去 12M 離脱率" value={`${(overallAttrition * 100).toFixed(1)}%`} unit=""
             tone={overallAttrition < 0.10 ? "success" : overallAttrition < 0.15 ? "warn" : "danger"} />
        <Kpi label="最弱ドライバー" value={DRIVER_LABEL[lowestDriver]} unit="" tone="warn"
             hint={`スコア ${overall[lowestDriver].toFixed(2)} / 5`} />
        <Kpi label="退職クラスタ数" value={DEMO_EXIT_CLUSTERS.length} unit="種" />
      </div>

      {/* ステージ別 eNPS + 離脱率 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Users2 className="size-4 text-gc-700" />
            ステージ別 eNPS と離脱率
          </h2>
          <ul className="space-y-3">
            {STAGES.map((st) => {
              const attrition = DEMO_STAGE_ATTRITION[st];
              const enps = DEMO_STAGE_ENPS[st];
              return (
                <li key={st} className="space-y-1.5 rounded-md border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{TENURE_STAGE_LABEL[st]}</span>
                    <div className="flex items-center gap-3 tabular-nums text-xs">
                      <span className="text-muted-foreground">{attrition.headcount} 名</span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 font-bold",
                        attrition.rate < 0.10 ? "bg-emerald-100 text-emerald-800" :
                        attrition.rate < 0.18 ? "bg-amber-100 text-amber-800" :
                                                "bg-red-100 text-red-800",
                      )}>
                        離脱 {(attrition.rate * 100).toFixed(1)}%
                      </span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 font-mono font-bold",
                        enps.nps >= 50 ? "bg-emerald-100 text-emerald-800" :
                        enps.nps >= 20 ? "bg-emerald-50 text-emerald-700" :
                        enps.nps >= 0  ? "bg-amber-100 text-amber-800"   :
                                         "bg-red-100 text-red-800",
                      )}>
                        eNPS {enps.nps > 0 ? "+" : ""}{enps.nps}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="bg-emerald-500" style={{ width: `${(enps.promoters / attrition.headcount) * 100}%` }} />
                    <div className="bg-amber-400"   style={{ width: `${(enps.passives / attrition.headcount) * 100}%` }} />
                    <div className="bg-red-500"     style={{ width: `${(enps.detractors / attrition.headcount) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                    <span>P {enps.promoters}</span>
                    <span>X {enps.passives}</span>
                    <span>D {enps.detractors}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* ヒートマップ：ステージ × ドライバー */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <TrendingDown className="size-4 text-gc-700" />
            ステージ × ドライバー ヒートマップ
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            セルは 1-5 のスコア。緑が高い、赤が低い。低い箇所が「離脱を生むホットスポット」
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-1.5 text-left font-semibold">ステージ</th>
                  {DRIVERS.map((d) => (
                    <th key={d} className="px-2 py-1.5 text-center font-semibold whitespace-nowrap">
                      {DRIVER_LABEL[d]}
                      <div className="font-mono text-[9px] text-muted-foreground tabular-nums">
                        全体 {overall[d].toFixed(2)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STAGES.map((st) => (
                  <tr key={st} className="border-b last:border-b-0">
                    <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                      {TENURE_STAGE_LABEL[st]}
                    </td>
                    {DRIVERS.map((d) => (
                      <td key={d} className="px-1 py-1 text-center">
                        <HeatCell score={DEMO_STAGE_DRIVERS[st][d]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 退職理由クラスタリング */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <MessageSquare className="size-4 text-gc-700" />
            退職理由クラスタリング
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            退職面談・サーベイの自由記述を AI で意味的にグルーピング
          </p>
          <ul className="space-y-2">
            {DEMO_EXIT_CLUSTERS.sort((a, b) => b.count - a.count).map((c) => (
              <li key={c.label} className="rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{c.label}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      主に {TENURE_STAGE_LABEL[c.primary_stage]}
                    </Badge>
                    <span className="font-mono text-base font-bold tabular-nums">{c.count}</span>
                    <span className="text-[10px] text-muted-foreground">件</span>
                  </div>
                </div>
                {c.related_drivers.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground">関連ドライバー:</span>
                    {c.related_drivers.map((d) => (
                      <span key={d} className="rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-800">
                        {DRIVER_LABEL[d]}
                      </span>
                    ))}
                  </div>
                )}
                <ul className="mt-2 space-y-1">
                  {c.sample_comments.map((cm, i) => (
                    <li key={i} className="rounded-md bg-muted/30 px-2 py-1 text-[11px] italic text-muted-foreground">
                      &ldquo;{cm}&rdquo;
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ステージ別推奨アクション */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle className="size-4 text-gc-700" />
            ステージ別 推奨アクション
          </h2>
          <ul className="space-y-2">
            {stageWeakness.map((sw) => (
              <li key={sw.stage} className={cn(
                "rounded-md border p-3 text-sm",
                sw.score < 3.3 ? "border-red-200 bg-red-50/30" :
                sw.score < 3.8 ? "border-amber-200 bg-amber-50/30" :
                                 "border-border",
              )}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{TENURE_STAGE_LABEL[sw.stage]}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span>最弱：</span>
                    <Badge variant="outline" className="text-[10px]">
                      {DRIVER_LABEL[sw.weakest]}
                    </Badge>
                    <span className="font-mono font-bold tabular-nums">{sw.score.toFixed(2)} / 5</span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {actionFor(sw.stage, sw.weakest)}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 <strong>読み解き：</strong>
        新人期（3-12M）の <strong>compensation 3.4</strong> は要警戒。市場の給与レンジ認識が広がる時期で、
        他社オファーが最頻発するクラスタと一致。<strong>1 年経過時の自動レビュー → 昇給</strong>を制度化すると改善余地あり。
        確立期（1-3Y）の <strong>growth 3.5</strong> は新規プロジェクトのアサイン頻度が鍵。
      </div>
    </div>
  );
}

// ── アクション提案 ─────────────────────────────────
function actionFor(stage: TenureStage, driver: Driver): string {
  const map: Record<TenureStage, Partial<Record<Driver, string>>> = {
    onboarding: {
      workload: "オンボーディング期は学習に集中できる軽負荷を意図的に確保。タスクアサインを段階制に。",
      manager: "マネージャーとの 1on1 を週 1（最初の 30 日）→ 隔週で。",
    },
    new_hire: {
      compensation: "1 年経過時の自動レビューを制度化。市場ベンチマークとのギャップを明示し昇給判断を。",
      manager: "新人とマネージャーの相性チェックを 6 ヶ月時点で実施。",
      growth: "1 年目末に新規プロジェクトを 1 件オーナー任命。",
    },
    established: {
      growth: "横断プロジェクト・後輩メンタリングなど、新しい裁量を意識的に。Job Crafting 1on1 を四半期ごとに。",
      workload: "属人化解消。技術的負債リファクタリングをスプリント計画に組み込む。",
    },
    veteran: {
      manager: "次世代マネージャー候補としてのキャリアパス相談を CEO/CHRO と直接実施。",
      growth: "外部研修・カンファレンス参加を年 2 回保証。専門性深化への投資を明示。",
    },
    lifer: {
      growth: "アルムナイのような社外活動・社内副業を許容し、新たな刺激を組み込む。",
      workload: "ワークライフバランスの個別カスタマイズ（時短 / 4 日勤務 / リモートメイン）を提案。",
    },
  };
  return map[stage]?.[driver] ?? `${DRIVER_LABEL[driver]} に重点的にアプローチが必要なステージ。マネージャーと個別 1on1 の質を見直し。`;
}

function HeatCell({ score }: { score: number }) {
  // 1〜5 を 0〜120 hue（赤〜緑）にマップ
  const norm = (score - 1) / 4;
  const hue = Math.round(norm * 120);
  const bg = `hsl(${hue} 70% ${88 - norm * 20}%)`;
  const fg = `hsl(${hue} 70% 25%)`;
  return (
    <span
      className="inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-1 font-mono font-semibold tabular-nums"
      style={{ backgroundColor: bg, color: fg }}
    >
      {score.toFixed(2)}
    </span>
  );
}

function Kpi({ label, value, unit, tone, hint }: {
  label: string; value: string | number; unit: string;
  tone?: "primary" | "success" | "warn" | "danger";
  hint?: string;
}) {
  const cls = {
    primary: "border-gc-200 bg-gc-50/40",
    success: "border-emerald-200 bg-emerald-50/40",
    warn:    "border-amber-200 bg-amber-50/40",
    danger:  "border-red-200 bg-red-50/40",
  }[tone ?? "primary"];
  return (
    <Card className={cn(cls)}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
