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
