/**
 * 面接フィードバック・スコアの履歴データ。
 * Calibration（複数面接官の偏り分析）に使う。
 *
 * 各レコードは「ある面接官 × ある候補者 × あるラウンド」の評価。
 */

export type FeedbackRecord = {
  id: string;
  interviewer_id: string;
  candidate_id: string;
  candidate_name: string;
  position_title: string;
  /** 1-5 整数。総合評価 */
  overall: number;
  /** 0-5 整数。各軸 */
  technical: number;
  communication: number;
  culture_fit: number;
  leadership: number;
  /** 採用推薦：strong_hire / hire / review（保留・要追加面接）/ no_hire / strong_no_hire */
  recommendation: "strong_hire" | "hire" | "review" | "no_hire" | "strong_no_hire";
  /** 採用結果（後から判明する。なければ pending） */
  hire_outcome: "hired" | "not_hired" | "pending";
  round: string;
  conducted_at: string;
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

/**
 * デモ用：8 名の面接官 × 30+ 候補者の評価。
 * 意図的に偏りを仕込む（後で calibration が「○○さんは平均が高い」と検出できるように）：
 *  - e1（CEO）: 全体的に厳しめ（平均 3.0）
 *  - e8（VPoE）: バランス良い（平均 3.6）
 *  - e9（テックリード）: 技術評価は厳しいが他は甘い
 *  - e2（CHRO）: 全体的に甘め（平均 4.1）— 過大評価バイアス
 *  - e3（COO）: 中央値型
 *  - e4（CPO）: バラツキ大（分散高）
 */
export const DEMO_INTERVIEW_FEEDBACK: FeedbackRecord[] = [
  // CEO（e1）— 平均 3.0、厳しめ
  fb("fb-1",  "e1", "cand-1", "田中 浩二", "シニアエンジニア",       3, 4, 3, 3, 3, "hire",     "pending",   "最終面接", -2),
  fb("fb-2",  "e1", "cand-2", "Raj Patel", "シニアエンジニア",        4, 4, 4, 4, 4, "hire",     "pending",   "最終面接", -1),
  fb("fb-3",  "e1", "cand-3", "Sarah Chen", "シニアエンジニア",        2, 3, 2, 2, 2, "no_hire",  "not_hired", "最終面接", -10),
  fb("fb-4",  "e1", "cand-5", "中田 健",   "シニアエンジニア",        2, 3, 2, 3, 2, "no_hire",  "not_hired", "最終面接", -120),
  fb("fb-5",  "e1", "cand-6", "Park Minjun","シニアエンジニア",       3, 4, 3, 3, 3, "hire",     "pending",   "最終面接", -3),

  // CHRO（e2）— 平均 4.1、甘め（バイアス）
  fb("fb-10", "e2", "cand-1", "田中 浩二",  "シニアエンジニア",       5, 5, 5, 4, 4, "strong_hire", "pending",   "最終面接", -2),
  fb("fb-11", "e2", "cand-2", "Raj Patel",  "シニアエンジニア",       5, 4, 5, 5, 4, "strong_hire", "pending",   "最終面接", -1),
  fb("fb-12", "e2", "cand-3", "Sarah Chen", "シニアエンジニア",       4, 4, 4, 4, 3, "hire",        "not_hired", "最終面接", -10),
  fb("fb-13", "e2", "cand-5", "中田 健",    "シニアエンジニア",       4, 4, 4, 4, 4, "hire",        "not_hired", "最終面接", -120),
  fb("fb-14", "e2", "cand-6", "Park Minjun","シニアエンジニア",       4, 4, 4, 4, 4, "hire",        "pending",   "最終面接", -3),
  fb("fb-15", "e2", "cand-4", "山本 涼",    "シニアエンジニア",       4, 4, 4, 4, 4, "hire",        "pending",   "1次面接",  -10),

  // VPoE（e8）— 平均 3.6、バランス
  fb("fb-20", "e8", "cand-1", "田中 浩二",  "シニアエンジニア",       4, 5, 4, 4, 3, "hire",        "pending",   "2次面接",  -5),
  fb("fb-21", "e8", "cand-2", "Raj Patel",  "シニアエンジニア",       5, 5, 4, 5, 4, "strong_hire", "pending",   "2次面接",  -3),
  fb("fb-22", "e8", "cand-3", "Sarah Chen", "シニアエンジニア",       3, 4, 3, 3, 2, "review",      "not_hired", "2次面接",  -15),
  fb("fb-23", "e8", "cand-5", "中田 健",    "シニアエンジニア",       3, 3, 3, 4, 3, "review",      "not_hired", "2次面接",  -130),
  fb("fb-24", "e8", "cand-4", "山本 涼",    "シニアエンジニア",       3, 3, 3, 3, 2, "review",      "pending",   "2次面接",  -8),
  fb("fb-25", "e8", "cand-6", "Park Minjun","シニアエンジニア",       4, 4, 4, 3, 3, "hire",        "pending",   "2次面接",  -7),
  fb("fb-26", "e8", "cand-7", "別候補A",    "シニアエンジニア",       4, 4, 4, 4, 3, "hire",        "hired",     "2次面接",  -45),
  fb("fb-27", "e8", "cand-8", "別候補B",    "シニアエンジニア",       3, 3, 3, 3, 3, "review",      "not_hired", "2次面接",  -50),

  // テックリード（e9）— 技術 5、他軸 3 寄り（技術偏重）
  fb("fb-30", "e9", "cand-1", "田中 浩二",  "シニアエンジニア",       4, 5, 3, 3, 3, "hire",        "pending",   "1次面接",  -10),
  fb("fb-31", "e9", "cand-2", "Raj Patel",  "シニアエンジニア",       5, 5, 4, 4, 4, "strong_hire", "pending",   "1次面接",  -8),
  fb("fb-32", "e9", "cand-3", "Sarah Chen", "シニアエンジニア",       2, 3, 2, 2, 2, "no_hire",     "not_hired", "1次面接",  -22),
  fb("fb-33", "e9", "cand-4", "山本 涼",    "シニアエンジニア",       3, 4, 3, 3, 2, "review",      "pending",   "1次面接",  -12),
  fb("fb-34", "e9", "cand-6", "Park Minjun","シニアエンジニア",       4, 5, 3, 3, 3, "hire",        "pending",   "1次面接",  -12),
  fb("fb-35", "e9", "cand-7", "別候補A",    "シニアエンジニア",       4, 5, 3, 3, 3, "hire",        "hired",     "1次面接",  -50),
  fb("fb-36", "e9", "cand-8", "別候補B",    "シニアエンジニア",       2, 3, 2, 2, 2, "no_hire",     "not_hired", "1次面接",  -55),

  // COO（e3）— 中央値型
  fb("fb-40", "e3", "cand-1", "田中 浩二",  "シニアエンジニア",       3, 3, 4, 3, 3, "hire",        "pending",   "最終面接", -2),
  fb("fb-41", "e3", "cand-9", "BD候補A",    "リージョナル BD",        4, 3, 5, 4, 4, "hire",        "pending",   "1次面接",  -5),
  fb("fb-42", "e3", "cand-10", "BD候補B",   "リージョナル BD",        3, 3, 4, 3, 3, "review",      "not_hired", "1次面接",  -20),

  // CPO（e4）— バラツキ大（分散高）
  fb("fb-50", "e4", "cand-1", "田中 浩二",  "シニアエンジニア",       5, 5, 5, 5, 4, "strong_hire", "pending",   "2次面接",  -5),
  fb("fb-51", "e4", "cand-3", "Sarah Chen", "シニアエンジニア",       1, 2, 1, 2, 1, "strong_no_hire","not_hired", "2次面接", -15),
  fb("fb-52", "e4", "cand-4", "山本 涼",    "シニアエンジニア",       4, 4, 4, 4, 3, "hire",        "pending",   "2次面接",  -8),
  fb("fb-53", "e4", "cand-11", "PM候補A",   "プロダクトマネージャー", 5, 4, 5, 5, 5, "strong_hire", "hired",     "2次面接",  -60),
  fb("fb-54", "e4", "cand-12", "PM候補B",   "プロダクトマネージャー", 2, 3, 2, 2, 2, "no_hire",     "not_hired", "2次面接",  -65),

  // デザインリード（e14）
  fb("fb-60", "e14", "cand-13", "デザイン候補A", "プロダクトデザイナー", 4, 3, 5, 4, 5, "hire",        "hired",     "2次面接",  -70),
  fb("fb-61", "e14", "cand-14", "デザイン候補B", "プロダクトデザイナー", 3, 3, 3, 3, 3, "review",      "not_hired", "2次面接",  -75),
  fb("fb-62", "e14", "cand-15", "デザイン候補C", "プロダクトデザイナー", 4, 4, 4, 4, 4, "hire",        "pending",   "2次面接",  -10),

  // リクルーター（e6）
  fb("fb-70", "e6", "cand-3", "Sarah Chen", "シニアエンジニア",       3, 3, 3, 3, 3, "review",      "not_hired", "書類選考", -20),
  fb("fb-71", "e6", "cand-4", "山本 涼",    "シニアエンジニア",       3, 3, 4, 3, 3, "hire",        "pending",   "書類選考", -12),
  fb("fb-72", "e6", "cand-6", "Park Minjun","シニアエンジニア",       3, 3, 3, 3, 3, "review",      "pending",   "書類選考", -5),
];

function fb(
  id: string, interviewer_id: string, candidate_id: string, candidate_name: string,
  position_title: string,
  overall: number, technical: number, communication: number,
  culture_fit: number, leadership: number,
  recommendation: FeedbackRecord["recommendation"],
  hire_outcome: FeedbackRecord["hire_outcome"],
  round: string, dayOffset: number,
): FeedbackRecord {
  return {
    id, interviewer_id, candidate_id, candidate_name, position_title,
    overall, technical, communication, culture_fit, leadership,
    recommendation, hire_outcome, round, conducted_at: day(dayOffset),
  };
}
