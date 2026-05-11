/**
 * 採用予算 ROI 分析のためのデモデータ。
 *
 * 「過去 12 ヶ月で実際に採用した N 名」の分布。
 * 経路別の hire 数・実コスト・現在も在籍しているか（retention）を持つ。
 *
 * ROI = （在籍中 hire 数 × 平均年収）/ 投下予算
 * 簡易ベンチマーク：1 年生存 80% 以上は健全、60% 未満は要注意。
 */

import type { CandidateSource } from "./recruiting";

export type ActualHire = {
  id: string;
  full_name: string;
  source: CandidateSource;
  /** 採用日 */
  hired_at: string; // ISO YYYY-MM-DD
  /** 実コスト（円） */
  actual_cost_jpy: number;
  /** 採用時の年収（円） */
  base_annual_jpy: number;
  /** 90/180/365 日の在籍状況 */
  retained_90: boolean;
  retained_180: boolean;
  retained_365: boolean;
  /** 早期退職した場合の退職日（ある場合） */
  exited_at?: string;
  /** 退職理由（ある場合） */
  exit_reason?: string;
  /** マネージャー評価（1-5、退職判定の品質指標） */
  manager_rating?: number;
  /** ロール */
  role: string;
};

const day = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

export const DEMO_ACTUAL_HIRES: ActualHire[] = [
  // ── リファラル：高品質 retention ────
  {
    id: "h-1", full_name: "Patel Raj",  source: "referral",
    hired_at: day(-330), actual_cost_jpy: 150_000,
    base_annual_jpy: 11_500_000,
    retained_90: true, retained_180: true, retained_365: true,
    manager_rating: 5, role: "シニアエンジニア",
  },
  {
    id: "h-2", full_name: "藤本 渉",  source: "referral",
    hired_at: day(-280), actual_cost_jpy: 100_000,
    base_annual_jpy: 12_000_000,
    retained_90: true, retained_180: true, retained_365: true,
    manager_rating: 5, role: "テックリード",
  },
  {
    id: "h-3", full_name: "原田 梨沙", source: "referral",
    hired_at: day(-200), actual_cost_jpy: 100_000,
    base_annual_jpy: 10_500_000,
    retained_90: true, retained_180: true, retained_365: false,
    manager_rating: 4, role: "デザインリード",
  },

  // ── 業務委託転換：最強 retention ────
  {
    id: "h-4", full_name: "Wibowo Agus", source: "contractor_conversion",
    hired_at: day(-360), actual_cost_jpy: 80_000,
    base_annual_jpy: 9_500_000,
    retained_90: true, retained_180: true, retained_365: true,
    manager_rating: 4, role: "シニアエンジニア",
  },

  // ── アルムナイ ────────────────────
  {
    id: "h-5", full_name: "Galina Sofia", source: "alumni",
    hired_at: day(-150), actual_cost_jpy: 80_000,
    base_annual_jpy: 9_800_000,
    retained_90: true, retained_180: false, retained_365: false,
    manager_rating: 3, role: "経理スペシャリスト",
  },

  // ── LinkedIn：中程度 retention ────
  {
    id: "h-6", full_name: "Chen Sarah", source: "linkedin",
    hired_at: day(-310), actual_cost_jpy: 600_000,
    base_annual_jpy: 9_500_000,
    retained_90: true, retained_180: true, retained_365: true,
    manager_rating: 4, role: "ソフトウェアエンジニア",
  },
  {
    id: "h-7", full_name: "Park Minjun", source: "linkedin",
    hired_at: day(-220), actual_cost_jpy: 580_000,
    base_annual_jpy: 10_200_000,
    retained_90: true, retained_180: true, retained_365: false,
    manager_rating: 4, role: "シニアエンジニア",
  },
  {
    id: "h-8", full_name: "Wilson John", source: "linkedin",
    hired_at: day(-340), actual_cost_jpy: 620_000,
    base_annual_jpy: 13_000_000,
    retained_90: true, retained_180: true, retained_365: false,
    exited_at: day(-50), exit_reason: "他社オファー",
    manager_rating: 4, role: "Engineering Manager",
  },

  // ── Wantedly ──────────────────
  {
    id: "h-9", full_name: "山本 涼", source: "wantedly",
    hired_at: day(-180), actual_cost_jpy: 380_000,
    base_annual_jpy: 8_500_000,
    retained_90: true, retained_180: true, retained_365: false,
    manager_rating: 3, role: "ソフトウェアエンジニア",
  },

  // ── エージェント：高コスト + 低 retention ────
  {
    id: "h-10", full_name: "Mendez Carlos", source: "agent",
    hired_at: day(-260), actual_cost_jpy: 1_650_000,
    base_annual_jpy: 11_000_000,
    retained_90: true, retained_180: true, retained_365: false,
    exited_at: day(-150), exit_reason: "プロジェクト終了で他社へ",
    manager_rating: 3, role: "Country Manager",
  },
  {
    id: "h-11", full_name: "中田 真也", source: "agent",
    hired_at: day(-90), actual_cost_jpy: 1_800_000,
    base_annual_jpy: 13_500_000,
    retained_90: true, retained_180: false, retained_365: false,
    exited_at: day(-30), exit_reason: "カルチャー不適合（試用期間）",
    manager_rating: 2, role: "VP of Sales",
  },
  {
    id: "h-12", full_name: "佐藤 涼平", source: "agent",
    hired_at: day(-340), actual_cost_jpy: 1_500_000,
    base_annual_jpy: 10_800_000,
    retained_90: true, retained_180: true, retained_365: true,
    manager_rating: 4, role: "BD マネージャー",
  },

  // ── Direct ──────────────
  {
    id: "h-13", full_name: "渡辺 翔太", source: "direct",
    hired_at: day(-160), actual_cost_jpy: 220_000,
    base_annual_jpy: 8_000_000,
    retained_90: true, retained_180: true, retained_365: false,
    manager_rating: 4, role: "Webデザイナー",
  },

  // ── Indeed ──────────────
  {
    id: "h-14", full_name: "三浦 雄介", source: "indeed",
    hired_at: day(-100), actual_cost_jpy: 400_000,
    base_annual_jpy: 7_000_000,
    retained_90: true, retained_180: false, retained_365: false,
    manager_rating: 3, role: "PR コンサルタント",
  },
];

/** 経路別の予算（recruiting-budget の DEFAULT 値ベース）— 12 ヶ月の予算合計 */
export const DEMO_BUDGET_BY_SOURCE: Record<CandidateSource, number> = {
  referral:                 1_200_000,    // 8 件 × 150k 想定
  contractor_conversion:      400_000,
  alumni:                     320_000,
  linkedin:                 4_500_000,
  wantedly:                 2_000_000,
  indeed:                   1_500_000,
  direct:                     800_000,
  agent:                    6_000_000,
};
