/**
 * タレントレビュー & サクセション計画のデモデータ。
 *
 *  - 9-box matrix（performance × potential）
 *  - キーポジション × 後継候補 × 準備度
 *  - retirement risk / flight risk のフラグ
 */

export type Performance = "low" | "med" | "high";
export type Potential = Performance;
/** 9-box の 9 セル */
export type NineBoxCell = `${Performance}_${Potential}`;

export type TalentReviewEntry = {
  employee_id: string;
  performance: Performance;
  potential: Potential;
  /** ロール変更可能性のステージ（now / 1y / 2y / 3y+） */
  ready_for_next: "now" | "1y" | "2y" | "3y+";
  /** 離職リスク（1-5） */
  flight_risk: number;
  /** 退職リスク（年齢・キャリア節目）  */
  retirement_risk?: boolean;
  /** review コメント */
  notes?: string;
};

export type KeyPosition = {
  id: string;
  title: string;
  /** 現任者 */
  incumbent_id: string;
  /** クリティカリティ（business 影響度 1-5） */
  criticality: number;
  /** 現任者のリスク（離脱の可能性） */
  vacancy_risk: "low" | "med" | "high";
  /** サクセサー候補（社員ID + 準備度 + ノート） */
  successors: {
    employee_id: string;
    /** ready_now / ready_1y / ready_2y_3y / develop */
    readiness: "now" | "1y" | "2y_3y" | "develop";
    note?: string;
  }[];
};

export const NINE_BOX_LABEL: Record<NineBoxCell, { label: string; emoji: string; cls: string }> = {
  high_high: { label: "Stars",            emoji: "⭐", cls: "bg-emerald-200 text-emerald-900 border-emerald-400" },
  high_med:  { label: "High Performers",  emoji: "💪", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  high_low:  { label: "Solid Pros",       emoji: "🛡️", cls: "bg-blue-100 text-blue-800 border-blue-300" },
  med_high:  { label: "Future Leaders",   emoji: "🚀", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  med_med:   { label: "Core Players",     emoji: "👤", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  med_low:   { label: "Steady",           emoji: "📌", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  low_high:  { label: "Diamonds",         emoji: "💎", cls: "bg-blue-100 text-blue-800 border-blue-300" },
  low_med:   { label: "Inconsistent",     emoji: "🔄", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  low_low:   { label: "Risk",             emoji: "⚠️", cls: "bg-red-100 text-red-800 border-red-300" },
};

export const READINESS_LABEL: Record<KeyPosition["successors"][number]["readiness"], { label: string; cls: string }> = {
  now:        { label: "今すぐ",       cls: "bg-emerald-100 text-emerald-800" },
  "1y":       { label: "1 年以内",     cls: "bg-blue-100 text-blue-800" },
  "2y_3y":    { label: "2-3 年",       cls: "bg-amber-100 text-amber-800" },
  develop:    { label: "育成段階",     cls: "bg-muted text-muted-foreground" },
};

export const DEMO_TALENT_REVIEW: TalentReviewEntry[] = [
  // ─ Stars ─
  { employee_id: "e1", performance: "high", potential: "high", ready_for_next: "now",  flight_risk: 1, notes: "創業 CEO。後継は別軸で考える必要あり" },
  { employee_id: "e8", performance: "high", potential: "high", ready_for_next: "1y",   flight_risk: 2, notes: "次世代 CTO 候補。事業側との連携経験を積めば即戦力" },
  { employee_id: "e3", performance: "high", potential: "high", ready_for_next: "now",  flight_risk: 3, notes: "ASEAN 事業を 1 人で開拓。COO → CEO 候補。flight risk 注意" },
  { employee_id: "e2", performance: "high", potential: "high", ready_for_next: "1y",   flight_risk: 1, notes: "戦略人事のスペシャリスト。CHRO ロール継続" },
  { employee_id: "e14", performance: "high", potential: "high", ready_for_next: "1y",  flight_risk: 2, notes: "デザインリードから VP of Design 候補" },

  // ─ High Performers / Future Leaders ─
  { employee_id: "e4", performance: "high", potential: "high", ready_for_next: "1y",   flight_risk: 2, notes: "CPO として非常に優秀。CEO 候補にもなり得る" },
  { employee_id: "e9", performance: "high", potential: "med",  ready_for_next: "1y",   flight_risk: 4, notes: "テックリード。マネジメント志向は弱い。技術深耕の道で支援" },
  { employee_id: "e10", performance: "high", potential: "med", ready_for_next: "2y",   flight_risk: 2, notes: "シニアエンジニア。技術の幅を広げる時期" },

  // ─ Solid / Core ─
  { employee_id: "e15", performance: "high", potential: "low", ready_for_next: "3y+",  flight_risk: 2, notes: "プロダクトデザインの実務スペシャリスト。専門深耕が向いている" },
  { employee_id: "e11", performance: "med",  potential: "high", ready_for_next: "2y",  flight_risk: 3, retirement_risk: false, notes: "ジャカルタ拠点。グローバル CTO 候補の可能性" },
  { employee_id: "e12", performance: "high", potential: "low", ready_for_next: "3y+",  flight_risk: 3, notes: "ベトナム拠点。実装速度が強み" },

  // ─ Steady ─
  { employee_id: "e13", performance: "low", potential: "med", ready_for_next: "3y+",   flight_risk: 1, notes: "新卒 1 年目。育成中" },
  { employee_id: "e5",  performance: "med", potential: "med", ready_for_next: "2y",    flight_risk: 2, notes: "HRBP。安定したパフォーマンス" },
  { employee_id: "e6",  performance: "med", potential: "med", ready_for_next: "2y",    flight_risk: 2, notes: "リクルーター。専門深耕中" },
  { employee_id: "e7",  performance: "med", potential: "med", ready_for_next: "3y+",   flight_risk: 2, notes: "L&D。韓国市場のスペシャリスト" },
];

export const DEMO_KEY_POSITIONS: KeyPosition[] = [
  {
    id: "kp-1",
    title: "CEO",
    incumbent_id: "e1",
    criticality: 5,
    vacancy_risk: "low",
    successors: [
      { employee_id: "e3", readiness: "1y",     note: "ASEAN 事業の知見、外向き発信力。バックグラウンドの幅を広げ中" },
      { employee_id: "e4", readiness: "2y_3y",  note: "プロダクト視点と数字の両輪。事業全体を見る経験が必要" },
    ],
  },
  {
    id: "kp-2",
    title: "VP of Engineering / CTO",
    incumbent_id: "e8",
    criticality: 5,
    vacancy_risk: "med",
    successors: [
      { employee_id: "e9", readiness: "2y_3y",  note: "技術力◎。マネジメント志向の育成が必要" },
      { employee_id: "e11", readiness: "develop", note: "ジャカルタ拠点。グローバル組織の VP として育成余地" },
    ],
  },
  {
    id: "kp-3",
    title: "COO",
    incumbent_id: "e3",
    criticality: 5,
    vacancy_risk: "high",
    successors: [
      // 現状、COO ポジションへの直接後継候補が薄い → リスク
    ],
  },
  {
    id: "kp-4",
    title: "CHRO",
    incumbent_id: "e2",
    criticality: 4,
    vacancy_risk: "low",
    successors: [
      { employee_id: "e5", readiness: "2y_3y",  note: "HRBP として実務経験豊富。戦略人事の経験を積めば候補" },
    ],
  },
  {
    id: "kp-5",
    title: "VP of Design",
    incumbent_id: "e14",
    criticality: 3,
    vacancy_risk: "low",
    successors: [
      { employee_id: "e15", readiness: "2y_3y", note: "プロダクトデザインの実務トップ。マネジメント経験が必要" },
    ],
  },
];

export function nineBoxCell(p: Performance, pot: Potential): NineBoxCell {
  return `${p}_${pot}`;
}
