/**
 * 学習プラットフォーム：スキル習得トラッキング + ラーニングパス + 社内勉強会。
 */

export type SkillLevel = 0 | 1 | 2 | 3 | 4; // 0:未取得 / 1:学習中 / 2:基礎 / 3:実務 / 4:エキスパート

export type SkillTracking = {
  employee_id: string;
  /** スキル → レベル */
  skills: Record<string, SkillLevel>;
};

export type LearningResource = {
  id: string;
  title: string;
  provider: "udemy" | "coursera" | "linkedin_learning" | "internal" | "book" | "youtube";
  /** 主要なスキル */
  primary_skills: string[];
  /** 想定所要時間（時間） */
  duration_hours: number;
  /** 難易度 */
  level: "beginner" | "intermediate" | "advanced";
  /** URL */
  url: string;
  /** 評価（4-5 が高評価、1-2 が低評価） */
  rating?: number;
  /** 推薦者数 */
  recommended_by: number;
};

export type LearningPath = {
  id: string;
  name: string;
  /** 対象（career goal） */
  target: string;
  /** 構成リソース ID 順 */
  steps: string[];
  /** 完了で得られる主要スキル */
  skills_gained: string[];
  /** 推定総時間 */
  total_hours: number;
};

export type StudyGroup = {
  id: string;
  name: string;
  topic: string;
  organizer_id: string;
  /** 開催頻度（"weekly" | "biweekly" | "monthly" | "ad_hoc"） */
  cadence: string;
  /** 参加者数 */
  member_count: number;
  /** 次回予定 */
  next_session_at?: string;
  /** 主なスキル */
  skills: string[];
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

// ── スキルトラッキング（11 名分のサンプル） ─────────────────
export const DEMO_SKILL_TRACKING: SkillTracking[] = [
  { employee_id: "e8",  skills: { "TypeScript": 4, "Node.js": 4, "AWS": 4, "システム設計": 4, "チームビルディング": 4, "PostgreSQL": 3, "Python": 2, "Rust": 1, "ML": 0 } },
  { employee_id: "e9",  skills: { "TypeScript": 4, "Rust": 4, "PostgreSQL": 4, "システム設計": 4, "Python": 3, "カーボン計算": 4, "AWS": 3, "ML": 1 } },
  { employee_id: "e10", skills: { "TypeScript": 4, "Next.js": 4, "PostgreSQL": 4, "AWS": 3, "技術文書": 4, "Python": 2, "Rust": 1 } },
  { employee_id: "e11", skills: { "TypeScript": 3, "Python": 3, "AWS": 3, "PostgreSQL": 3, "ML": 2, "MLOps": 1 } },
  { employee_id: "e12", skills: { "TypeScript": 4, "React": 4, "Node.js": 3, "AWS": 2 } },
  { employee_id: "e13", skills: { "TypeScript": 2, "JavaScript": 2, "Git": 3 } },
  { employee_id: "e14", skills: { "Figma": 4, "UXリサーチ": 4, "Webデザイン": 4, "ブランドデザイン": 4, "プロトタイピング": 4 } },
  { employee_id: "e15", skills: { "Figma": 4, "UXリサーチ": 3, "Webデザイン": 4, "プロトタイピング": 3 } },
  { employee_id: "e3",  skills: { "事業開発": 4, "ASEAN市場知識": 4, "BD/Sales": 4, "事業計画": 4, "英語ビジネスレベル": 4 } },
  { employee_id: "e4",  skills: { "プロダクトマネジメント": 4, "事業計画": 4, "UX": 4, "データ分析": 4 } },
  { employee_id: "e7",  skills: { "L&D": 4, "研修設計": 3, "韓国市場": 4, "英語ビジネスレベル": 3 } },
];

// ── 学習リソース ─────────────────────────────
export const DEMO_RESOURCES: LearningResource[] = [
  { id: "r-1", title: "Deep Learning Specialization", provider: "coursera",
    primary_skills: ["ML", "PyTorch", "Python"], duration_hours: 60, level: "intermediate",
    url: "https://coursera.org/learn/deep-learning",
    rating: 4.7, recommended_by: 5 },
  { id: "r-2", title: "MLOps Engineering on AWS", provider: "udemy",
    primary_skills: ["MLOps", "AWS", "Python"], duration_hours: 24, level: "intermediate",
    url: "https://udemy.com/mlops-aws", rating: 4.5, recommended_by: 3 },
  { id: "r-3", title: "Rust Programming - The Complete Guide", provider: "udemy",
    primary_skills: ["Rust"], duration_hours: 40, level: "beginner",
    url: "https://udemy.com/rust", rating: 4.6, recommended_by: 4 },
  { id: "r-4", title: "Designing Data-Intensive Applications（書籍）", provider: "book",
    primary_skills: ["システム設計", "PostgreSQL"], duration_hours: 30, level: "advanced",
    url: "https://example.com/ddia", rating: 4.9, recommended_by: 8 },
  { id: "r-5", title: "Carbon Accounting Fundamentals (社内研修)", provider: "internal",
    primary_skills: ["カーボン計算", "ESG/気候変動の知識"], duration_hours: 8, level: "beginner",
    url: "/wiki/carbon-101", rating: 4.4, recommended_by: 12 },
  { id: "r-6", title: "Negotiation Mastery", provider: "linkedin_learning",
    primary_skills: ["BD/Sales", "コミュニケーション"], duration_hours: 6, level: "intermediate",
    url: "https://linkedin.com/learning/negotiation",
    rating: 4.5, recommended_by: 2 },
  { id: "r-7", title: "Figma Advanced Components", provider: "youtube",
    primary_skills: ["Figma", "プロトタイピング"], duration_hours: 4, level: "advanced",
    url: "https://youtube.com/figma-advanced", rating: 4.7, recommended_by: 3 },
  { id: "r-8", title: "Product Management Bootcamp", provider: "coursera",
    primary_skills: ["プロダクトマネジメント", "UX", "データ分析"], duration_hours: 30, level: "intermediate",
    url: "https://coursera.org/pm-bootcamp", rating: 4.6, recommended_by: 4 },
];

// ── ラーニングパス ──────────────────────────
export const DEMO_PATHS: LearningPath[] = [
  {
    id: "p-1",
    name: "Carbon ML エンジニア育成パス",
    target: "Carbon ML 領域でテックリード相当",
    steps: ["r-5", "r-1", "r-2", "r-4"],
    skills_gained: ["カーボン計算", "ML", "MLOps", "システム設計"],
    total_hours: 122,
  },
  {
    id: "p-2",
    name: "PdM ステップアップ",
    target: "B2B SaaS PdM として独立して機能を回せる",
    steps: ["r-8", "r-6"],
    skills_gained: ["プロダクトマネジメント", "BD/Sales"],
    total_hours: 36,
  },
  {
    id: "p-3",
    name: "シニアエンジニア → テックリード",
    target: "技術深耕 + 設計力 + 後輩育成",
    steps: ["r-4", "r-3"],
    skills_gained: ["システム設計", "Rust"],
    total_hours: 70,
  },
];

// ── 社内勉強会 ───────────────────────────
export const DEMO_STUDY_GROUPS: StudyGroup[] = [
  {
    id: "sg-1", name: "Rust 勉強会", topic: "Rust の基礎から実務利用まで",
    organizer_id: "e9", cadence: "weekly", member_count: 8,
    next_session_at: day(3), skills: ["Rust", "システム設計"],
  },
  {
    id: "sg-2", name: "ML × 気候 読書会", topic: "リモートセンシング論文輪読",
    organizer_id: "e9", cadence: "biweekly", member_count: 5,
    next_session_at: day(6), skills: ["ML", "カーボン計算"],
  },
  {
    id: "sg-3", name: "デザインクリティーク", topic: "プロダクトデザインの相互レビュー",
    organizer_id: "e14", cadence: "weekly", member_count: 6,
    next_session_at: day(2), skills: ["Figma", "UXリサーチ", "Webデザイン"],
  },
  {
    id: "sg-4", name: "ASEAN 市場勉強会", topic: "現地最新動向の共有",
    organizer_id: "e3", cadence: "monthly", member_count: 12,
    next_session_at: day(11), skills: ["ASEAN市場知識", "BD/Sales"],
  },
  {
    id: "sg-5", name: "英語ライティング", topic: "技術文書の英訳練習",
    organizer_id: "e7", cadence: "biweekly", member_count: 9,
    next_session_at: day(8), skills: ["英語ビジネスレベル", "技術文書"],
  },
];

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  0: "未取得",
  1: "学習中",
  2: "基礎",
  3: "実務",
  4: "エキスパート",
};

export const PROVIDER_LABEL: Record<LearningResource["provider"], string> = {
  udemy: "Udemy",
  coursera: "Coursera",
  linkedin_learning: "LinkedIn Learning",
  internal: "社内研修",
  book: "書籍",
  youtube: "YouTube",
};

export const PROVIDER_COLOR: Record<LearningResource["provider"], string> = {
  udemy: "bg-purple-100 text-purple-800",
  coursera: "bg-blue-100 text-blue-800",
  linkedin_learning: "bg-indigo-100 text-indigo-800",
  internal: "bg-gc-100 text-gc-800",
  book: "bg-amber-100 text-amber-800",
  youtube: "bg-red-100 text-red-800",
};
