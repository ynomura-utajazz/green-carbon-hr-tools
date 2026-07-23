/**
 * ストレスチェックのデモデータ。労安法第66条の10に基づく年1回の実施。
 */

export type StressLevel = "low" | "medium" | "high" | "very_high";

export const LEVEL_LABEL: Record<StressLevel, string> = {
  low: "良好",
  medium: "やや高ストレス",
  high: "高ストレス",
  very_high: "高ストレス（要対応）",
};

export const LEVEL_TONE: Record<StressLevel, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-blue-200 bg-blue-50 text-blue-800",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  very_high: "border-red-300 bg-red-50 text-red-900",
};

export type StressCheckResult = {
  employee_id: string | null;       // 匿名集計のため null 可（HR には個別非開示）
  responded_at: string | null;
  // 4 領域のスコア（0-100、高いほど良好）
  job_demand: number;                // 仕事の負担
  social_support: number;            // 周囲のサポート
  job_satisfaction: number;          // 仕事の満足感
  health_risk: number;                // 心身の不調
  level: StressLevel;
  wants_consultation: boolean;       // 産業医面談希望
  consultation_status?: "pending" | "scheduled" | "completed";
};

export type Campaign = {
  id: string;
  name: string;
  status: "draft" | "active" | "closed" | "analyzed";
  starts_at: string;
  ends_at: string;
  target_count: number;
  response_count: number;
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const DEMO_CAMPAIGNS: Campaign[] = [
  { id: "sc-2026", name: "2026 年度 ストレスチェック", status: "active",   starts_at: day(-7), ends_at: day(14), target_count: 297, response_count: 198 },
  { id: "sc-2025", name: "2025 年度 ストレスチェック", status: "analyzed", starts_at: day(-365), ends_at: day(-345), target_count: 234, response_count: 218 },
  { id: "sc-2024", name: "2024 年度 ストレスチェック", status: "analyzed", starts_at: day(-730), ends_at: day(-710), target_count: 180, response_count: 165 },
];

// 個別結果は匿名化されるため、demo では分布のみ
export const DEMO_RESULTS_2026: StressCheckResult[] = (() => {
  const r: StressCheckResult[] = [];
  // 198 件の回答を分布で生成
  const dist = { low: 142, medium: 38, high: 12, very_high: 6 };
  for (const [level, count] of Object.entries(dist) as [StressLevel, number][]) {
    for (let i = 0; i < count; i++) {
      const variance = (i * 7) % 20 - 10;
      const base = level === "low" ? 75 : level === "medium" ? 60 : level === "high" ? 40 : 25;
      const wantsConsult = level === "high" || level === "very_high" ? Math.random() > 0.4 : false;
      r.push({
        employee_id: null,  // 匿名
        responded_at: day(-Math.floor(Math.random() * 7)),
        job_demand: Math.max(0, Math.min(100, base + variance)),
        social_support: Math.max(0, Math.min(100, base + variance + 5)),
        job_satisfaction: Math.max(0, Math.min(100, base + variance - 3)),
        health_risk: Math.max(0, Math.min(100, base + variance)),
        level,
        wants_consultation: wantsConsult,
        consultation_status: wantsConsult ? (Math.random() > 0.5 ? "scheduled" : "pending") : undefined,
      });
    }
  }
  return r;
})();

// 集団分析結果（部署別）
export type GroupAnalysis = {
  department_id: string;
  total: number;
  responded: number;
  high_stress_count: number;
  total_health_risk_score: number;     // 平均値
  total_support_score: number;
};

export const DEMO_GROUP_ANALYSIS: GroupAnalysis[] = [
  { department_id: "d-corp",    total: 8,  responded: 7,  high_stress_count: 0, total_health_risk_score: 72, total_support_score: 78 },
  { department_id: "d-bizdev",  total: 35, responded: 28, high_stress_count: 2, total_health_risk_score: 68, total_support_score: 70 },
  { department_id: "d-product", total: 12, responded: 10, high_stress_count: 1, total_health_risk_score: 70, total_support_score: 75 },
  { department_id: "d-eng",     total: 75, responded: 60, high_stress_count: 5, total_health_risk_score: 65, total_support_score: 72 },
  { department_id: "d-design",  total: 18, responded: 16, high_stress_count: 1, total_health_risk_score: 73, total_support_score: 80 },
  { department_id: "d-mkt",     total: 25, responded: 18, high_stress_count: 4, total_health_risk_score: 58, total_support_score: 65 },
  { department_id: "d-hr",      total: 12, responded: 11, high_stress_count: 0, total_health_risk_score: 75, total_support_score: 82 },
  { department_id: "d-fin",     total: 18, responded: 14, high_stress_count: 2, total_health_risk_score: 64, total_support_score: 68 },
  { department_id: "d-global",  total: 94, responded: 34, high_stress_count: 3, total_health_risk_score: 70, total_support_score: 73 },
];

export function highStressCount(): number {
  return DEMO_RESULTS_2026.filter((r) => r.level === "high" || r.level === "very_high").length;
}

export function consultationRequests(): number {
  return DEMO_RESULTS_2026.filter((r) => r.wants_consultation).length;
}

export function distributionByLevel(): Record<StressLevel, number> {
  const map: Record<StressLevel, number> = { low: 0, medium: 0, high: 0, very_high: 0 };
  for (const r of DEMO_RESULTS_2026) map[r.level]++;
  return map;
}

// ============================================================================
// 実データ採点ヘルパー（純関数）
//
// 職業性ストレス簡易調査票（4件法・素点 1〜4）を想定した採点規約。
// - survey.questions[].dimension で領域を判定する:
//     'job_demand'      … 仕事の負担（素点が高い＝悪い → 反転）
//     'social_support'  … 周囲のサポート（素点が高い＝良好 → そのまま）
//     'job_satisfaction'… 仕事の満足感（素点が高い＝良好 → そのまま）
//     'health_risk'     … 心身の不調・回復力（素点が高い＝悪い → 反転）
//     'consultation'    … 産業医面談の希望（truthy=希望）
// - 各領域スコア = その領域設問への数値回答の平均を 0〜100「高いほど良好」へ正規化。
//
// 【労安法第66条の10 の配慮】
//   個人結果は事業者(hr_admin)に開示してはならない。本ヘルパーが返す
//   StressCheckResult.employee_id は常に null（匿名固定）で、氏名や respondent_id を
//   個人結果に持ち込まない。事業者へは「レベル分布」と「集団分析（部署別・10名以上）」
//   のみを開示する前提で使用すること。
// ============================================================================

export type StressDimension = "job_demand" | "social_support" | "job_satisfaction" | "health_risk";

/** 採点に必要な最小限の設問情報（surveys.questions jsonb からパースして渡す）。 */
export type ScoringQuestion = {
  id: string;
  dimension: string | null;
  kind: string | null;
};

/**
 * surveys.questions jsonb を採点用の ScoringQuestion[] に best-effort でパースする。
 * 実データ依存の形（[{id, text, kind, dimension, ...}]）を想定し、堅牢に扱う。
 */
export function parseStressQuestions(raw: unknown): ScoringQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((q, i) => {
    const o = (q ?? {}) as Record<string, unknown>;
    return {
      id: String(o.id ?? o.question_id ?? `q${i + 1}`),
      dimension: o.dimension != null ? String(o.dimension) : null,
      kind: o.kind != null ? String(o.kind) : null,
    };
  });
}

/**
 * survey_responses.answers jsonb を question_id -> 回答値の Map に正規化する。
 * 実データ依存で 2 形式の両対応:
 *   - オブジェクト形: {"<question_id>": <value>}
 *   - 配列形:        [{id|question_id, value|answer}]
 */
function toAnswerMap(answers: unknown): Map<string, unknown> {
  const map = new Map<string, unknown>();
  if (Array.isArray(answers)) {
    for (const item of answers) {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const qid = o.question_id ?? o.id ?? o.questionId;
        if (qid == null) continue;
        const val = "value" in o ? o.value : "answer" in o ? o.answer : undefined;
        map.set(String(qid), val);
      }
    }
  } else if (answers && typeof answers === "object") {
    for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
      map.set(String(k), v);
    }
  }
  return map;
}

/** 面談希望設問の回答が「希望する（truthy）」かを判定する。 */
function isConsultTruthy(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw > 0;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "" || s === "false" || s === "0" || s === "no" || s === "いいえ" || s === "希望しない") return false;
    return true; // "はい" / "希望する" / "yes" / "1" / "true" 等
  }
  return Boolean(raw);
}

/**
 * health_risk スコア（0-100「高いほど良好」）から高ストレスレベルを判定する【簡便法】。
 * 素点が低い（＝心身の不調が強い）ほど高ストレス。閾値は簡易法の目安であり、
 * 厳密な高ストレス者判定（実施者・産業医による）とは別物であることに留意。
 */
export function levelFromHealthRisk(healthRisk: number): StressLevel {
  if (healthRisk < 30) return "very_high"; // 高ストレス（要対応）
  if (healthRisk < 45) return "high";      // 高ストレス
  if (healthRisk < 60) return "medium";    // やや高ストレス
  return "low";                             // 良好
}

/**
 * 1 回答分を採点して StressCheckResult を返す（純関数）。
 * - health_risk 設問への数値回答が 1 つも無い場合はレベル判定不能のため null を返す
 *   （偽データを作らず集計から除外する）。
 * - employee_id は常に null（匿名固定）。氏名・respondent_id は結果に含めない。
 */
export function scoreStressResponse(
  questions: ScoringQuestion[],
  answers: unknown,
  respondedAt: string | null = null,
): StressCheckResult | null {
  const answerMap = toAnswerMap(answers);
  const buckets: Record<StressDimension, number[]> = {
    job_demand: [],
    social_support: [],
    job_satisfaction: [],
    health_risk: [],
  };
  let wantsConsultation = false;

  for (const q of questions) {
    const raw = answerMap.get(q.id);
    const dim = q.dimension;
    if (dim === "consultation") {
      if (isConsultTruthy(raw)) wantsConsultation = true;
      continue;
    }
    if (dim === "job_demand" || dim === "social_support" || dim === "job_satisfaction" || dim === "health_risk") {
      const n = Number(raw); // 数値回答のみ集計（text / 選択肢ラベルは NaN になり無視される）
      if (Number.isFinite(n)) buckets[dim].push(n);
    }
  }

  const avg = (arr: number[]): number | null =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const healthAvg = avg(buckets.health_risk);
  // レベル判定に必須の health_risk が欠測なら採点不能 → 除外。
  if (healthAvg === null) return null;

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  // 4件法(素点 1〜4)想定。max-min=3 で 0-100 に正規化。
  const normPos = (a: number) => clamp(((a - 1) / 3) * 100);         // 高い素点＝良好はそのまま
  const normNeg = (a: number) => clamp(100 - ((a - 1) / 3) * 100);   // 高い素点＝悪いは反転

  const jobDemandAvg = avg(buckets.job_demand);
  const supportAvg = avg(buckets.social_support);
  const satisfactionAvg = avg(buckets.job_satisfaction);
  const healthRisk = normNeg(healthAvg);

  return {
    employee_id: null, // 匿名固定（労安法66-10: 個人結果を事業者に紐付けない）
    responded_at: respondedAt,
    // 欠測領域は NaN（未算出のセンチネル）。集計側で Number.isFinite により除外される。
    job_demand: jobDemandAvg === null ? NaN : normNeg(jobDemandAvg),
    social_support: supportAvg === null ? NaN : normPos(supportAvg),
    job_satisfaction: satisfactionAvg === null ? NaN : normPos(satisfactionAvg),
    health_risk: healthRisk,
    level: levelFromHealthRisk(healthRisk),
    wants_consultation: wantsConsultation,
  };
}

/** 集団分析で個人特定を避けるための受検者数の下限（この人数未満は高ストレス者数をマスク）。 */
export const GROUP_MASK_THRESHOLD = 10;

/**
 * 採点済み個人結果を部署別に集約して GroupAnalysis[] を返す（純関数）。
 * - department_id が null（＝respondent_id が匿名 or 部署不明）の回答は帰属不可のため除外。
 *   全回答が匿名なら空配列（＝集団分析不可）を返す。
 * - 【労安法66-10 の配慮】受検者数 < GROUP_MASK_THRESHOLD の部署は
 *   high_stress_count を 0 にマスクして個人特定を防ぐ。
 */
export function aggregateGroupAnalysis(
  scored: Array<{ result: StressCheckResult; department_id: string | null }>,
  deptHeadcount?: Map<string, number>,
): GroupAnalysis[] {
  type Acc = {
    responded: number;
    high: number;
    healthSum: number;
    healthN: number;
    supportSum: number;
    supportN: number;
  };
  const byDept = new Map<string, Acc>();

  for (const { result, department_id } of scored) {
    if (!department_id) continue; // 匿名回答は部署帰属できない → 集団分析から除外
    const acc =
      byDept.get(department_id) ??
      { responded: 0, high: 0, healthSum: 0, healthN: 0, supportSum: 0, supportN: 0 };
    acc.responded++;
    if (result.level === "high" || result.level === "very_high") acc.high++;
    if (Number.isFinite(result.health_risk)) {
      acc.healthSum += result.health_risk;
      acc.healthN++;
    }
    if (Number.isFinite(result.social_support)) {
      acc.supportSum += result.social_support;
      acc.supportN++;
    }
    byDept.set(department_id, acc);
  }

  const out: GroupAnalysis[] = [];
  for (const [department_id, acc] of byDept) {
    out.push({
      department_id,
      total: deptHeadcount?.get(department_id) ?? acc.responded,
      responded: acc.responded,
      // 受検者数 < 10 は個人特定リスクのため高ストレス者数をマスク（労安法66-10 集団分析の匿名性配慮）。
      high_stress_count: acc.responded >= GROUP_MASK_THRESHOLD ? acc.high : 0,
      total_health_risk_score: acc.healthN > 0 ? Math.round(acc.healthSum / acc.healthN) : 0,
      total_support_score: acc.supportN > 0 ? Math.round(acc.supportSum / acc.supportN) : 0,
    });
  }
  return out;
}
