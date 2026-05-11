"use client";

/**
 * 採用 Intelligence パネル：1 候補者に対する 3 つの分析を一括表示。
 *  1. 自動判定（advance/review/park/reject + 理由）
 *  2. 活躍社員との類似度（high performer フラグ付）
 *  3. 全 open ポジションへのフィット降順
 */

import { useState } from "react";
import {
  Sparkles, Loader2, Users2, Target, Zap, AlertCircle,
  CheckCircle2, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import type { Candidate } from "@/lib/demo/recruiting";
import type { AutoScreenResult } from "@/lib/recruiting/auto-screen";
import { DECISION_META } from "@/lib/recruiting/auto-screen";
import type { SimilarEmployee } from "@/lib/recruiting/similarity";
import type { RoleFitScore } from "@/lib/recruiting/role-fit";

type Props = { candidate: Candidate };

type State = {
  loading: boolean;
  screen?: AutoScreenResult;
  similar?: { top_overall: SimilarEmployee[]; top_high_performers: SimilarEmployee[] };
  fits?: RoleFitScore[];
  error?: string;
};

export function RecruitingIntelligence({ candidate }: Props) {
  const [s, setS] = useState<State>({ loading: false });

  const analyze = async () => {
    setS({ loading: true });
    try {
      const [scrRes, simRes, fitRes] = await Promise.all([
        fetch("/api/recruiting/auto-screen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidate }),
        }),
        fetch("/api/recruiting/similar-employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate: {
              current_role: candidate.current_role,
              years_of_experience: candidate.years_of_experience,
              notes: candidate.notes,
              current_company: candidate.current_company,
            },
          }),
        }),
        fetch("/api/recruiting/role-fit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate: {
              current_role: candidate.current_role,
              years_of_experience: candidate.years_of_experience,
              notes: candidate.notes,
              current_company: candidate.current_company,
              desired_salary: candidate.desired_salary,
              desired_currency: candidate.desired_currency,
            },
          }),
        }),
      ]);

      const [screenJson, simJson, fitJson] = await Promise.all([scrRes.json(), simRes.json(), fitRes.json()]);

      setS({
        loading: false,
        screen: screenJson.ok ? screenJson.result : undefined,
        similar: simJson.ok ? { top_overall: simJson.top_overall, top_high_performers: simJson.top_high_performers } : undefined,
        fits: fitJson.ok ? fitJson.fits : undefined,
      });
      toast.success("分析が完了しました");
    } catch (e) {
      setS({ loading: false, error: (e as Error).message });
    }
  };

  if (!s.screen && !s.loading) {
    return (
      <div className="rounded-md border border-gc-200 bg-gc-50/40 p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-gc-700" />
          <div className="flex-1">
            <div className="text-sm font-semibold">採用 Intelligence</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              自動判定 + 活躍人材との類似度 + 全ポジションへのフィット度を一括分析します
            </p>
          </div>
          <Button onClick={() => void analyze()} size="sm" className="gap-1 h-7 px-2 text-xs">
            <Sparkles className="size-3" />
            分析実行
          </Button>
        </div>
      </div>
    );
  }

  if (s.loading) {
    return (
      <div className="rounded-md border border-gc-200 bg-gc-50/40 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin text-gc-700" />
          活躍社員データ・全ポジション・類似度を分析中...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-gc-200 bg-gc-50/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-gc-700" />
          <span className="text-sm font-semibold">採用 Intelligence 結果</span>
        </div>
        <Button onClick={() => void analyze()} variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
          再分析
        </Button>
      </div>

      {/* ── 自動判定 ───────────────── */}
      {s.screen && (
        <div className="rounded-md border bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Zap className="size-3.5 text-gc-700" />
            <span className="text-xs font-semibold">自動判定</span>
          </div>
          <DecisionBadge result={s.screen} />
          <ul className="mt-2 space-y-1">
            {s.screen.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600" />
                <span>{r}</span>
              </li>
            ))}
            {s.screen.flags.map((f, i) => (
              <li key={`f${i}`} className="flex items-start gap-1.5 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 size-3 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 活躍社員との類似度 ─────── */}
      {s.similar && s.similar.top_overall.length > 0 && (
        <div className="rounded-md border bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Users2 className="size-3.5 text-gc-700" />
            <span className="text-xs font-semibold">活躍社員との類似度</span>
            <span className="text-[10px] text-muted-foreground">類似 Top 5（活躍 ★ 付）</span>
          </div>
          <ul className="space-y-1.5">
            {s.similar.top_overall.slice(0, 5).map((sim) => (
              <li key={sim.employee_id} className="flex items-center gap-2.5 rounded-md border bg-background p-2">
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{initials(sim.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{sim.full_name}</span>
                    {sim.is_high_performer && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                        ★ 活躍
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {sim.one_liner ?? sim.job_title}
                  </div>
                  {sim.similarity.matched_skills.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {sim.similarity.matched_skills.slice(0, 4).map((m) => (
                        <span key={m} className="rounded bg-muted/60 px-1.5 py-0.5 text-[9px] tabular-nums">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <SimilarityRing pct={sim.similarity.total} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── ポジション別フィット ───── */}
      {s.fits && s.fits.length > 0 && (
        <div className="rounded-md border bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Target className="size-3.5 text-gc-700" />
            <span className="text-xs font-semibold">ポジション別フィット</span>
            <span className="text-[10px] text-muted-foreground">スキル × 経験 × 給与で重み付け</span>
          </div>
          <ul className="space-y-2">
            {s.fits.slice(0, 4).map((f) => (
              <li key={f.position_id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm font-medium">{f.position_title}</span>
                  <span className="font-mono text-xs tabular-nums">{Math.round(f.total * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full",
                      f.total >= 0.7
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                        : f.total >= 0.45
                          ? "bg-gradient-to-r from-amber-400 to-amber-600"
                          : "bg-gradient-to-r from-red-300 to-red-500",
                    )}
                    style={{ width: `${Math.round(f.total * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">{f.rationale}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <div>{s.error}</div>
        </div>
      )}
    </div>
  );
}

function DecisionBadge({ result }: { result: AutoScreenResult }) {
  const meta = DECISION_META[result.decision];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={meta.tone} className="text-xs">
        {meta.emoji} {meta.label}
      </Badge>
      <span className="text-xs text-muted-foreground">
        信頼度 {Math.round(result.confidence * 100)}% · スコア {result.score}/100
      </span>
      {result.best_position && (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
          <ArrowRight className="size-3" />
          {result.best_position.title}（{result.best_position.fit_pct}%）
        </span>
      )}
    </div>
  );
}

function SimilarityRing({ pct }: { pct: number }) {
  const v = Math.round(pct * 100);
  const tone =
    v >= 70 ? "text-emerald-600" :
    v >= 45 ? "text-amber-600"   : "text-muted-foreground";
  return (
    <div className={cn("flex flex-col items-center", tone)}>
      <span className="font-mono text-base font-bold leading-none tabular-nums">{v}%</span>
      <span className="text-[9px] text-muted-foreground">類似度</span>
    </div>
  );
}
