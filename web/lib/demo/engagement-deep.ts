/**
 * エンゲージメントサーベイ深掘り：ステージ別離脱要因分析。
 *
 * 在籍ステージ：
 *  - onboarding (0-3 ヶ月)
 *  - new_hire   (3-12 ヶ月)
 *  - established (1-3 年)
 *  - veteran    (3-5 年)
 *  - lifer      (5 年+)
 *
 * 各ステージで「離脱要因」を 6 ドライバーで測定：
 *  - compensation : 報酬
 *  - growth       : 成長機会
 *  - manager      : 上司との関係
 *  - culture      : カルチャーフィット
 *  - workload     : 業務負荷
 *  - mission      : ミッション共感
 */

export type TenureStage = "onboarding" | "new_hire" | "established" | "veteran" | "lifer";
export type Driver = "compensation" | "growth" | "manager" | "culture" | "workload" | "mission";

export const TENURE_STAGE_LABEL: Record<TenureStage, string> = {
  onboarding:  "オンボーディング（0-3M）",
  new_hire:    "新人期（3-12M）",
  established: "確立期（1-3Y）",
  veteran:     "ベテラン（3-5Y）",
  lifer:       "古参（5Y+）",
};

export const DRIVER_LABEL: Record<Driver, string> = {
  compensation: "報酬",
  growth:       "成長機会",
  manager:      "上司との関係",
  culture:      "カルチャー",
  workload:     "業務負荷",
  mission:      "ミッション共感",
};

/** ドライバー別のスコア（1-5、5 が最高） */
export type DriverScores = Record<Driver, number>;

/** ステージ × ドライバーのスコアマップ */
export type StageDriverMatrix = Record<TenureStage, DriverScores>;

/**
 * デモデータ：ステージ別の平均ドライバースコア。
 * 意図的に偏りを仕込む：
 *  - onboarding: 全体的に高い（ハネムーン期）
 *  - new_hire: 報酬で不満（市場ベンチマーク認識）
 *  - established: 成長機会が下がる（仕事のマンネリ）
 *  - veteran: 上司との関係が下がる（マネージャーが追いつかない）
 *  - lifer: 全体的に成熟、ただし growth と workload が低下
 */
export const DEMO_STAGE_DRIVERS: StageDriverMatrix = {
  onboarding:  { compensation: 4.2, growth: 4.5, manager: 4.4, culture: 4.6, workload: 4.0, mission: 4.7 },
  new_hire:    { compensation: 3.4, growth: 4.2, manager: 4.0, culture: 4.3, workload: 3.8, mission: 4.4 },
  established: { compensation: 3.6, growth: 3.5, manager: 3.8, culture: 4.0, workload: 3.5, mission: 4.1 },
  veteran:     { compensation: 3.8, growth: 3.2, manager: 3.3, culture: 3.7, workload: 3.4, mission: 3.9 },
  lifer:       { compensation: 4.0, growth: 2.8, manager: 3.5, culture: 3.9, workload: 3.0, mission: 3.7 },
};

/** ステージ別の離脱率（過去 12 ヶ月） */
export const DEMO_STAGE_ATTRITION: Record<TenureStage, { headcount: number; left: number; rate: number }> = {
  onboarding:  { headcount: 24, left: 2, rate: 2 / 24 },
  new_hire:    { headcount: 58, left: 8, rate: 8 / 58 },
  established: { headcount: 102, left: 9, rate: 9 / 102 },
  veteran:     { headcount: 76, left: 11, rate: 11 / 76 },
  lifer:       { headcount: 37, left: 2, rate: 2 / 37 },
};

/** 退職者の自由記述から AI でクラスタリングした退職理由（demo は固定） */
export type ExitReasonCluster = {
  label: string;
  count: number;
  /** 主に発生したステージ */
  primary_stage: TenureStage;
  /** 関連ドライバー */
  related_drivers: Driver[];
  /** 代表的なコメント（匿名化済） */
  sample_comments: string[];
};

export const DEMO_EXIT_CLUSTERS: ExitReasonCluster[] = [
  {
    label: "他社オファー（給与アップ）",
    count: 8,
    primary_stage: "new_hire",
    related_drivers: ["compensation", "growth"],
    sample_comments: [
      "市場価値とのギャップを感じた。+200 万円のオファーが来た",
      "他社のレンジが見えてきて、現職の評価が物足りなく感じた",
    ],
  },
  {
    label: "成長停滞・業務マンネリ",
    count: 7,
    primary_stage: "established",
    related_drivers: ["growth", "workload"],
    sample_comments: [
      "ここ 1 年同じ業務の繰り返しで、新しい挑戦を求めたくなった",
      "技術スタックが安定してしまって学びが減った",
    ],
  },
  {
    label: "マネジメント方針への不満",
    count: 5,
    primary_stage: "veteran",
    related_drivers: ["manager", "culture"],
    sample_comments: [
      "新マネージャーの方針と合わなくなった",
      "意思決定プロセスが遅く感じる",
    ],
  },
  {
    label: "業務負荷・健康",
    count: 4,
    primary_stage: "established",
    related_drivers: ["workload"],
    sample_comments: [
      "リソース不足で個人の負荷が高すぎた",
      "ワークライフバランスの崩れ",
    ],
  },
  {
    label: "起業・転身",
    count: 3,
    primary_stage: "veteran",
    related_drivers: ["mission", "growth"],
    sample_comments: [
      "自分の事業を立ち上げたくなった",
      "別ドメインに挑戦したい",
    ],
  },
  {
    label: "家庭事情・引越し",
    count: 2,
    primary_stage: "established",
    related_drivers: [],
    sample_comments: [
      "配偶者の海外転勤に同行",
    ],
  },
];

// ── ステージ別 NPS（eNPS） ───────────────────────────
export const DEMO_STAGE_ENPS: Record<TenureStage, { promoters: number; passives: number; detractors: number; nps: number }> = {
  onboarding:  { promoters: 16, passives: 6, detractors: 2,  nps: Math.round(((16 - 2) / 24) * 100) },
  new_hire:    { promoters: 28, passives: 18, detractors: 12, nps: Math.round(((28 - 12) / 58) * 100) },
  established: { promoters: 42, passives: 36, detractors: 24, nps: Math.round(((42 - 24) / 102) * 100) },
  veteran:     { promoters: 28, passives: 30, detractors: 18, nps: Math.round(((28 - 18) / 76) * 100) },
  lifer:       { promoters: 18, passives: 14, detractors: 5,  nps: Math.round(((18 - 5) / 37) * 100) },
};

/** 全社平均ドライバー */
export function overallDrivers(): DriverScores {
  const drivers = Object.keys(DRIVER_LABEL) as Driver[];
  const stages = Object.keys(DEMO_STAGE_DRIVERS) as TenureStage[];
  const result = {} as DriverScores;
  for (const d of drivers) {
    let total = 0; let count = 0;
    for (const s of stages) {
      const headcount = DEMO_STAGE_ATTRITION[s].headcount;
      total += DEMO_STAGE_DRIVERS[s][d] * headcount;
      count += headcount;
    }
    result[d] = count > 0 ? Number((total / count).toFixed(2)) : 0;
  }
  return result;
}
