/**
 * 採用ファネル分析のための履歴イベント生成。
 *
 * 本番では `candidate_stage_changes` テーブルから読み込む想定だが、
 * デモでは過去 12 ヶ月分を synthetic に生成して傾向が出るようにする。
 *
 * 生成ロジック：
 *  - 月別の流入数を経路ごとに変動（リファラル増加、エージェント減少など）
 *  - 経路ごとの「ステージ通過率」を固定して確率的に進行
 *  - 平均日数も経路ごとに違う（リファラルは速い、エージェントは遅い）
 */

import { STAGE_ORDER, type CandidateSource, type CandidateStage } from "./recruiting";

export type FunnelEvent = {
  id: string;
  candidate_id: string;
  source: CandidateSource;
  /** ステージ遷移先 */
  to_stage: CandidateStage;
  /** イベント発生日 */
  occurred_at: string; // ISO
};

/** 経路ごとのステージ通過率（applied → screening → ... → hired）。
 *  実データ風にリファラルが圧倒的に通りやすい設計。 */
const SOURCE_PASS_RATE: Record<CandidateSource, number[]> = {
  // applied → screening, screening → interview_1, → 2, → 3, → final, → offer, → hired
  referral:              [0.92, 0.85, 0.80, 0.75, 0.85, 0.95, 0.90],
  contractor_conversion: [0.95, 0.90, 0.85, 0.80, 0.90, 0.95, 0.92],
  alumni:         [0.90, 0.85, 0.85, 0.80, 0.90, 0.92, 0.92],
  linkedin:              [0.50, 0.55, 0.55, 0.50, 0.65, 0.70, 0.78],
  wantedly:              [0.55, 0.50, 0.50, 0.45, 0.60, 0.65, 0.72],
  agent:                 [0.45, 0.45, 0.45, 0.40, 0.55, 0.65, 0.70],
  direct:                [0.40, 0.40, 0.40, 0.40, 0.55, 0.60, 0.70],
  indeed:                [0.45, 0.45, 0.45, 0.40, 0.55, 0.60, 0.72],
};

/** 経路ごとの月次流入数（ベース値）。月によって ±20% 変動 */
const SOURCE_BASE_INFLOW: Record<CandidateSource, number> = {
  referral:              4,
  contractor_conversion: 1,
  alumni:         0.4,
  linkedin:              8,
  wantedly:              5,
  agent:                 6,
  direct:                3,
  indeed:                1.5,
};

/** 各ステージ通過にかかる平均日数（リファラルは早い、エージェントは遅い） */
const STAGE_DAYS: Record<CandidateSource, number> = {
  referral: 3, contractor_conversion: 2, alumni: 4,
  linkedin: 5, wantedly: 6, agent: 7, direct: 6, indeed: 5,
};

const SOURCES: CandidateSource[] = [
  "referral", "linkedin", "wantedly", "agent", "direct",
  "indeed", "contractor_conversion", "alumni",
];

// ── 決定的擬似乱数（同じ入力 → 同じ出力。デモ再現性のため） ────────
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateEvents(): FunnelEvent[] {
  const rand = mulberry32(20260509);
  const events: FunnelEvent[] = [];
  let idCounter = 0;

  const now = new Date();
  // 12 ヶ月前の月初を起点に、月ごとに流入を作る
  for (let monthsBack = 11; monthsBack >= 0; monthsBack--) {
    const baseDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

    for (const source of SOURCES) {
      // 経路ごとに月の流入数を決定（±20% 揺らぎ）
      const baseN = SOURCE_BASE_INFLOW[source];
      // referral とアルムナイは月数経過で増加トレンド、agent は減少
      let trendMul = 1;
      if (source === "referral") trendMul = 0.7 + (11 - monthsBack) * 0.04;
      else if (source === "alumni") trendMul = 0.5 + (11 - monthsBack) * 0.06;
      else if (source === "agent") trendMul = 1.2 - (11 - monthsBack) * 0.03;

      const inflow = Math.max(0, Math.round((baseN * trendMul) * (0.8 + rand() * 0.4)));
      const passRates = SOURCE_PASS_RATE[source];
      const stageDays = STAGE_DAYS[source];

      for (let i = 0; i < inflow; i++) {
        const candId = `hist_${source}_${monthsBack}_${i}`;
        const appliedDayInMonth = Math.floor(rand() * 28);
        let cur = new Date(baseDate);
        cur.setDate(cur.getDate() + appliedDayInMonth);

        // 必ず applied イベント
        events.push({
          id: `ev_${idCounter++}`,
          candidate_id: candId,
          source,
          to_stage: "applied",
          occurred_at: cur.toISOString(),
        });

        // ステージを順に通過判定。リジェクト/オファー辞退は途中で確率で起きる
        let alive = true;
        for (let stageIdx = 1; stageIdx < STAGE_ORDER.length && alive; stageIdx++) {
          const passRate = passRates[stageIdx - 1] ?? 0.5;
          if (rand() > passRate) {
            // ここでドロップ（rejected）
            cur = addDays(cur, Math.round(stageDays * (0.5 + rand())));
            events.push({
              id: `ev_${idCounter++}`,
              candidate_id: candId, source,
              to_stage: rand() > 0.85 ? "withdrawn" : "rejected",
              occurred_at: cur.toISOString(),
            });
            alive = false;
            break;
          }
          cur = addDays(cur, Math.round(stageDays * (0.6 + rand() * 0.8)));
          events.push({
            id: `ev_${idCounter++}`,
            candidate_id: candId, source,
            to_stage: STAGE_ORDER[stageIdx],
            occurred_at: cur.toISOString(),
          });
        }
      }
    }
  }

  return events;
}

function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

/** 直近 12 ヶ月の合成イベント。同じシードで毎回同じ結果になる。 */
export const DEMO_FUNNEL_EVENTS: FunnelEvent[] = generateEvents();
