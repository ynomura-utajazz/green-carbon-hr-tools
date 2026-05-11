/**
 * 候補者の自動判定（書類選考の半自動化）。
 *
 * 出力：4 つの判定 + 理由のリスト
 *  - "advance"    : 次ステップに進める（Strong Match）
 *  - "review"     : 人の判断で進める（Borderline）
 *  - "park"       : 別ポジションを検討（Skill mismatch）
 *  - "reject"     : 不採用（Hard requirements 未充足）
 *
 * ロジック：role-fit + similarity + キーワードベースのレッドフラグ。
 * AI で言語化したい場合は別途 /api/ai/recruiting-summary を使う。
 */

import type { Candidate, Position } from "@/lib/demo/recruiting";
import type { TalentProfile } from "@/lib/demo/talent-profiles";
import { computeRoleFit } from "./role-fit";
import { computeCandidateSimilarity } from "./similarity";

export type AutoScreenDecision = "advance" | "review" | "park" | "reject";

export type AutoScreenResult = {
  decision: AutoScreenDecision;
  confidence: number;       // 0..1
  /** スコア。比較しやすいよう 0..100 整数に丸める */
  score: number;
  reasons: string[];        // 採用判断の根拠
  flags: string[];          // 注意点・レッドフラグ
  best_position?: { id: string; title: string; fit_pct: number };
  similar_top?: { name: string; pct: number; high_perf: boolean };
};

const RED_FLAGS = [
  { pattern: /短期離職|半年で|3ヶ月で/, label: "短期離職の経歴" },
  { pattern: /訴訟|懲戒|解雇/, label: "コンプライアンス上の懸念ワード" },
  { pattern: /副業 NG|副業不可/, label: "弊社の副業ポリシーと相違" },
];

export function autoScreen(
  candidate: Candidate,
  positions: Position[],
  employees: { id: string; full_name: string; job_title: string }[],
  profiles: TalentProfile[],
): AutoScreenResult {
  // ── ロールフィット ─────────────
  const fits = computeRoleFit(candidate, positions);
  const best = fits[0];

  // ── 類似社員 ────────────────────
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const similar = computeCandidateSimilarity(
    candidate,
    profiles
      .map((p) => ({ profile: p, emp: empMap.get(p.employee_id)! }))
      .filter((x) => x.emp),
  );
  const topSim = similar[0];
  const topHighPerf = similar.find((s) => s.is_high_performer);

  // ── レッドフラグ検出 ───────────
  const text = [candidate.notes, candidate.current_role, candidate.current_company].filter(Boolean).join(" ");
  const flags: string[] = [];
  for (const f of RED_FLAGS) {
    if (f.pattern.test(text)) flags.push(f.label);
  }

  const reasons: string[] = [];

  if (best) {
    reasons.push(
      `「${best.position_title}」へのフィット ${Math.round(best.total * 100)}%`,
    );
    if (best.matched_skills.length > 0) {
      reasons.push(`マッチスキル: ${best.matched_skills.slice(0, 3).join("・")}`);
    }
    if (best.missing_skills.length > 0) {
      reasons.push(`未保有スキル: ${best.missing_skills.slice(0, 2).join("・")}`);
    }
  }

  if (topHighPerf) {
    reasons.push(
      `活躍社員「${topHighPerf.full_name}」と類似度 ${Math.round(topHighPerf.similarity.total * 100)}%`,
    );
  }

  // ── 判定ロジック ────────────────
  const fitPct = best ? best.total : 0;
  const simPct = topHighPerf ? topHighPerf.similarity.total : 0;
  const composite = fitPct * 0.7 + simPct * 0.3;

  let decision: AutoScreenDecision;
  let confidence: number;

  if (flags.length > 0 && flags.some((f) => f.includes("コンプライアンス"))) {
    decision = "reject";
    confidence = 0.9;
  } else if (composite >= 0.7) {
    decision = "advance";
    confidence = Math.min(0.95, composite + 0.05);
  } else if (composite >= 0.45) {
    decision = "review";
    confidence = 0.6;
  } else if (best && best.total >= 0.3 && fits.some((f) => f.total > 0.5 && f.position_id !== best.position_id)) {
    // 第 1 希望は弱いが、別ポジションでフィットがある
    decision = "park";
    confidence = 0.7;
  } else {
    decision = "reject";
    confidence = 0.7;
  }

  return {
    decision,
    confidence: Number(confidence.toFixed(2)),
    score: Math.round(composite * 100),
    reasons,
    flags,
    best_position: best
      ? { id: best.position_id, title: best.position_title, fit_pct: Math.round(best.total * 100) }
      : undefined,
    similar_top: topSim
      ? {
          name: topSim.full_name,
          pct: Math.round(topSim.similarity.total * 100),
          high_perf: topSim.is_high_performer,
        }
      : undefined,
  };
}

export const DECISION_META: Record<
  AutoScreenDecision,
  { label: string; tone: "success" | "warning" | "danger" | "outline"; emoji: string; description: string }
> = {
  advance: { label: "次ステップへ進める", tone: "success", emoji: "✅", description: "Strong Match。書類通過 → 一次面接が妥当" },
  review:  { label: "要審査",            tone: "warning", emoji: "🤔", description: "ボーダー。人の判断で進めるか決める" },
  park:    { label: "別ポジション検討",  tone: "warning", emoji: "🅿️", description: "現ポジションは合わないが他に候補あり" },
  reject:  { label: "不採用",            tone: "danger",  emoji: "✋", description: "必須要件 / レッドフラグで通過困難" },
};
