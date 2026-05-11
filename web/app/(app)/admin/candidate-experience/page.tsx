"use client";

/**
 * /admin/candidate-experience
 *
 * 応募者体験スコア（ESI / NPS）ダッシュボード。
 *  - 全体 NPS
 *  - ステージ別 NPS（どのステージで離脱体験が悪いか）
 *  - 経路別 NPS
 *  - 採用結果別 NPS（hired vs not_hired）
 *  - 自由記述ハイライト
 */

import { useMemo } from "react";
import { Smile, Meh, Frown, Sparkles, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEMO_CANDIDATE_FEEDBACK, computeNps, type CandidateFeedback,
} from "@/lib/demo/candidate-feedback";
import { SOURCE_LABEL, STAGE_LABEL, type CandidateSource, type CandidateStage } from "@/lib/demo/recruiting";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function CandidateExperiencePage() {
  const overall = useMemo(() => computeNps(DEMO_CANDIDATE_FEEDBACK), []);

  const byStage = useMemo(() => {
    const map = new Map<CandidateStage, CandidateFeedback[]>();
    for (const f of DEMO_CANDIDATE_FEEDBACK) {
      const cur = map.get(f.stage_at_feedback) ?? [];
      cur.push(f);
      map.set(f.stage_at_feedback, cur);
    }
    return [...map.entries()]
      .map(([stage, fbs]) => ({ stage, ...computeNps(fbs) }))
      .sort((a, b) => a.nps - b.nps); // 低い順（問題が見える）
  }, []);

  const bySource = useMemo(() => {
    const map = new Map<CandidateSource, CandidateFeedback[]>();
    for (const f of DEMO_CANDIDATE_FEEDBACK) {
      const cur = map.get(f.source) ?? [];
      cur.push(f);
      map.set(f.source, cur);
    }
    return [...map.entries()]
      .map(([source, fbs]) => ({ source, ...computeNps(fbs) }))
      .sort((a, b) => b.nps - a.nps);
  }, []);

  const byOutcome = useMemo(() => {
    const outcomes: CandidateFeedback["outcome"][] = ["hired", "not_hired", "withdrawn", "pending"];
    return outcomes.map((outcome) => ({
      outcome,
      ...computeNps(DEMO_CANDIDATE_FEEDBACK.filter((f) => f.outcome === outcome)),
    }));
  }, []);

  // ハイライトコメント
  const promoterComments = DEMO_CANDIDATE_FEEDBACK
    .filter((f) => f.nps >= 9 && (f.positive))
    .slice(0, 3);
  const detractorComments = DEMO_CANDIDATE_FEEDBACK
    .filter((f) => f.nps <= 6 && f.negative)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Smile className="size-6 text-gc-700" />
          応募者体験スコア（ESI / NPS）
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          候補者からの NPS（Net Promoter Score）を集計。選考体験の改善余地を可視化
        </p>
      </div>

      {/* 全体 NPS */}
      <Card>
        <CardContent className="p-5">
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                全体 NPS（{overall.total} 件の回答）
              </div>
              <div className={cn(
                "mt-1 font-mono text-6xl font-black tabular-nums leading-none",
                overall.nps >= 50 ? "text-emerald-600" :
                overall.nps >= 20 ? "text-emerald-500" :
                overall.nps >= 0  ? "text-amber-500"  : "text-red-600",
              )}>
                {overall.nps > 0 ? "+" : ""}{overall.nps}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {overall.nps >= 50 ? "🎉 業界トップクラス：候補者が紹介してくれるレベル" :
                 overall.nps >= 20 ? "👍 良好：継続的に体験を磨きましょう" :
                 overall.nps >= 0  ? "🟡 改善余地あり：Detractor の声を確認" :
                                     "⚠️ 要改善：根本原因の特定が急務"}
              </p>
            </div>
            <div className="flex justify-around">
              <NpsCount Icon={Smile} label="Promoters" value={overall.promoters} total={overall.total} tone="success" />
              <NpsCount Icon={Meh}   label="Passives"  value={overall.passives}  total={overall.total} tone="muted" />
              <NpsCount Icon={Frown} label="Detractors" value={overall.detractors} total={overall.total} tone="danger" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ステージ別 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 text-sm font-semibold">ステージ別 NPS（低い順 = 改善優先）</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            どのステージで体験が悪化しているかを特定すると、改善の打ち手が絞れます
          </p>
          <ul className="space-y-2">
            {byStage.map((s) => (
              <NpsRow key={s.stage} label={STAGE_LABEL[s.stage] ?? s.stage} {...s} />
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 経路別 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 text-sm font-semibold">経路別 NPS（高い順）</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            どの経路の候補者が満足度高いか。リファラル経由 = 既に文化に共感している傾向
          </p>
          <ul className="space-y-2">
            {bySource.map((s) => (
              <NpsRow key={s.source} label={SOURCE_LABEL[s.source]} {...s} />
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 採用結果別 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">採用結果別 NPS</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {byOutcome.map((o) => (
              <div key={o.outcome} className={cn(
                "rounded-md border p-3",
                o.outcome === "hired" ? "bg-emerald-50/40 border-emerald-200" :
                o.outcome === "not_hired" ? "bg-red-50/40 border-red-200" :
                o.outcome === "withdrawn" ? "bg-amber-50/40 border-amber-200" :
                                            "bg-muted/30",
              )}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {o.outcome === "hired" ? "採用" :
                   o.outcome === "not_hired" ? "不採用" :
                   o.outcome === "withdrawn" ? "辞退" : "進行中"}
                </div>
                <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums">
                  {o.total > 0 ? `${o.nps > 0 ? "+" : ""}${o.nps}` : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">{o.total} 件</div>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-md bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground">
            💡 不採用候補者の NPS が高い = 「ご縁はないけど勧められる会社」と思われている健全な状態。
            低い場合は通知や辞退時のコミュニケーション設計を見直しましょう。
          </p>
        </CardContent>
      </Card>

      {/* ハイライトコメント */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-3.5 text-emerald-600" />
              Promoter の声（NPS 9-10）
            </h3>
            <ul className="space-y-2">
              {promoterComments.map((f) => (
                <li key={f.id} className="rounded-md border border-emerald-200 bg-emerald-50/40 p-2.5 text-xs leading-relaxed">
                  <p>"{f.positive}"</p>
                  <div className="mt-1 text-[10px] text-emerald-800">
                    {STAGE_LABEL[f.stage_at_feedback]} · {SOURCE_LABEL[f.source]} · NPS {f.nps}
                  </div>
                </li>
              ))}
              {promoterComments.length === 0 && (
                <li className="text-xs text-muted-foreground">該当コメントなし</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <MessageSquare className="size-3.5 text-red-600" />
              Detractor の声（NPS 0-6）— 改善のヒント
            </h3>
            <ul className="space-y-2">
              {detractorComments.map((f) => (
                <li key={f.id} className="rounded-md border border-red-200 bg-red-50/40 p-2.5 text-xs leading-relaxed">
                  <p>"{f.negative}"</p>
                  <div className="mt-1 text-[10px] text-red-800">
                    {STAGE_LABEL[f.stage_at_feedback]} · {SOURCE_LABEL[f.source]} · NPS {f.nps}
                  </div>
                </li>
              ))}
              {detractorComments.length === 0 && (
                <li className="text-xs text-muted-foreground">該当コメントなし</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        フィードバックは <a href="/careers/feedback" target="_blank" rel="noopener noreferrer" className="text-gc-700 hover:underline">/careers/feedback</a> で候補者から収集。
        各ステージ完了時の自動メールで個別 URL を送ると回収率が上がります（例：選考通知時に <code className="font-mono">?id=cand-xxx&stage=screening</code> 付き）。
      </div>
    </div>
  );
}

function NpsCount({ Icon, label, value, total, tone }: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; total: number;
  tone: "success" | "muted" | "danger";
}) {
  const cls = {
    success: "text-emerald-600",
    muted:   "text-muted-foreground",
    danger:  "text-red-600",
  }[tone];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="text-center">
      <Icon className={cn("mx-auto size-6", cls)} />
      <div className="mt-1 text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-xl font-bold tabular-nums", cls)}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{pct}%</div>
    </div>
  );
}

function NpsRow({
  label, total, promoters, passives, detractors, nps,
}: {
  label: string;
  total: number; promoters: number; passives: number; detractors: number; nps: number;
}) {
  if (total === 0) return null;
  const pPct = (promoters / total) * 100;
  const xPct = (passives / total) * 100;
  const dPct = (detractors / total) * 100;
  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">{total} 件</span>
          <span className={cn(
            "font-mono text-base font-bold tabular-nums",
            nps >= 50 ? "text-emerald-600" :
            nps >= 20 ? "text-emerald-500" :
            nps >= 0  ? "text-amber-600"  : "text-red-600",
          )}>
            {nps > 0 ? "+" : ""}{nps}
          </span>
        </div>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-emerald-500" style={{ width: `${pPct}%` }} />
        <div className="bg-amber-400"   style={{ width: `${xPct}%` }} />
        <div className="bg-red-500"     style={{ width: `${dPct}%` }} />
      </div>
    </li>
  );
}
