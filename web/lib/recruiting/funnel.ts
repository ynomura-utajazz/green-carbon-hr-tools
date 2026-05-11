/**
 * ファネル分析の集計ロジック。
 *
 * 入力：FunnelEvent[]（ステージ遷移の履歴ストリーム）
 * 出力：
 *   - ステージごとの通過数（経路別）
 *   - ステージ間 CVR（経路別）
 *   - 月次トレンド（経路別 / 全体）
 *   - 平均日数（applied → hired）
 *   - ボトルネック検出（最も離脱率が高いステージ）
 */

import type { FunnelEvent } from "@/lib/demo/funnel-events";
import { type CandidateSource, type CandidateStage } from "@/lib/demo/recruiting";

export type FunnelStat = {
  source: CandidateSource | "all";
  /** 各ステージに到達した候補者数 */
  reached: Record<CandidateStage, number>;
  /** ステージ間の CVR（前ステージに到達した人のうち何 % が次に進んだか） */
  cvr: Record<CandidateStage, number>;
  /** applied から hired までの平均日数 */
  avg_days_to_hire: number | null;
  /** 最も離脱率が高い（CVR が低い）ステージ */
  bottleneck?: { stage: CandidateStage; cvr: number };
};

export type MonthlyPoint = {
  month: string;          // YYYY-MM
  applied: number;
  hired: number;
  rejected: number;
};

const STAGES_FOR_FUNNEL: CandidateStage[] = [
  "applied", "screening", "interview_1", "interview_2",
  "final", "offer", "hired",
];

/** イベント群を candidate ごとにまとめ、辿ったステージの最大値を返す */
function reachedStagePerCandidate(events: FunnelEvent[]): Map<string, { stages: Set<CandidateStage>; first: Date; last: Date; source: CandidateSource; finalStage: CandidateStage }> {
  const map = new Map<string, { stages: Set<CandidateStage>; first: Date; last: Date; source: CandidateSource; finalStage: CandidateStage }>();
  for (const ev of events) {
    const ts = new Date(ev.occurred_at);
    const cur = map.get(ev.candidate_id);
    if (!cur) {
      map.set(ev.candidate_id, {
        stages: new Set([ev.to_stage]),
        first: ts, last: ts, source: ev.source,
        finalStage: ev.to_stage,
      });
    } else {
      cur.stages.add(ev.to_stage);
      if (ts < cur.first) cur.first = ts;
      if (ts > cur.last) {
        cur.last = ts;
        cur.finalStage = ev.to_stage;
      }
    }
  }
  return map;
}

/** 経路別＋全体のファネル統計 */
export function computeFunnel(
  events: FunnelEvent[],
  filter?: { since?: Date; until?: Date },
): FunnelStat[] {
  const filtered = events.filter((e) => {
    const ts = new Date(e.occurred_at);
    if (filter?.since && ts < filter.since) return false;
    if (filter?.until && ts > filter.until) return false;
    return true;
  });

  const perCand = reachedStagePerCandidate(filtered);
  const allCands = [...perCand.values()];

  const sources: (CandidateSource | "all")[] = [
    "all",
    "referral", "linkedin", "wantedly", "indeed", "agent",
    "direct", "alumni", "contractor_conversion",
  ];

  return sources.map((src) => {
    const subset = src === "all" ? allCands : allCands.filter((c) => c.source === src);
    const reached: Record<CandidateStage, number> = Object.fromEntries(
      STAGES_FOR_FUNNEL.map((s) => [s, 0]),
    ) as Record<CandidateStage, number>;
    reached.rejected = 0;
    reached.withdrawn = 0;

    for (const c of subset) {
      for (const s of c.stages) reached[s] = (reached[s] ?? 0) + 1;
    }

    // ステージ間 CVR
    const cvr: Record<CandidateStage, number> = {} as Record<CandidateStage, number>;
    for (let i = 0; i < STAGES_FOR_FUNNEL.length; i++) {
      const stage = STAGES_FOR_FUNNEL[i];
      const prev = i === 0 ? subset.length : reached[STAGES_FOR_FUNNEL[i - 1]];
      cvr[stage] = prev > 0 ? reached[stage] / prev : 0;
    }
    cvr.rejected = 0;
    cvr.withdrawn = 0;

    // 平均 days to hire
    const hired = subset.filter((c) => c.stages.has("hired"));
    const avg = hired.length > 0
      ? hired.reduce((sum, c) => sum + (c.last.getTime() - c.first.getTime()) / 86_400_000, 0) / hired.length
      : null;

    // ボトルネック：CVR が最も低いステージ（applied は除外、対象を screening 以降）
    const bottleneckCandidates = STAGES_FOR_FUNNEL.slice(1).filter((s) => reached[s] > 0 || s === "screening");
    let bottleneck: FunnelStat["bottleneck"] | undefined;
    if (bottleneckCandidates.length > 0 && subset.length >= 5) {
      const lowest = bottleneckCandidates.reduce(
        (worst, s) => (cvr[s] < worst.cvr ? { stage: s, cvr: cvr[s] } : worst),
        { stage: bottleneckCandidates[0], cvr: cvr[bottleneckCandidates[0]] },
      );
      bottleneck = lowest;
    }

    return {
      source: src,
      reached,
      cvr,
      avg_days_to_hire: avg,
      bottleneck,
    };
  });
}

/** 月次の流入・採用・離脱トレンド */
export function computeMonthlyTrend(events: FunnelEvent[]): MonthlyPoint[] {
  const perCand = reachedStagePerCandidate(events);
  const byMonth = new Map<string, MonthlyPoint>();

  for (const c of perCand.values()) {
    const m = c.first.toISOString().slice(0, 7); // YYYY-MM
    const cur = byMonth.get(m) ?? { month: m, applied: 0, hired: 0, rejected: 0 };
    cur.applied += 1;
    if (c.stages.has("hired")) cur.hired += 1;
    if (c.finalStage === "rejected" || c.finalStage === "withdrawn") cur.rejected += 1;
    byMonth.set(m, cur);
  }

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** 経路別の hire 数（数より割合の方が面白い） */
export function topSourceConversion(stats: FunnelStat[]): {
  source: CandidateSource;
  applied: number;
  hired: number;
  hire_rate: number;
}[] {
  return stats
    .filter((s) => s.source !== "all")
    .map((s) => ({
      source: s.source as CandidateSource,
      applied: s.reached.applied ?? 0,
      hired: s.reached.hired ?? 0,
      hire_rate: s.reached.applied > 0 ? (s.reached.hired ?? 0) / s.reached.applied : 0,
    }))
    .sort((a, b) => b.hire_rate - a.hire_rate);
}

/** 表示用ステージラベル（短縮版） */
export const STAGE_SHORT_LABEL: Partial<Record<CandidateStage, string>> = {
  applied: "応募",
  screening: "書類",
  interview_1: "1次",
  interview_2: "2次",
  final: "最終",
  offer: "内定",
  hired: "採用",
  rejected: "不採用",
  withdrawn: "辞退",
};

export const FUNNEL_STAGES = STAGES_FOR_FUNNEL;
