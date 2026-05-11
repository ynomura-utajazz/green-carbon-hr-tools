/**
 * 応募者体験スコア（ESI / NPS）のデモデータ。
 *
 * NPS = % Promoters (9-10) − % Detractors (0-6)
 *  - +50 以上: 優秀
 *  - +20 〜 +50: 良好
 *  - 0 〜 +20: 改善余地
 *  - 負: 要改善
 */

import type { CandidateSource, CandidateStage } from "./recruiting";

export type CandidateFeedback = {
  id: string;
  candidate_id?: string;
  /** 0-10 NPS スコア */
  nps: number;
  /** 体験のどこが良かったか / 悪かったか */
  positive?: string;
  negative?: string;
  /** ステージ（どのステージ後の回答か） */
  stage_at_feedback: CandidateStage;
  source: CandidateSource;
  /** 採用結果（hired / not_hired / pending） */
  outcome: "hired" | "not_hired" | "withdrawn" | "pending";
  /** 募集職種カテゴリ */
  role: string;
  submitted_at: string; // ISO
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const DEMO_CANDIDATE_FEEDBACK: CandidateFeedback[] = [
  // Promoters
  { id: "fb-1", candidate_id: "cand-2", nps: 10, positive: "面接官が技術的に深く、対話できた。", stage_at_feedback: "offer", source: "contractor_conversion", outcome: "hired", role: "シニアエンジニア", submitted_at: day(-2) },
  { id: "fb-2", candidate_id: "cand-7", nps: 9,  positive: "選考が早く、フィードバックが具体的。", stage_at_feedback: "hired", source: "referral", outcome: "hired", role: "シニアエンジニア", submitted_at: day(-30) },
  { id: "fb-3",                     nps: 9,  positive: "カジュアル面談で会社の将来像が伝わった。", stage_at_feedback: "applied", source: "linkedin", outcome: "withdrawn", role: "プロダクトマネージャー", submitted_at: day(-15) },
  { id: "fb-4", candidate_id: "cand-1", nps: 10, positive: "全面接官が候補者を尊重していた。", stage_at_feedback: "final", source: "referral", outcome: "pending", role: "シニアエンジニア", submitted_at: day(-3) },
  { id: "fb-5",                     nps: 9,  positive: "JD が明確で応募ハードルが低かった。", stage_at_feedback: "applied", source: "wantedly", outcome: "pending", role: "ソフトウェアエンジニア", submitted_at: day(-12) },

  // Passives
  { id: "fb-6", candidate_id: "cand-3", nps: 7,  positive: "面接官は丁寧。", negative: "選考期間が長かった（応募〜2 次まで 4 週間）。", stage_at_feedback: "interview_2", source: "linkedin", outcome: "not_hired", role: "シニアエンジニア", submitted_at: day(-10) },
  { id: "fb-7",                     nps: 8,  positive: "プロダクト紹介が分かりやすい。", negative: "レスポンス間隔が一定でない。", stage_at_feedback: "screening", source: "agent", outcome: "not_hired", role: "ML エンジニア", submitted_at: day(-22) },
  { id: "fb-8", candidate_id: "cand-9", nps: 8,  positive: "技術的に学びがあった。", stage_at_feedback: "interview_1", source: "linkedin", outcome: "withdrawn", role: "ML エンジニア", submitted_at: day(-18) },

  // Detractors
  { id: "fb-9", candidate_id: "cand-5", nps: 4,  negative: "最終面接で年収レンジを聞かれず、内定後にズレが判明。条件交渉が前提になっていない。", stage_at_feedback: "offer", source: "agent", outcome: "withdrawn", role: "シニアエンジニア", submitted_at: day(-100) },
  { id: "fb-10",                    nps: 3,  negative: "書類選考の結果連絡が 2 週間来ず、別社に決定。", stage_at_feedback: "screening", source: "indeed", outcome: "not_hired", role: "ソフトウェアエンジニア", submitted_at: day(-45) },
  { id: "fb-11",                    nps: 5,  negative: "面接官によって質問の質に差があった。1 次の方が深かった。", stage_at_feedback: "interview_2", source: "wantedly", outcome: "not_hired", role: "PdM", submitted_at: day(-25) },
  { id: "fb-12", candidate_id: "cand-6", nps: 6,  negative: "ビザサポート方針が面接段階で曖昧だった。", stage_at_feedback: "final", source: "linkedin", outcome: "pending", role: "シニアエンジニア", submitted_at: day(-5) },

  // Mixed
  { id: "fb-13",                    nps: 9,  positive: "経営層の話が直接聞けて将来像が明確に。", stage_at_feedback: "final", source: "referral", outcome: "pending", role: "BD マネージャー", submitted_at: day(-8) },
  { id: "fb-14",                    nps: 7,  positive: "オンボーディング資料を事前に共有してくれた。", negative: "オファー額の根拠説明が薄かった。", stage_at_feedback: "offer", source: "linkedin", outcome: "hired", role: "デザイナー", submitted_at: day(-60) },
  { id: "fb-15",                    nps: 10, positive: "選考自体が学びになる対話だった。落ちても応援したい。", stage_at_feedback: "final", source: "direct", outcome: "not_hired", role: "PdM", submitted_at: day(-40) },
];

export type NpsBreakdown = {
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number; // -100 〜 +100
};

export function computeNps(feedback: CandidateFeedback[]): NpsBreakdown {
  const total = feedback.length;
  if (total === 0) return { total: 0, promoters: 0, passives: 0, detractors: 0, nps: 0 };
  const promoters = feedback.filter((f) => f.nps >= 9).length;
  const passives  = feedback.filter((f) => f.nps >= 7 && f.nps <= 8).length;
  const detractors = feedback.filter((f) => f.nps <= 6).length;
  const nps = Math.round(((promoters - detractors) / total) * 100);
  return { total, promoters, passives, detractors, nps };
}
