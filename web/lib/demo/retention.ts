/**
 * 離職リスクのデモデータ。
 * 5 つの要因スコア (0-100) を集約してリスクレベル判定。
 * 本番では機械学習 or ルールベースで日次計算。
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "緊急",
};

export const LEVEL_TONE: Record<RiskLevel, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-orange-300 bg-orange-50 text-orange-900",
  critical: "border-red-300 bg-red-50 text-red-900",
};

export const LEVEL_DOT: Record<RiskLevel, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export type RiskFactors = {
  // 各因子は 0-100、高いほどリスク
  satisfaction: number;       // パルス・サーベイ低下
  manager_relation: number;   // 1on1 ムード・頻度
  compensation_gap: number;    // 給与帯との乖離
  career_growth: number;       // 昇進・成長機会
  workload: number;            // 残業・休暇取得率
  tenure: number;              // 勤続年数（短すぎor長すぎ）
};

export type RetentionRecord = {
  employee_id: string;
  score: number;            // 総合 (0-100、高いほどリスク)
  level: RiskLevel;
  factors: RiskFactors;
  trend_30d: number;         // 30日変化（+ で悪化）
  signals: string[];         // 「直近1on1のムード低下」等の文字列シグナル
  last_evaluated_at: string;
  recommended_actions: string[];
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

// ─── スコア計算ヘルパ（demo） ─────
const levelOf = (score: number): RiskLevel => {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "medium";
  return "low";
};

const aggregate = (f: RiskFactors): number => {
  // 重み: satisfaction 0.25, manager 0.20, comp 0.20, career 0.15, workload 0.15, tenure 0.05
  return Math.round(
    f.satisfaction * 0.25 +
    f.manager_relation * 0.20 +
    f.compensation_gap * 0.20 +
    f.career_growth * 0.15 +
    f.workload * 0.15 +
    f.tenure * 0.05
  );
};

// employee_id をキーに demo 用の固定スコアを生成
export const DEMO_RETENTION: RetentionRecord[] = (() => {
  // 高リスクシナリオを意図的に配置（離職アラート発火の演出）
  const hiCases: Record<string, Partial<RiskFactors> & { signals: string[]; actions: string[] }> = {
    // マーケMgr 南部 — 業務量過多 + 評価不満
    e23: { satisfaction: 78, manager_relation: 50, compensation_gap: 65, career_growth: 60, workload: 85, tenure: 30,
      signals: ["パルスサーベイ 3 ヶ月連続で低下", "1on1 ムード down × 2 回", "残業時間 80h+/月 継続", "Q1 評価への不満を 1on1 で表明"],
      actions: ["緊急 1on1 で意向確認 (今週中)", "業務量再分配・サポート増強", "Q2 評価設計を上長と再ディスカッション", "報酬見直しを検討（上限近く）"] },
    // 中尾（事業開発・3年目）— キャリア停滞
    e18: { satisfaction: 60, manager_relation: 40, compensation_gap: 55, career_growth: 80, workload: 55, tenure: 50,
      signals: ["昇格対象外と通知後の意欲低下", "学習機会への要望増加", "他社への興味の発言（バディ経由）"],
      actions: ["キャリアラダー説明と ロードマップ提示", "ストレッチアサインメント を 1 件付与", "メンター制度の活用提案"] },
    // Sara Aimen — 海外勤務でのフィット課題
    e22: { satisfaction: 55, manager_relation: 60, compensation_gap: 35, career_growth: 65, workload: 60, tenure: 40,
      signals: ["時差・言語ストレスの言及", "現地マネージャーとの 1on1 頻度不足"],
      actions: ["ローカルマネージャー設定の検討", "英語ベースの 1on1 強化"] },
    // Tirza Grace（マーケ・インドネシア）
    e24: { satisfaction: 70, manager_relation: 65, compensation_gap: 40, career_growth: 55, workload: 75, tenure: 30,
      signals: ["業務量負荷の高い状態が継続", "現地通貨ベース報酬への満足度低下"],
      actions: ["業務量リバランス", "現地通貨報酬テーブル見直しを HR 検討"] },
  };

  const midCases: Record<string, Partial<RiskFactors> & { signals: string[]; actions: string[] }> = {
    e10: { satisfaction: 35, manager_relation: 30, compensation_gap: 50, career_growth: 50, workload: 45, tenure: 30,
      signals: ["技術成長の踊り場感", "週次のコードレビュー対応負荷"],
      actions: ["新領域の OJT 機会提供", "テックリード ロール候補として育成"] },
    e25: { satisfaction: 40, manager_relation: 45, compensation_gap: 30, career_growth: 55, workload: 50, tenure: 20,
      signals: ["新人故の不安・孤立感"],
      actions: ["バディとの 1on1 増加", "オンボーディング遅延の確認"] },
    e16: { satisfaction: 35, manager_relation: 40, compensation_gap: 50, career_growth: 35, workload: 55, tenure: 40,
      signals: ["管理業務負担増の言及"],
      actions: ["マネジメント研修を提供", "業務委譲の検討"] },
    e15: { satisfaction: 45, manager_relation: 35, compensation_gap: 45, career_growth: 50, workload: 40, tenure: 25,
      signals: ["デザインリードへの昇格意欲表明"],
      actions: ["明確な昇格基準の提示", "シニア候補としての OJT"] },
  };

  const records: RetentionRecord[] = [];

  // 全社員に対して low ベース、高リスク・中リスクを上書き
  const allEmployeeIds = ["e1","e2","e3","e4","e5","e6","e7","e8","e9","e10",
    "e11","e12","e13","e14","e15","e16","e17","e18","e19","e20",
    "e21","e22","e23","e24","e25","e26","e27","e28","e29","e30"];

  for (const eid of allEmployeeIds) {
    const seed = eid.charCodeAt(eid.length - 1) % 7;
    let factors: RiskFactors = {
      satisfaction: 15 + seed * 3,
      manager_relation: 10 + seed * 2,
      compensation_gap: 20 + seed * 4,
      career_growth: 15 + seed * 5,
      workload: 25 + seed * 3,
      tenure: 20,
    };
    let signals: string[] = [];
    let actions: string[] = [];

    if (hiCases[eid]) {
      factors = { ...factors, ...hiCases[eid] };
      signals = hiCases[eid].signals!;
      actions = hiCases[eid].actions!;
    } else if (midCases[eid]) {
      factors = { ...factors, ...midCases[eid] };
      signals = midCases[eid].signals!;
      actions = midCases[eid].actions!;
    }

    const score = aggregate(factors);
    records.push({
      employee_id: eid,
      score,
      level: levelOf(score),
      factors,
      trend_30d: hiCases[eid] ? Math.round(8 + seed) : midCases[eid] ? Math.round(3 + seed) : -2 - seed,
      signals,
      recommended_actions: actions,
      last_evaluated_at: day(-Math.floor(seed / 2)),
    });
  }

  return records.sort((a, b) => b.score - a.score);
})();

export function recordsByLevel(level: RiskLevel): RetentionRecord[] {
  return DEMO_RETENTION.filter((r) => r.level === level);
}

export function highRiskRecords(): RetentionRecord[] {
  return DEMO_RETENTION.filter((r) => r.level === "high" || r.level === "critical");
}

export function recordsByDepartment(employees: { id: string; department_id: string }[]): Map<string, RetentionRecord[]> {
  const map = new Map<string, RetentionRecord[]>();
  for (const r of DEMO_RETENTION) {
    const e = employees.find((x) => x.id === r.employee_id);
    if (!e) continue;
    if (!map.has(e.department_id)) map.set(e.department_id, []);
    map.get(e.department_id)!.push(r);
  }
  return map;
}

export function avgScoreOf(records: RetentionRecord[]): number {
  if (records.length === 0) return 0;
  return Math.round(records.reduce((s, r) => s + r.score, 0) / records.length);
}

export const FACTOR_LABEL: Record<keyof RiskFactors, string> = {
  satisfaction: "満足度低下",
  manager_relation: "マネージャー関係",
  compensation_gap: "報酬ギャップ",
  career_growth: "キャリア成長",
  workload: "業務負荷",
  tenure: "勤続年数",
};
