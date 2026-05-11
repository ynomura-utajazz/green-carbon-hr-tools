/**
 * 競合他社の JD（求人票）データ。
 *
 * 本番では LinkedIn / Wantedly / Indeed をスクレイピング → 構造化保存。
 * デモでは気候テック / 人事 SaaS を中心に 6 社のリアル風 JD を持つ。
 */

export type CompetitorJd = {
  id: string;
  company: string;
  /** 会社の業界カテゴリ */
  industry: "climate_tech" | "carbon_market" | "hr_saas" | "ev" | "energy_giant";
  /** 会社規模（社員数） */
  company_size: number;
  /** ランクレベル（自社との比較用） */
  funding_stage: "seed" | "series_a" | "series_b" | "series_c" | "ipo" | "public" | "late";
  position_title: string;
  /** カテゴリ（自社のロールと突合） */
  role_category: "ml_engineer" | "bd" | "policy" | "pdm" | "finance" | "engineer" | "design";
  required_skills: string[];
  nice_to_have: string[];
  comp_min_jpy?: number;
  comp_max_jpy?: number;
  location: string;
  remote_ok: boolean;
  has_stock_option: boolean;
  has_relocation_support: boolean;
  english_required: boolean;
  /** リスト時の短い差別化ポイント */
  differentiator: string;
  /** 公開元（仮想 URL） */
  source_url: string;
};

export const DEMO_COMPETITOR_JDS: CompetitorJd[] = [
  // ── ML エンジニア（ML×気候）─────────────────
  {
    id: "cj-1", company: "ClimateAI Tokyo", industry: "climate_tech",
    company_size: 80, funding_stage: "series_b",
    position_title: "Senior ML Engineer (Carbon Modeling)",
    role_category: "ml_engineer",
    required_skills: ["Python", "PyTorch", "MLOps", "時系列データ", "PostgreSQL", "衛星画像処理"],
    nice_to_have: ["カーボンクレジット計算経験", "論文執筆", "Sentinel-2"],
    comp_min_jpy: 12_000_000, comp_max_jpy: 18_000_000,
    location: "Tokyo, Japan",
    remote_ok: true, has_stock_option: true, has_relocation_support: true,
    english_required: true,
    differentiator: "シリーズB完了 + 海外メンバー比率 40% + 競合より給与レンジ 30% 高",
    source_url: "https://climateai.example/careers/ml-senior",
  },
  {
    id: "cj-2", company: "Pachama (US)", industry: "carbon_market",
    company_size: 250, funding_stage: "series_c",
    position_title: "Staff Machine Learning Engineer",
    role_category: "ml_engineer",
    required_skills: ["Python", "PyTorch", "MLOps", "リモートセンシング", "衛星画像処理", "AWS"],
    nice_to_have: ["論文執筆", "PhD", "気候科学"],
    comp_min_jpy: 18_000_000, comp_max_jpy: 28_000_000,
    location: "Remote (Americas)",
    remote_ok: true, has_stock_option: true, has_relocation_support: false,
    english_required: true,
    differentiator: "USD 給与 + 米国 RSU + フルリモート",
    source_url: "https://pachama.example/careers/ml-staff",
  },

  // ── BD / Sales（ASEAN）────────────────────
  {
    id: "cj-3", company: "GreenForest Indonesia", industry: "carbon_market",
    company_size: 120, funding_stage: "series_b",
    position_title: "Regional BD Manager (ASEAN)",
    role_category: "bd",
    required_skills: ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "プロジェクトマネジメント", "現地法人立ち上げ"],
    nice_to_have: ["インドネシア語", "ベトナム語", "現地金融知識"],
    comp_min_jpy: 10_000_000, comp_max_jpy: 14_000_000,
    location: "Jakarta or Singapore",
    remote_ok: false, has_stock_option: true, has_relocation_support: true,
    english_required: true,
    differentiator: "現地法人ヘッドへの昇進パス明示",
    source_url: "https://greenforest.example/careers/bd-asean",
  },
  {
    id: "cj-4", company: "Carbon Markets Asia", industry: "carbon_market",
    company_size: 60, funding_stage: "series_a",
    position_title: "Director of Business Development",
    role_category: "bd",
    required_skills: ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "金融", "カーボンクレジット計算"],
    nice_to_have: ["金融出身", "MBA"],
    comp_min_jpy: 14_000_000, comp_max_jpy: 20_000_000,
    location: "Singapore",
    remote_ok: false, has_stock_option: true, has_relocation_support: true,
    english_required: true,
    differentiator: "シンガポール拠点 + 金融出身者向け待遇",
    source_url: "https://cmasia.example/careers/dir-bd",
  },

  // ── 政策スペシャリスト ────────────────────
  {
    id: "cj-5", company: "Verra (NGO)", industry: "carbon_market",
    company_size: 200, funding_stage: "late",
    position_title: "Policy & Standards Lead (Asia)",
    role_category: "policy",
    required_skills: ["気候政策", "国際枠組（パリ協定/JCM）", "規制翻訳", "英語"],
    nice_to_have: ["UN 経験", "ICVCM 経験"],
    comp_min_jpy: 9_000_000, comp_max_jpy: 13_000_000,
    location: "Remote (Asia)",
    remote_ok: true, has_stock_option: false, has_relocation_support: false,
    english_required: true,
    differentiator: "国際枠組策定への参画機会",
    source_url: "https://verra.example/careers/policy-asia",
  },

  // ── PdM ──────────────────────────────
  {
    id: "cj-6", company: "SmartHR", industry: "hr_saas",
    company_size: 800, funding_stage: "ipo",
    position_title: "シニアプロダクトマネージャー",
    role_category: "pdm",
    required_skills: ["プロダクトマネジメント", "B2B SaaS", "データ分析", "UX"],
    nice_to_have: ["HR ドメイン", "API 設計"],
    comp_min_jpy: 10_000_000, comp_max_jpy: 16_000_000,
    location: "Tokyo",
    remote_ok: true, has_stock_option: true, has_relocation_support: false,
    english_required: false,
    differentiator: "上場済み + 安定 + ワークライフバランス重視",
    source_url: "https://smarthr.example/careers/spm",
  },

  // ── 競合っぽい大手 EV ───────────────────
  {
    id: "cj-7", company: "Tesla Tokyo", industry: "ev",
    company_size: 500, funding_stage: "public",
    position_title: "ML Platform Engineer",
    role_category: "ml_engineer",
    required_skills: ["Python", "PyTorch", "MLOps", "AWS", "システム設計", "Kubernetes"],
    nice_to_have: ["車載 ML", "Edge inference"],
    comp_min_jpy: 15_000_000, comp_max_jpy: 25_000_000,
    location: "Yokohama, Japan",
    remote_ok: false, has_stock_option: true, has_relocation_support: true,
    english_required: true,
    differentiator: "上場大手 + ストックオプション歴史的高",
    source_url: "https://tesla.example/careers/ml-platform",
  },

  // ── 経理 IPO ───────────────────────
  {
    id: "cj-8", company: "Layer X", industry: "hr_saas",
    company_size: 200, funding_stage: "series_b",
    position_title: "経理マネージャー（IPO 準備）",
    role_category: "finance",
    required_skills: ["連結決算", "IPO 準備", "監査対応", "freee 経験"],
    nice_to_have: ["上場経験", "あずさ/EY 出身"],
    comp_min_jpy: 9_000_000, comp_max_jpy: 13_000_000,
    location: "Tokyo",
    remote_ok: true, has_stock_option: true, has_relocation_support: false,
    english_required: false,
    differentiator: "上場準備中 + 経理組織の急拡大",
    source_url: "https://layerx.example/careers/finance",
  },
];

export const ROLE_CATEGORY_LABEL: Record<CompetitorJd["role_category"], string> = {
  ml_engineer: "ML エンジニア",
  bd:          "BD / Sales",
  policy:      "気候政策",
  pdm:         "プロダクトマネージャー",
  finance:     "経理 / IPO",
  engineer:    "ソフトウェアエンジニア",
  design:      "デザイナー",
};

/**
 * 自社のロールに対する比較対象を抽出。
 * 自社 JD（required_skills 配列）と category を渡す。
 */
export function findCompetitors(
  category: CompetitorJd["role_category"],
): CompetitorJd[] {
  return DEMO_COMPETITOR_JDS.filter((c) => c.role_category === category);
}
