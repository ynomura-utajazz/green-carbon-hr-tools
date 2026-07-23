/**
 * 採用管理（ATS）のデモデータ。
 *
 * ステージ: applied → screening → interview_1 → interview_2 → final → offer → hired
 *           （rejected はサイドステージ）
 */

export type CandidateStage =
  | "applied"
  | "screening"
  | "interview_1"
  | "interview_2"
  | "final"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

export const STAGE_ORDER: CandidateStage[] = [
  "applied", "screening", "interview_1", "interview_2", "final", "offer", "hired",
];

export const STAGE_LABEL: Record<CandidateStage, string> = {
  applied: "応募",
  screening: "書類選考",
  interview_1: "一次面接",
  interview_2: "二次面接",
  final: "最終面接",
  offer: "オファー",
  hired: "採用",
  rejected: "見送り",
  withdrawn: "辞退",
};

export const STAGE_TONE: Record<CandidateStage, string> = {
  applied: "border-gray-200 bg-gray-50 text-gray-700",
  screening: "border-blue-200 bg-blue-50 text-blue-800",
  interview_1: "border-cyan-200 bg-cyan-50 text-cyan-800",
  interview_2: "border-indigo-200 bg-indigo-50 text-indigo-800",
  final: "border-purple-200 bg-purple-50 text-purple-800",
  offer: "border-amber-200 bg-amber-50 text-amber-800",
  hired: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  withdrawn: "border-gray-200 bg-gray-50 text-gray-500",
};

export type CandidateSource =
  | "referral"
  | "linkedin"
  | "wantedly"
  | "indeed"
  | "agent"
  | "direct"
  | "alumni"
  | "contractor_conversion";

export const SOURCE_LABEL: Record<CandidateSource, string> = {
  referral: "リファラル",
  linkedin: "LinkedIn",
  wantedly: "Wantedly",
  indeed: "Indeed",
  agent: "エージェント",
  direct: "直接応募",
  alumni: "アルムナイ",
  contractor_conversion: "業務委託 → 正社員",
};

export type Position = {
  id: string;
  title: string;
  department: string;
  level: "junior" | "mid" | "senior" | "staff" | "manager" | "executive";
  job_grade: string;
  location: string;
  employment_type: "full_time" | "contract";
  is_remote_ok: boolean;
  description: string;
  required_skills: string[];
  /** 歓迎条件（必須ではないがあれば加点） */
  nice_to_have?: string[];
  salary_min: number;
  salary_max: number;
  currency: string;
  hiring_manager_id: string;
  recruiter_id: string;
  opened_at: string;
  target_close_at: string;
  is_open: boolean;
};

export type Candidate = {
  id: string;
  full_name: string;
  display_name_en?: string;
  email: string;
  phone?: string;
  current_company?: string;
  current_role?: string;
  years_of_experience?: number;
  desired_salary?: number;
  desired_currency?: string;
  expected_start_date?: string;
  position_id: string;
  source: CandidateSource;
  referrer_employee_id?: string;
  former_contractor_id?: string;
  alumni_id?: string;
  stage: CandidateStage;
  applied_at: string;
  updated_at: string;
  rating: number | null;          // 1-5（総合）
  resume_url?: string;
  linkedin_url?: string;
  notes: string;
  tags: string[];
};

export type InterviewEvent = {
  id: string;
  candidate_id: string;
  round: 1 | 2 | 3;
  scheduled_at: string;            // ISO datetime
  duration_minutes: number;
  interviewer_ids: string[];        // employees ID 配列
  format: "online" | "onsite" | "hybrid";
  meet_url?: string;
  status: "scheduled" | "completed" | "cancelled";
  feedback: InterviewFeedback[];
};

export type InterviewFeedback = {
  interviewer_id: string;
  submitted_at: string;
  scores: {
    technical: number;
    communication: number;
    culture_fit: number;
    motivation: number;
  };
  decision: "strong_hire" | "hire" | "no_hire" | "strong_no_hire";
  comment: string;
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const datetime = (offset: number, h = 14, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

// ─── 求人ポジション ────────────────────
export const DEMO_POSITIONS: Position[] = [
  {
    id: "pos-1",
    title: "シニア・ソフトウェアエンジニア",
    department: "技術",
    level: "senior",
    job_grade: "S5",
    location: "東京（リモート可）",
    employment_type: "full_time",
    is_remote_ok: true,
    description: "Carbon Credit Platform のバックエンド開発リード候補。TypeScript/Go/PostgreSQL の実務経験必須。",
    required_skills: ["TypeScript", "Node.js", "PostgreSQL", "AWS", "システム設計"],
    salary_min: 9_000_000, salary_max: 14_000_000, currency: "JPY",
    hiring_manager_id: "e8", recruiter_id: "e6",
    opened_at: day(-45), target_close_at: day(30),
    is_open: true,
  },
  {
    id: "pos-2",
    title: "プロダクトデザイナー",
    department: "プロダクト",
    level: "mid",
    job_grade: "S4",
    location: "東京",
    employment_type: "full_time",
    is_remote_ok: true,
    description: "新サービスのUX設計から実装までを担当。Figmaでのデザインシステム経験者を歓迎。",
    required_skills: ["Figma", "UXリサーチ", "Webデザイン", "プロトタイピング"],
    salary_min: 7_500_000, salary_max: 11_000_000, currency: "JPY",
    hiring_manager_id: "e14", recruiter_id: "e6",
    opened_at: day(-30), target_close_at: day(45),
    is_open: true,
  },
  {
    id: "pos-3",
    title: "事業開発（ASEAN）",
    department: "グローバル",
    level: "senior",
    job_grade: "S5",
    location: "シンガポール / 東京",
    employment_type: "full_time",
    is_remote_ok: false,
    description: "ASEAN市場でのカーボンクレジット事業の事業開発リード。英語必須・現地パートナー開拓経験者歓迎。",
    required_skills: ["事業開発", "ASEAN市場知識", "英語ビジネスレベル", "BD/Sales"],
    salary_min: 10_000_000, salary_max: 16_000_000, currency: "JPY",
    hiring_manager_id: "e19", recruiter_id: "e6",
    opened_at: day(-60), target_close_at: day(60),
    is_open: true,
  },
  {
    id: "pos-4",
    title: "コンテンツマーケター",
    department: "マーケティング",
    level: "mid",
    job_grade: "S3",
    location: "東京（フルリモート可）",
    employment_type: "full_time",
    is_remote_ok: true,
    description: "ESG・気候変動領域のコンテンツマーケティング。記事執筆・SEO・SNS運用の経験必須。",
    required_skills: ["コンテンツマーケ", "SEO", "ESG/気候変動の知識", "ライティング"],
    salary_min: 6_000_000, salary_max: 9_000_000, currency: "JPY",
    hiring_manager_id: "e23", recruiter_id: "e7",
    opened_at: day(-20), target_close_at: day(60),
    is_open: true,
  },
  {
    id: "pos-5",
    title: "経理マネージャー",
    department: "経理・財務",
    level: "manager",
    job_grade: "M3",
    location: "東京",
    employment_type: "full_time",
    is_remote_ok: false,
    description: "月次決算・連結決算・監査対応。会計士または同等の経験を持つマネージャー候補。",
    required_skills: ["月次決算", "連結決算", "IPO 経験歓迎", "freee 経験"],
    salary_min: 9_000_000, salary_max: 13_000_000, currency: "JPY",
    hiring_manager_id: "e26", recruiter_id: "e6",
    opened_at: day(-15), target_close_at: day(75),
    is_open: true,
  },
];

// ─── 候補者データ ──────────────────────
export const DEMO_CANDIDATES: Candidate[] = [
  // pos-1: シニアエンジニア（活発）
  { id: "cand-1", full_name: "田中 浩二", display_name_en: "Koji Tanaka", email: "k.tanaka@example.com", current_company: "株式会社XYZ", current_role: "テックリード", years_of_experience: 9, desired_salary: 12_000_000, desired_currency: "JPY", expected_start_date: day(60), position_id: "pos-1", source: "referral", referrer_employee_id: "e9", stage: "final", applied_at: day(-32), updated_at: day(-2), rating: 5, linkedin_url: "https://linkedin.com/in/koji-tanaka", notes: "技術力・コミュニケーション両方高い。藤本からの推薦。最終で CTO 面談調整中。", tags: ["強推薦", "リファラル"] },
  { id: "cand-2", full_name: "Raj Patel", display_name_en: "Raj Patel", email: "raj.patel@example.com", current_company: "Green Carbon (業務委託)", current_role: "シニアエンジニア (業務委託)", years_of_experience: 7, desired_salary: 11_000_000, desired_currency: "JPY", expected_start_date: day(45), position_id: "pos-1", source: "contractor_conversion", former_contractor_id: "c7", stage: "offer", applied_at: day(-20), updated_at: day(-1), rating: 5, notes: "既に業務委託で 5 ヶ月稼働。チームフィット良好。雇用転換オファー作成中。", tags: ["業務委託転換", "強推薦"] },
  { id: "cand-3", full_name: "Sarah Chen", display_name_en: "Sarah Chen", email: "sarah.chen@example.com", current_company: "Tech Co.", current_role: "Software Engineer", years_of_experience: 5, desired_salary: 9_500_000, desired_currency: "JPY", position_id: "pos-1", source: "linkedin", stage: "interview_2", applied_at: day(-18), updated_at: day(-3), rating: 4, linkedin_url: "https://linkedin.com/in/sarah-chen", notes: "技術はOK。日本語Nレベル要確認。", tags: ["英語面接"] },
  { id: "cand-4", full_name: "山本 涼", display_name_en: "Ryo Yamamoto", email: "r.yamamoto@example.com", current_company: "スタートアップA", current_role: "ソフトウェアエンジニア", years_of_experience: 4, desired_salary: 8_500_000, desired_currency: "JPY", position_id: "pos-1", source: "wantedly", stage: "interview_1", applied_at: day(-10), updated_at: day(-5), rating: 4, notes: "ポートフォリオ良好。次回 1 次面接へ。", tags: [] },
  { id: "cand-5", full_name: "中田 健", email: "k.nakata@example.com", current_company: "大手SIer", current_role: "プロジェクトリーダー", years_of_experience: 12, desired_salary: 13_000_000, desired_currency: "JPY", position_id: "pos-1", source: "agent", stage: "screening", applied_at: day(-7), updated_at: day(-2), rating: 3, notes: "経験豊富だが SIer 文化からの転換に懸念。", tags: ["要慎重"] },
  { id: "cand-6", full_name: "Park Minjun", display_name_en: "Minjun Park", email: "minjun.park@example.com", current_company: "韓国スタートアップ", current_role: "Senior Engineer", years_of_experience: 6, desired_salary: 10_000_000, desired_currency: "JPY", expected_start_date: day(90), position_id: "pos-1", source: "linkedin", stage: "applied", applied_at: day(-3), updated_at: day(-3), rating: null, notes: "応募直後。書類選考予定。", tags: ["海外", "ビザ要"] },

  // pos-2: プロダクトデザイナー
  { id: "cand-7", full_name: "鈴木 美咲", display_name_en: "Misaki Suzuki", email: "m.suzuki.designer@example.com", current_company: "デザインエージェンシーB", current_role: "シニアデザイナー", years_of_experience: 7, desired_salary: 10_000_000, desired_currency: "JPY", position_id: "pos-2", source: "referral", referrer_employee_id: "e14", stage: "final", applied_at: day(-25), updated_at: day(-1), rating: 5, linkedin_url: "https://linkedin.com/in/misaki-suzuki", notes: "デザインシステム構築経験◎。原田リードの強推薦。", tags: ["強推薦", "リファラル"] },
  { id: "cand-8", full_name: "Olivia Martinez", display_name_en: "Olivia Martinez", email: "o.martinez@example.com", current_company: "Foreign Design Studio", current_role: "Product Designer", years_of_experience: 4, desired_salary: 8_500_000, desired_currency: "JPY", position_id: "pos-2", source: "linkedin", stage: "interview_2", applied_at: day(-12), updated_at: day(-4), rating: 4, notes: "リサーチ経験豊富。ビジュアルデザインも強い。", tags: ["英語面接"] },
  { id: "cand-9", full_name: "佐久間 奈緒", email: "n.sakuma@example.com", current_company: "EC企業", current_role: "UIデザイナー", years_of_experience: 3, desired_salary: 7_000_000, desired_currency: "JPY", position_id: "pos-2", source: "wantedly", stage: "interview_1", applied_at: day(-8), updated_at: day(-3), rating: 3, notes: "ジュニア寄り。育成前提なら可。", tags: [] },
  { id: "cand-10", full_name: "渡辺 翔太", email: "s.watanabe@example.com", current_company: "Webメディア", current_role: "Webデザイナー", years_of_experience: 5, desired_salary: 8_000_000, desired_currency: "JPY", position_id: "pos-2", source: "direct", stage: "screening", applied_at: day(-5), updated_at: day(-2), rating: null, notes: "ポートフォリオ確認中。", tags: [] },
  { id: "cand-11", full_name: "Kim Taeyon", display_name_en: "Taeyon Kim", email: "kim.t@example.com", current_company: "Korean Tech Co.", current_role: "Senior Designer", years_of_experience: 8, desired_salary: 11_000_000, desired_currency: "JPY", position_id: "pos-2", source: "agent", stage: "applied", applied_at: day(-2), updated_at: day(-2), rating: null, notes: "エージェント経由、書類受領直後。", tags: ["海外", "ビザ要"] },

  // pos-3: 事業開発 ASEAN
  { id: "cand-12", full_name: "Lim Wei Jie", display_name_en: "Wei Jie Lim", email: "wj.lim@example.com", current_company: "Climate Asia Pte Ltd", current_role: "BD Manager", years_of_experience: 10, desired_salary: 15_000_000, desired_currency: "JPY", expected_start_date: day(60), position_id: "pos-3", source: "linkedin", stage: "final", applied_at: day(-40), updated_at: day(-1), rating: 5, linkedin_url: "https://linkedin.com/in/weijielim", notes: "ASEAN BD 経験 10 年。最終面接で COO 対応中。", tags: ["強推薦", "海外", "シンガポール"] },
  { id: "cand-13", full_name: "Indah Permatasari", display_name_en: "Indah Permatasari", email: "indah.p@example.com", current_company: "Indonesian NGO", current_role: "Program Director", years_of_experience: 8, desired_salary: 11_000_000, desired_currency: "JPY", position_id: "pos-3", source: "referral", referrer_employee_id: "e22", stage: "interview_2", applied_at: day(-22), updated_at: day(-6), rating: 4, notes: "NGO バックグラウンドで気候政策に強い。Sara Aimen からの推薦。", tags: ["リファラル", "海外"] },
  { id: "cand-14", full_name: "Tran Van Hai", display_name_en: "Hai Tran", email: "hai.tran@example.com", current_company: "Vietnam Climate Initiative", current_role: "BD Lead", years_of_experience: 6, desired_salary: 8_500_000, desired_currency: "JPY", position_id: "pos-3", source: "agent", stage: "interview_1", applied_at: day(-15), updated_at: day(-7), rating: 3, notes: "ベトナム市場に強い。", tags: ["海外"] },

  // pos-4: コンテンツマーケター
  { id: "cand-15", full_name: "高田 真理子", email: "m.takada@example.com", current_company: "メディア企業C", current_role: "編集者", years_of_experience: 6, desired_salary: 7_500_000, desired_currency: "JPY", position_id: "pos-4", source: "wantedly", stage: "interview_2", applied_at: day(-20), updated_at: day(-3), rating: 4, notes: "気候変動領域の記事執筆実績あり。", tags: [] },
  { id: "cand-16", full_name: "三浦 雄介", email: "y.miura@example.com", current_company: "PR会社", current_role: "PRコンサルタント", years_of_experience: 5, desired_salary: 7_000_000, desired_currency: "JPY", position_id: "pos-4", source: "direct", stage: "interview_1", applied_at: day(-10), updated_at: day(-4), rating: 3, notes: "PR 視点のコンテンツに強み。", tags: [] },
  { id: "cand-17", full_name: "横田 千夏", email: "c.yokota@example.com", current_company: "SEO エージェンシー", current_role: "コンテンツストラテジスト", years_of_experience: 4, desired_salary: 6_500_000, desired_currency: "JPY", position_id: "pos-4", source: "linkedin", stage: "screening", applied_at: day(-5), updated_at: day(-2), rating: null, notes: "SEO 専門。書類選考中。", tags: [] },

  // pos-5: 経理マネージャー
  { id: "cand-18", full_name: "佐藤 智彦", email: "t.satou.cpa@example.com", current_company: "監査法人ABC", current_role: "シニアマネージャー", years_of_experience: 14, desired_salary: 12_500_000, desired_currency: "JPY", position_id: "pos-5", source: "agent", stage: "interview_2", applied_at: day(-12), updated_at: day(-2), rating: 5, notes: "公認会計士。IPO 支援経験 4 件。", tags: ["強推薦", "公認会計士"] },
  { id: "cand-19", full_name: "Galina Sofia", display_name_en: "Sofia Galina", email: "sofia.g.alt@example.com", current_company: "Green Carbon", current_role: "経理スペシャリスト", years_of_experience: 5, desired_salary: 9_000_000, desired_currency: "JPY", position_id: "pos-5", source: "alumni", alumni_id: "e27", stage: "interview_1", applied_at: day(-8), updated_at: day(-3), rating: 4, notes: "社内昇進候補。CFO 串田推薦。", tags: ["社内昇進候補"] },
  { id: "cand-20", full_name: "西本 美香", email: "m.nishimoto@example.com", current_company: "事業会社", current_role: "経理マネージャー", years_of_experience: 9, desired_salary: 10_000_000, desired_currency: "JPY", position_id: "pos-5", source: "wantedly", stage: "applied", applied_at: day(-3), updated_at: day(-3), rating: null, notes: "応募直後。", tags: [] },

  // 完了：採用済 (1名)
  { id: "cand-21", full_name: "Wibowo Agus", display_name_en: "Agus Wibowo", email: "agus.w.alt@example.com", current_company: "前職: Green Carbon (業務委託)", current_role: "シニアエンジニア", years_of_experience: 8, desired_salary: 10_500_000, desired_currency: "JPY", position_id: "pos-1", source: "contractor_conversion", former_contractor_id: "c-prev", stage: "hired", applied_at: day(-90), updated_at: day(-30), rating: 5, notes: "業務委託 → 正社員化。2026/02 入社済。", tags: ["業務委託転換", "完了"] },

  // 見送り (3名)
  { id: "cand-22", full_name: "市村 大樹", email: "d.ichimura@example.com", current_company: "B2B SaaS", current_role: "エンジニア", years_of_experience: 3, position_id: "pos-1", source: "indeed", stage: "rejected", applied_at: day(-25), updated_at: day(-15), rating: 2, notes: "経験年数とポジション要件のミスマッチ。次回機会あれば。", tags: [] },
  { id: "cand-23", full_name: "山口 麻美", email: "a.yamaguchi@example.com", current_company: "デザインスタジオ", current_role: "Webデザイナー", years_of_experience: 2, position_id: "pos-2", source: "wantedly", stage: "rejected", applied_at: day(-18), updated_at: day(-12), rating: 2, notes: "ジュニア過ぎる。", tags: [] },
  { id: "cand-24", full_name: "Carlos Mendez", display_name_en: "Carlos Mendez", email: "c.mendez@example.com", current_company: "LATAM Climate", current_role: "BD", years_of_experience: 5, position_id: "pos-3", source: "linkedin", stage: "withdrawn", applied_at: day(-30), updated_at: day(-20), rating: 3, notes: "本人都合で辞退。他社オファー。", tags: [] },
];

// ─── 面接イベント ──────────────────────
export const DEMO_INTERVIEWS: InterviewEvent[] = [
  {
    id: "iv-1", candidate_id: "cand-1", round: 3, scheduled_at: datetime(3, 17, 0), duration_minutes: 60,
    interviewer_ids: ["e1", "e8"], format: "online", meet_url: "https://meet.google.com/abc-defg-hij",
    status: "scheduled", feedback: [],
  },
  {
    id: "iv-2", candidate_id: "cand-1", round: 2, scheduled_at: datetime(-5, 14, 0), duration_minutes: 60,
    interviewer_ids: ["e8", "e9"], format: "online",
    status: "completed",
    feedback: [
      { interviewer_id: "e8", submitted_at: datetime(-4, 18), scores: { technical: 5, communication: 5, culture_fit: 5, motivation: 4 }, decision: "strong_hire", comment: "技術の深さ・チームでの動き方両方ハイレベル。シニアレベル即戦力。" },
      { interviewer_id: "e9", submitted_at: datetime(-4, 19), scores: { technical: 5, communication: 4, culture_fit: 5, motivation: 5 }, decision: "strong_hire", comment: "藤本推薦どおり。ぜひ最終に進めたい。" },
    ],
  },
  {
    id: "iv-3", candidate_id: "cand-7", round: 3, scheduled_at: datetime(2, 15, 0), duration_minutes: 60,
    interviewer_ids: ["e1", "e4"], format: "onsite",
    status: "scheduled", feedback: [],
  },
  {
    id: "iv-4", candidate_id: "cand-12", round: 3, scheduled_at: datetime(5, 10, 0), duration_minutes: 90,
    interviewer_ids: ["e3", "e19"], format: "online", meet_url: "https://meet.google.com/xyz-1234-pqr",
    status: "scheduled", feedback: [],
  },
  {
    id: "iv-5", candidate_id: "cand-3", round: 2, scheduled_at: datetime(1, 16, 0), duration_minutes: 60,
    interviewer_ids: ["e9", "e10"], format: "online",
    status: "scheduled", feedback: [],
  },
];

// ─── ヘルパ ─────────────────────────────
export function candidatesByStage(
  candidates: Candidate[] = DEMO_CANDIDATES,
  positionId?: string,
): Map<CandidateStage, Candidate[]> {
  const map = new Map<CandidateStage, Candidate[]>();
  for (const stage of [...STAGE_ORDER, "rejected", "withdrawn"] as CandidateStage[]) {
    map.set(stage, []);
  }
  for (const c of candidates) {
    if (positionId && c.position_id !== positionId) continue;
    map.get(c.stage)!.push(c);
  }
  return map;
}

export function nextStage(stage: CandidateStage): CandidateStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function interviewsForCandidate(
  candidateId: string,
  interviews: InterviewEvent[] = DEMO_INTERVIEWS,
): InterviewEvent[] {
  return interviews
    .filter((i) => i.candidate_id === candidateId)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
}

export function positionById(id: string): Position | undefined {
  return DEMO_POSITIONS.find((p) => p.id === id);
}

export function candidatesForPosition(
  id: string,
  candidates: Candidate[] = DEMO_CANDIDATES,
): Candidate[] {
  return candidates.filter((c) => c.position_id === id);
}

export function activePipelineCount(candidates: Candidate[] = DEMO_CANDIDATES): number {
  return candidates.filter((c) => !["rejected", "withdrawn", "hired"].includes(c.stage)).length;
}
