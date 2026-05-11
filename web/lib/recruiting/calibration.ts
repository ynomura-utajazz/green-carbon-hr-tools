/**
 * 面接官 calibration（評価バイアス分析）。
 *
 * 計算指標：
 *  - per-interviewer mean / stdev（各面接官の平均と分散）
 *  - bias = 自分の平均 − 全体平均（正なら甘め、負なら厳しめ）
 *  - consistency = 1 - stdev / max_stdev（高いほど一貫した採点）
 *  - hire signal accuracy = 自分の "hire" 判定のうち実際に採用に至った割合
 *  - inter-rater agreement: 同じ候補者を評価した複数面接官の相関
 */

import type { FeedbackRecord } from "@/lib/demo/interview-feedback";

export type InterviewerStat = {
  interviewer_id: string;
  evaluations: number;
  mean_overall: number;
  stdev: number;
  /** 全体平均との差分（+ なら甘め、- なら厳しめ） */
  bias: number;
  /** 0..1。一貫性（分散の逆相関） */
  consistency: number;
  /** Hire 判定して実際に採用された割合（pending 除く） */
  hire_accuracy?: number;
  /** 評価傾向：strict / balanced / lenient / volatile */
  pattern: "strict" | "balanced" | "lenient" | "volatile";
  /** 軸別の平均 */
  per_axis: { technical: number; communication: number; culture_fit: number; leadership: number };
};

export type AgreementCell = {
  interviewer_a: string;
  interviewer_b: string;
  /** 同じ候補者の評価ペア数 */
  pairs: number;
  /** 平均絶対差（小さいほど一致） */
  mean_abs_diff: number;
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeInterviewerStats(records: FeedbackRecord[]): InterviewerStat[] {
  const overallMean = mean(records.map((r) => r.overall));
  const byInterviewer = new Map<string, FeedbackRecord[]>();
  for (const r of records) {
    const cur = byInterviewer.get(r.interviewer_id) ?? [];
    cur.push(r);
    byInterviewer.set(r.interviewer_id, cur);
  }

  const stats: InterviewerStat[] = [];
  for (const [interviewer_id, recs] of byInterviewer) {
    const overalls = recs.map((r) => r.overall);
    const m = mean(overalls);
    const sd = stdev(overalls);
    const bias = m - overallMean;
    const maxSd = 1.5; // 5 段階の理論最大に近い数値
    const consistency = Math.max(0, Math.min(1, 1 - sd / maxSd));

    // hire signal accuracy
    const decided = recs.filter((r) => r.hire_outcome !== "pending");
    const hireOnes = decided.filter((r) => r.recommendation === "hire" || r.recommendation === "strong_hire");
    const hireAcc = hireOnes.length > 0
      ? hireOnes.filter((r) => r.hire_outcome === "hired").length / hireOnes.length
      : undefined;

    // パターン分類
    let pattern: InterviewerStat["pattern"];
    if (sd >= 1.0) pattern = "volatile";
    else if (bias >= 0.5) pattern = "lenient";
    else if (bias <= -0.5) pattern = "strict";
    else pattern = "balanced";

    stats.push({
      interviewer_id,
      evaluations: recs.length,
      mean_overall: Number(m.toFixed(2)),
      stdev: Number(sd.toFixed(2)),
      bias: Number(bias.toFixed(2)),
      consistency: Number(consistency.toFixed(2)),
      hire_accuracy: hireAcc !== undefined ? Number(hireAcc.toFixed(2)) : undefined,
      pattern,
      per_axis: {
        technical:     Number(mean(recs.map((r) => r.technical)).toFixed(2)),
        communication: Number(mean(recs.map((r) => r.communication)).toFixed(2)),
        culture_fit:   Number(mean(recs.map((r) => r.culture_fit)).toFixed(2)),
        leadership:    Number(mean(recs.map((r) => r.leadership)).toFixed(2)),
      },
    });
  }

  return stats.sort((a, b) => b.evaluations - a.evaluations);
}

/** 同じ候補者を複数の面接官が評価した場合の合意度（mean abs diff） */
export function computePairwiseAgreement(records: FeedbackRecord[]): AgreementCell[] {
  const byCandidate = new Map<string, FeedbackRecord[]>();
  for (const r of records) {
    const cur = byCandidate.get(r.candidate_id) ?? [];
    cur.push(r);
    byCandidate.set(r.candidate_id, cur);
  }

  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const acc = new Map<string, { diffs: number[]; a: string; b: string }>();

  for (const recs of byCandidate.values()) {
    if (recs.length < 2) continue;
    for (let i = 0; i < recs.length; i++) {
      for (let j = i + 1; j < recs.length; j++) {
        const a = recs[i], b = recs[j];
        const key = pairKey(a.interviewer_id, b.interviewer_id);
        const cur = acc.get(key) ?? { diffs: [], a: a.interviewer_id < b.interviewer_id ? a.interviewer_id : b.interviewer_id, b: a.interviewer_id < b.interviewer_id ? b.interviewer_id : a.interviewer_id };
        cur.diffs.push(Math.abs(a.overall - b.overall));
        acc.set(key, cur);
      }
    }
  }

  return [...acc.values()].map((v) => ({
    interviewer_a: v.a,
    interviewer_b: v.b,
    pairs: v.diffs.length,
    mean_abs_diff: Number(mean(v.diffs).toFixed(2)),
  })).sort((a, b) => b.pairs - a.pairs);
}

export const PATTERN_META: Record<
  InterviewerStat["pattern"],
  { label: string; emoji: string; color: string; description: string }
> = {
  strict:   { label: "厳しめ",  emoji: "📉", color: "border-red-300 bg-red-50 text-red-800",
              description: "全体平均より低く採点。候補者を逃すリスク注意" },
  balanced: { label: "バランス", emoji: "⚖️", color: "border-emerald-300 bg-emerald-50 text-emerald-800",
              description: "全体と整合した採点。calibration の基準" },
  lenient:  { label: "甘め",    emoji: "📈", color: "border-amber-300 bg-amber-50 text-amber-800",
              description: "全体平均より高く採点。後段で覆りやすい" },
  volatile: { label: "バラツキ大", emoji: "🌪️", color: "border-purple-300 bg-purple-50 text-purple-800",
              description: "標準偏差が大きく評価が安定しない" },
};
