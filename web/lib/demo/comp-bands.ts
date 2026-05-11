/**
 * 報酬グレード × ロール × 拠点の市場ベンチマーク + 自社レンジ。
 *
 * 構造：
 *  - グレード（S2 → S5、M3 → M5、EX）
 *  - ロールカテゴリ（engineering / pm / design / bd / finance / executive）
 *  - 拠点（JP / SG / ID / VN / IN）— 物価補正済
 *  - 各セルに：
 *    - 自社レンジ（min/mid/max）
 *    - 市場ベンチマーク（25th / 50th / 75th percentile）
 *    - 自社の市場ポジション（Lead / Match / Lag）
 */

export type Grade = "S2" | "S3" | "S4" | "S5" | "M3" | "M4" | "M5" | "EX";
export type RoleFamily = "engineering" | "pm" | "design" | "bd" | "finance" | "executive";
export type Region = "JP" | "SG" | "ID" | "VN" | "IN";

export type CompBand = {
  grade: Grade;
  role: RoleFamily;
  region: Region;
  /** 自社レンジ（年収・JPY 換算） */
  internal_min: number;
  internal_mid: number;
  internal_max: number;
  /** 市場ベンチマーク 25/50/75 percentile（同じく JPY 換算） */
  market_p25: number;
  market_p50: number;
  market_p75: number;
};

const m = (v: number) => v * 10_000; // 万円 → 円

/**
 * 市場ベンチマークは Robert Walters / Levels.fyi / OpenWork の集計を想定（架空数値）。
 * 自社は概ね median 寄りに設定、Senior 以上は Lag（市場より低め）気味の意図設定。
 */
export const DEMO_COMP_BANDS: CompBand[] = [
  // ── Engineering JP ──────────────────────────────
  { grade: "S2", role: "engineering", region: "JP", internal_min: m(450),  internal_mid: m(550),  internal_max: m(650),  market_p25: m(450), market_p50: m(580), market_p75: m(700) },
  { grade: "S3", role: "engineering", region: "JP", internal_min: m(600),  internal_mid: m(750),  internal_max: m(900),  market_p25: m(620), market_p50: m(800), market_p75: m(950) },
  { grade: "S4", role: "engineering", region: "JP", internal_min: m(800),  internal_mid: m(1000), internal_max: m(1200), market_p25: m(900), market_p50: m(1100), market_p75: m(1300) },
  { grade: "S5", role: "engineering", region: "JP", internal_min: m(1000), internal_mid: m(1200), internal_max: m(1400), market_p25: m(1200), market_p50: m(1400), market_p75: m(1700) },
  { grade: "M3", role: "engineering", region: "JP", internal_min: m(1100), internal_mid: m(1300), internal_max: m(1500), market_p25: m(1200), market_p50: m(1400), market_p75: m(1700) },
  { grade: "M4", role: "engineering", region: "JP", internal_min: m(1300), internal_mid: m(1600), internal_max: m(1900), market_p25: m(1500), market_p50: m(1800), market_p75: m(2200) },

  // ── PM JP ───────────────────────────────
  { grade: "S3", role: "pm", region: "JP", internal_min: m(700),  internal_mid: m(850),  internal_max: m(1000), market_p25: m(700), market_p50: m(900), market_p75: m(1100) },
  { grade: "S4", role: "pm", region: "JP", internal_min: m(900),  internal_mid: m(1100), internal_max: m(1300), market_p25: m(1000), market_p50: m(1200), market_p75: m(1400) },
  { grade: "S5", role: "pm", region: "JP", internal_min: m(1100), internal_mid: m(1300), internal_max: m(1500), market_p25: m(1300), market_p50: m(1500), market_p75: m(1800) },

  // ── Design JP ──────────────────────────────
  { grade: "S3", role: "design", region: "JP", internal_min: m(600), internal_mid: m(750),  internal_max: m(900),  market_p25: m(580), market_p50: m(750),  market_p75: m(900) },
  { grade: "S4", role: "design", region: "JP", internal_min: m(800), internal_mid: m(950),  internal_max: m(1100), market_p25: m(800), market_p50: m(1000), market_p75: m(1200) },
  { grade: "S5", role: "design", region: "JP", internal_min: m(950), internal_mid: m(1100), internal_max: m(1300), market_p25: m(1000), market_p50: m(1200), market_p75: m(1400) },

  // ── BD JP ─────────────────
  { grade: "S3", role: "bd", region: "JP", internal_min: m(700),  internal_mid: m(850),  internal_max: m(1000), market_p25: m(700), market_p50: m(900),  market_p75: m(1100) },
  { grade: "S4", role: "bd", region: "JP", internal_min: m(900),  internal_mid: m(1100), internal_max: m(1300), market_p25: m(950), market_p50: m(1200), market_p75: m(1500) },
  { grade: "M3", role: "bd", region: "JP", internal_min: m(1100), internal_mid: m(1300), internal_max: m(1500), market_p25: m(1200), market_p50: m(1500), market_p75: m(1800) },

  // ── Finance JP ─────────────
  { grade: "S3", role: "finance", region: "JP", internal_min: m(550), internal_mid: m(700),  internal_max: m(850),  market_p25: m(550), market_p50: m(700),  market_p75: m(850) },
  { grade: "S4", role: "finance", region: "JP", internal_min: m(750), internal_mid: m(900),  internal_max: m(1050), market_p25: m(800), market_p50: m(1000), market_p75: m(1200) },
  { grade: "M3", role: "finance", region: "JP", internal_min: m(900), internal_mid: m(1100), internal_max: m(1300), market_p25: m(1000), market_p50: m(1200), market_p75: m(1400) },

  // ── Executive JP ───────────
  { grade: "EX", role: "executive", region: "JP", internal_min: m(1500), internal_mid: m(2000), internal_max: m(2500), market_p25: m(1800), market_p50: m(2400), market_p75: m(3000) },

  // ── ASEAN サンプル（Engineering） ──────
  { grade: "S3", role: "engineering", region: "SG", internal_min: m(750), internal_mid: m(900),  internal_max: m(1050), market_p25: m(800), market_p50: m(1000), market_p75: m(1200) },
  { grade: "S4", role: "engineering", region: "SG", internal_min: m(950), internal_mid: m(1150), internal_max: m(1350), market_p25: m(1100), market_p50: m(1300), market_p75: m(1500) },
  { grade: "S3", role: "engineering", region: "ID", internal_min: m(350), internal_mid: m(450),  internal_max: m(550),  market_p25: m(380), market_p50: m(480),  market_p75: m(600) },
  { grade: "S3", role: "engineering", region: "VN", internal_min: m(330), internal_mid: m(420),  internal_max: m(510),  market_p25: m(350), market_p50: m(450),  market_p75: m(560) },
  { grade: "S3", role: "engineering", region: "IN", internal_min: m(450), internal_mid: m(560),  internal_max: m(670),  market_p25: m(480), market_p50: m(600),  market_p75: m(750) },
];

export const ROLE_LABEL: Record<RoleFamily, string> = {
  engineering: "エンジニアリング",
  pm:          "プロダクトマネジメント",
  design:      "デザイン",
  bd:          "事業開発 / セールス",
  finance:     "経理・財務",
  executive:   "経営層",
};

export const REGION_LABEL: Record<Region, string> = {
  JP: "🇯🇵 日本",
  SG: "🇸🇬 シンガポール",
  ID: "🇮🇩 インドネシア",
  VN: "🇻🇳 ベトナム",
  IN: "🇮🇳 インド",
};

/** 市場ポジション判定 */
export type MarketPosition = "lead" | "match" | "lag" | "deep_lag";

export function marketPosition(b: CompBand): MarketPosition {
  // 自社 mid と市場 p50 の比較
  const ratio = b.internal_mid / b.market_p50;
  if (ratio >= 1.10) return "lead";   // 10%+ 高い
  if (ratio >= 0.95) return "match";  // ±5%
  if (ratio >= 0.85) return "lag";    // 5-15% 低い
  return "deep_lag";
}

export const POSITION_META: Record<MarketPosition, { label: string; cls: string; emoji: string }> = {
  lead:      { label: "Lead（市場上位）",     cls: "bg-emerald-100 text-emerald-800 border-emerald-300", emoji: "🚀" },
  match:     { label: "Match（市場中央値）",  cls: "bg-blue-100 text-blue-800 border-blue-300",       emoji: "⚖️" },
  lag:       { label: "Lag（市場より低）",    cls: "bg-amber-100 text-amber-800 border-amber-300",    emoji: "⚠️" },
  deep_lag:  { label: "Deep Lag（要見直し）", cls: "bg-red-100 text-red-800 border-red-300",          emoji: "🚨" },
};

/** 個別社員の現在地と上昇余地（demo: ランダムに割り付け） */
export type EmployeeCompPosition = {
  employee_id: string;
  full_name: string;
  job_title: string;
  grade: Grade;
  role: RoleFamily;
  region: Region;
  /** 現在の年収 */
  current_jpy: number;
  /** バンド内の % 位置（0-100） */
  band_position_pct: number;
  /** 市場 P50 比 */
  market_ratio: number;
};
