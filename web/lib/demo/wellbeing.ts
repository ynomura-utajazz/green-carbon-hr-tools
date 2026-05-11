/**
 * ウェルビーイング：睡眠・ストレス・運動の自己申告データ。
 *
 * 個人プライバシー重視：
 *  - 個別データは本人のみ閲覧（ダッシュボードでは集約値のみ）
 *  - 5 名未満のチームは N<5 で匿名化
 */

export type WellbeingEntry = {
  employee_id: string;
  date: string; // YYYY-MM-DD
  /** 睡眠時間（時間） */
  sleep_hours: number;
  /** ストレスレベル 1-5 */
  stress: number;
  /** 運動分数（その日） */
  exercise_min: number;
  /** ムード 1-5 */
  mood: number;
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// 直近 30 日 × 主要メンバー 7 名のサンプル
function gen(employeeId: string, baseSleep: number, baseStress: number, baseExercise: number): WellbeingEntry[] {
  const out: WellbeingEntry[] = [];
  // pseudo-random（決定的） for demo stability
  const seed = employeeId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  for (let i = 29; i >= 0; i--) {
    const r = ((seed + i * 7) % 100) / 100; // 0-1
    const r2 = ((seed * 3 + i * 11) % 100) / 100;
    out.push({
      employee_id: employeeId,
      date: day(-i),
      sleep_hours: Math.round((baseSleep + (r - 0.5) * 1.5) * 10) / 10,
      stress: Math.max(1, Math.min(5, Math.round(baseStress + (r2 - 0.5) * 1.4))),
      exercise_min: Math.max(0, Math.round(baseExercise + (r - 0.5) * 25)),
      mood: Math.max(1, Math.min(5, Math.round(4 - (r2 * 1.5)))),
    });
  }
  return out;
}

export const DEMO_WELLBEING: WellbeingEntry[] = [
  ...gen("e1", 6.5, 3, 25),
  ...gen("e2", 7.5, 2, 30),
  ...gen("e3", 6.0, 4, 15),  // ストレス高め（COO）
  ...gen("e8", 6.8, 3, 20),
  ...gen("e9", 7.0, 3, 35),
  ...gen("e10", 7.3, 2, 10),
  ...gen("e14", 7.0, 3, 40),
];

export type WellbeingAggregate = {
  /** 平均睡眠 */
  avg_sleep: number;
  /** 平均ストレス */
  avg_stress: number;
  /** 平均運動 */
  avg_exercise: number;
  /** 平均ムード */
  avg_mood: number;
  /** N */
  n: number;
};

export function aggregate(entries: WellbeingEntry[]): WellbeingAggregate {
  if (entries.length === 0) {
    return { avg_sleep: 0, avg_stress: 0, avg_exercise: 0, avg_mood: 0, n: 0 };
  }
  return {
    avg_sleep:    Number((entries.reduce((s, e) => s + e.sleep_hours, 0) / entries.length).toFixed(1)),
    avg_stress:   Number((entries.reduce((s, e) => s + e.stress, 0)      / entries.length).toFixed(1)),
    avg_exercise: Math.round(entries.reduce((s, e) => s + e.exercise_min, 0) / entries.length),
    avg_mood:     Number((entries.reduce((s, e) => s + e.mood, 0)        / entries.length).toFixed(1)),
    n: entries.length,
  };
}

/** 警告判定 */
export function alerts(agg: WellbeingAggregate): { type: "sleep" | "stress" | "exercise" | "mood"; message: string }[] {
  const out: { type: "sleep" | "stress" | "exercise" | "mood"; message: string }[] = [];
  if (agg.avg_sleep > 0 && agg.avg_sleep < 6.5) {
    out.push({ type: "sleep", message: `平均睡眠 ${agg.avg_sleep}h — 慢性的な睡眠不足の可能性` });
  }
  if (agg.avg_stress >= 3.5) {
    out.push({ type: "stress", message: `平均ストレス ${agg.avg_stress} — ハイストレス状態` });
  }
  if (agg.avg_exercise < 15) {
    out.push({ type: "exercise", message: `運動量 平均 ${agg.avg_exercise} 分/日 — 推奨 30 分を下回る` });
  }
  if (agg.avg_mood < 3) {
    out.push({ type: "mood", message: `ムード ${agg.avg_mood} — 1on1・ストレスチェックでの確認を推奨` });
  }
  return out;
}
