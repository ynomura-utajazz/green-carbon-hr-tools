/**
 * 360° 評価のデモデータ。
 *
 * 構造：
 *  - cycle（評価サイクル：2026 H1 等）
 *  - subject（評価対象社員）
 *  - rater（評価者：本人・マネージャー・同僚・部下）
 *  - 各コンピテンシーへのスコア（1-5）+ コメント
 *
 * 評価軸（コンピテンシー）：
 *  - delivery     : 実行力
 *  - collaboration: 協働
 *  - communication: コミュニケーション
 *  - leadership   : リーダーシップ（マネージャーロール時のみ）
 *  - innovation   : 創造性・改善
 *  - customer     : 顧客志向
 *  - culture      : カルチャーフィット
 */

export type RaterRole = "self" | "manager" | "peer" | "report";
export type Competency = "delivery" | "collaboration" | "communication" | "leadership" | "innovation" | "customer" | "culture";

export type Rating = {
  competency: Competency;
  score: number; // 1-5
  comment?: string;
};

export type ThreeSixtyResponse = {
  id: string;
  cycle_id: string;
  subject_id: string;       // 評価対象社員
  rater_id: string;          // 評価者
  rater_role: RaterRole;
  /** 匿名化レベル（同僚・部下は集約後の数値のみ表示。1 名のフィードバックを特定できないように） */
  anonymized: boolean;
  ratings: Rating[];
  /** 強み / 改善点の自由記述 */
  strengths?: string;
  improvements?: string;
  submitted_at: string;
};

export type ThreeSixtyCycle = {
  id: string;
  name: string;
  /** 開始日 */
  start: string;
  /** 締切 */
  end: string;
  status: "draft" | "open" | "closed" | "calibrated";
  /** このサイクルの対象者 */
  subject_ids: string[];
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const COMPETENCY_LABELS: Record<Competency, string> = {
  delivery:      "実行力",
  collaboration: "協働",
  communication: "コミュニケーション",
  leadership:    "リーダーシップ",
  innovation:    "創造性・改善",
  customer:      "顧客志向",
  culture:       "カルチャー",
};

export const RATER_ROLE_META: Record<RaterRole, { label: string; cls: string; icon: string }> = {
  self:    { label: "本人",       cls: "bg-gc-100 text-gc-800",          icon: "👤" },
  manager: { label: "マネージャー", cls: "bg-purple-100 text-purple-800", icon: "👔" },
  peer:    { label: "同僚",       cls: "bg-blue-100 text-blue-800",      icon: "🤝" },
  report:  { label: "部下",       cls: "bg-emerald-100 text-emerald-800", icon: "🌱" },
};

export const DEMO_360_CYCLES: ThreeSixtyCycle[] = [
  {
    id: "cyc-2026h1",
    name: "2026 上期 360° 評価",
    start: day(-30),
    end: day(7),
    status: "open",
    subject_ids: ["e8", "e9", "e14", "e3", "e4"],
  },
  {
    id: "cyc-2025h2",
    name: "2025 下期 360° 評価",
    start: day(-210),
    end: day(-180),
    status: "calibrated",
    subject_ids: ["e8", "e14", "e3"],
  },
];

// ── 2026 H1 のフィードバック（e8 = 川崎 VPoE をメインに） ─────────
export const DEMO_360_RESPONSES: ThreeSixtyResponse[] = [
  // ── e8 川崎 健太（VPoE）への 360° ─────────────
  {
    id: "r-1", cycle_id: "cyc-2026h1", subject_id: "e8",
    rater_id: "e8", rater_role: "self", anonymized: false,
    ratings: [
      { competency: "delivery",      score: 4 },
      { competency: "collaboration", score: 4 },
      { competency: "communication", score: 3, comment: "もっと早く意思決定したい" },
      { competency: "leadership",    score: 4 },
      { competency: "innovation",    score: 4 },
      { competency: "customer",      score: 3 },
      { competency: "culture",       score: 5 },
    ],
    strengths: "技術と組織を両立させる視点。20 名規模のチームを 1 年で立ち上げた実績。",
    improvements: "ステークホルダーとのコミュニケーションがやや遅れがち。",
    submitted_at: day(-3),
  },
  {
    id: "r-2", cycle_id: "cyc-2026h1", subject_id: "e8",
    rater_id: "e1", rater_role: "manager", anonymized: false,
    ratings: [
      { competency: "delivery",      score: 5 },
      { competency: "collaboration", score: 4 },
      { competency: "communication", score: 4 },
      { competency: "leadership",    score: 5 },
      { competency: "innovation",    score: 4 },
      { competency: "customer",      score: 3 },
      { competency: "culture",       score: 5 },
    ],
    strengths: "技術組織のスケールアップを完璧に実行。期待を超える成果。",
    improvements: "次は事業側との連携を強化すべき。CTO 候補。",
    submitted_at: day(-2),
  },
  // peers（4 名）— 匿名化
  ...[
    { rater: "e9",  s: { delivery: 4, collaboration: 5, communication: 4, leadership: 5, innovation: 4, customer: 4, culture: 5 } },
    { rater: "e10", s: { delivery: 5, collaboration: 4, communication: 3, leadership: 4, innovation: 4, customer: 3, culture: 5 } },
    { rater: "e11", s: { delivery: 4, collaboration: 4, communication: 4, leadership: 4, innovation: 5, customer: 4, culture: 5 } },
    { rater: "e14", s: { delivery: 5, collaboration: 5, communication: 4, leadership: 5, innovation: 4, customer: 3, culture: 5 } },
  ].map((r, i) => ({
    id: `r-peer-${i}`, cycle_id: "cyc-2026h1", subject_id: "e8",
    rater_id: r.rater, rater_role: "peer" as RaterRole, anonymized: true,
    ratings: (Object.keys(r.s) as Competency[]).map((c) => ({ competency: c, score: r.s[c] })),
    strengths: undefined,
    improvements: undefined,
    submitted_at: day(-i - 1),
  })),
  // reports（3 名）— 匿名化
  ...[
    { rater: "e10", s: { delivery: 5, collaboration: 5, communication: 4, leadership: 5, innovation: 4, customer: 4, culture: 5 } },
    { rater: "e11", s: { delivery: 4, collaboration: 4, communication: 3, leadership: 4, innovation: 4, customer: 3, culture: 4 } },
    { rater: "e12", s: { delivery: 5, collaboration: 5, communication: 4, leadership: 5, innovation: 5, customer: 4, culture: 5 } },
  ].map((r, i) => ({
    id: `r-rep-${i}`, cycle_id: "cyc-2026h1", subject_id: "e8",
    rater_id: r.rater, rater_role: "report" as RaterRole, anonymized: true,
    ratings: (Object.keys(r.s) as Competency[]).map((c) => ({ competency: c, score: r.s[c] })),
    strengths: undefined,
    improvements: undefined,
    submitted_at: day(-i - 4),
  })),
];

// ── 集計 ─────────────────────────────────────────

export type AggregateByRole = Record<RaterRole, Partial<Record<Competency, number>>>;

export function aggregateByRole(responses: ThreeSixtyResponse[]): AggregateByRole {
  const result: AggregateByRole = { self: {}, manager: {}, peer: {}, report: {} };
  const counts: Record<RaterRole, Partial<Record<Competency, number>>> = {
    self: {}, manager: {}, peer: {}, report: {},
  };
  for (const r of responses) {
    for (const rt of r.ratings) {
      const cur = result[r.rater_role][rt.competency] ?? 0;
      result[r.rater_role][rt.competency] = cur + rt.score;
      counts[r.rater_role][rt.competency] = (counts[r.rater_role][rt.competency] ?? 0) + 1;
    }
  }
  for (const role of ["self", "manager", "peer", "report"] as RaterRole[]) {
    for (const c of Object.keys(result[role]) as Competency[]) {
      const total = result[role][c] ?? 0;
      const n = counts[role][c] ?? 1;
      result[role][c] = Number((total / n).toFixed(2));
    }
  }
  return result;
}

/**
 * Self vs Others のギャップ分析。
 * 自己評価が他者評価より +1 以上 = blind spot のリスク（自分が思うほど他者は高く評価していない）
 * 自己評価が他者評価より -0.5 以下 = under-confident（過小評価）
 */
export function selfVsOthers(agg: AggregateByRole): {
  competency: Competency;
  self: number;
  others_avg: number;
  gap: number;
  signal: "blind_spot" | "aligned" | "humble";
}[] {
  const competencies = Object.keys(COMPETENCY_LABELS) as Competency[];
  return competencies.map((c) => {
    const self = agg.self[c] ?? 0;
    const ratings: number[] = [];
    if (agg.manager[c] !== undefined) ratings.push(agg.manager[c]!);
    if (agg.peer[c] !== undefined)    ratings.push(agg.peer[c]!);
    if (agg.report[c] !== undefined)  ratings.push(agg.report[c]!);
    const others_avg = ratings.length > 0
      ? ratings.reduce((s, v) => s + v, 0) / ratings.length
      : 0;
    const gap = self - others_avg;
    const signal: "blind_spot" | "aligned" | "humble" =
      gap >= 0.7 ? "blind_spot" : gap <= -0.5 ? "humble" : "aligned";
    return { competency: c, self, others_avg: Number(others_avg.toFixed(2)), gap: Number(gap.toFixed(2)), signal };
  });
}
