/**
 * タレントプール（CRM 的）デモデータ。
 *
 * 種別：
 *  - past_applicant: 過去応募者（不採用 / 辞退）
 *  - alumni       : アルムナイ（退職した元社員）
 *  - casual       : カジュアル面談だけ実施した人
 *  - silver_medal : 最終まで進んだが他社決定 / タイミング合わずの惜敗候補
 *
 * ステータス（CRM 状態）：
 *  - cold    : 未接触
 *  - warm    : 連絡したが返信なし
 *  - engaged : 再接触で何か反応あり
 *  - re_open : 再選考フェーズに入った
 *  - parked  : 当面アプローチ不要
 */

export type TalentKind = "past_applicant" | "alumni" | "casual" | "silver_medal";
export type TalentStatus = "cold" | "warm" | "engaged" | "re_open" | "parked";

export type TalentPoolEntry = {
  id: string;
  full_name: string;
  display_name_en?: string;
  email: string;
  kind: TalentKind;
  status: TalentStatus;
  /** 元のソース（採用経路） */
  original_source: "referral" | "linkedin" | "wantedly" | "indeed" | "agent" | "direct" | "alumni" | "contractor_conversion";
  /** 過去に応募していた position id（あれば） */
  last_position_id?: string;
  /** 過去に到達した最終ステージ */
  last_stage?: string;
  /** ロール / 役職（最新） */
  current_role?: string;
  current_company?: string;
  years_of_experience?: number;
  skills: string[];
  location: string;
  country_code: string;
  /** 最後に何があったか */
  last_event_at: string; // ISO
  last_event_summary: string;
  /** 最後に接触した日 */
  last_contacted_at?: string;
  /** Champion / 担当者（社内） */
  owner_employee_id?: string;
  notes?: string;
  /** 応募意思（外部プールと整合） */
  open_signal: "open" | "passive" | "not_looking" | "unknown";
  tags: string[];
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const DEMO_TALENT_POOL: TalentPoolEntry[] = [
  // ── アルムナイ（退職社員）─────────────────────────
  {
    id: "tp-1",
    full_name: "Wilson John",
    display_name_en: "John Wilson",
    email: "j.wilson@alumni.green-carbon.inc",
    kind: "alumni",
    status: "engaged",
    original_source: "alumni",
    current_role: "Engineering Manager",
    current_company: "Mountain View ClimateAI（米）",
    years_of_experience: 11,
    skills: ["TypeScript", "Python", "PyTorch", "MLOps", "システム設計", "チームビルディング"],
    location: "Mountain View, USA",
    country_code: "US",
    last_event_at: day(-180),
    last_event_summary: "プロジェクト終了で円満退職（2025-09）",
    last_contacted_at: day(-30),
    owner_employee_id: "e8",
    notes: "現職で ML マネジメント 6 ヶ月経験。当社の AI 強化フェーズで再 join 可能性あり。",
    open_signal: "passive",
    tags: ["元エンジニア", "海外在住", "ML 寄り"],
  },
  {
    id: "tp-2",
    full_name: "Mendez Carlos",
    display_name_en: "Carlos Mendez",
    email: "c.mendez@alumni.green-carbon.inc",
    kind: "alumni",
    status: "cold",
    original_source: "alumni",
    current_role: "Country Manager",
    current_company: "メキシコ Carbon Markets",
    years_of_experience: 9,
    skills: ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "現地法人立ち上げ", "中南米市場"],
    location: "Mexico City, Mexico",
    country_code: "MX",
    last_event_at: day(-150),
    last_event_summary: "他社オファーで退職（2025-12）",
    owner_employee_id: "e3",
    notes: "中南米市場の知見。当社が中南米進出する際の最有力候補。",
    open_signal: "unknown",
    tags: ["元 BD", "中南米"],
  },
  // ── 銀メダル（惜敗候補）───────────────────────────
  {
    id: "tp-3",
    full_name: "中田 健",
    email: "k.nakata@example.com",
    kind: "silver_medal",
    status: "cold",
    original_source: "agent",
    last_position_id: "pos-1",
    last_stage: "final",
    current_role: "プロジェクトリーダー",
    current_company: "大手SIer",
    years_of_experience: 12,
    skills: ["TypeScript", "システム設計", "プロジェクトマネジメント"],
    location: "Tokyo, Japan",
    country_code: "JP",
    last_event_at: day(-120),
    last_event_summary: "最終面接後、年収条件 NG で見送り",
    notes: "技術力・人柄ともに高評価。年収レンジが上がれば再検討余地あり。",
    open_signal: "not_looking",
    tags: ["銀メダル", "条件 NG"],
  },
  {
    id: "tp-4",
    full_name: "Ahmed Hassan",
    display_name_en: "Hassan Ahmed",
    email: "h.ahmed@example.com",
    kind: "silver_medal",
    status: "warm",
    original_source: "linkedin",
    last_position_id: "pos-1",
    last_stage: "offer",
    current_role: "Senior ML Engineer",
    current_company: "Singapore CleanTech",
    years_of_experience: 8,
    skills: ["Python", "PyTorch", "MLOps", "時系列データ", "PostgreSQL", "衛星画像処理"],
    location: "Singapore",
    country_code: "SG",
    last_event_at: day(-90),
    last_event_summary: "オファー出したがビザの都合で辞退（2026-02）",
    last_contacted_at: day(-45),
    owner_employee_id: "e2",
    notes: "ML × 衛星画像の専門家。シンガポール拠点なら再検討の可能性。",
    open_signal: "passive",
    tags: ["銀メダル", "ML", "ビザ要"],
  },
  // ── 過去応募者（不採用）─────────────────────────
  {
    id: "tp-5",
    full_name: "山本 涼",
    email: "r.yamamoto@example.com",
    kind: "past_applicant",
    status: "parked",
    original_source: "wantedly",
    last_position_id: "pos-1",
    last_stage: "interview_2",
    current_role: "ソフトウェアエンジニア",
    current_company: "スタートアップA",
    years_of_experience: 4,
    skills: ["TypeScript", "Next.js", "PostgreSQL"],
    location: "Tokyo, Japan",
    country_code: "JP",
    last_event_at: day(-200),
    last_event_summary: "2 次面接で経験不足判定。1-2 年後の再応募歓迎と本人合意済",
    notes: "成長性は感じる。1-2 年後にもう一度声をかける候補。",
    open_signal: "unknown",
    tags: ["将来候補"],
  },
  // ── カジュアル面談 ─────────────────────────────
  {
    id: "tp-6",
    full_name: "野村 健太",
    display_name_en: "Kenta Nomura",
    email: "k.nomura.pm@example.com",
    kind: "casual",
    status: "engaged",
    original_source: "linkedin",
    current_role: "Senior Product Manager",
    current_company: "Slack Japan",
    years_of_experience: 8,
    skills: ["プロダクトマネジメント", "B2B SaaS", "データ分析", "UX"],
    location: "Tokyo, Japan",
    country_code: "JP",
    last_event_at: day(-60),
    last_event_summary: "CPO 山田と 60 分のカジュアル面談。気候領域への関心は強い",
    last_contacted_at: day(-20),
    owner_employee_id: "e4",
    notes: "現職での残務もあり、約 6 ヶ月後に動ける見込み。CPO とのコミュニケーション維持中。",
    open_signal: "passive",
    tags: ["PdM", "高関心", "6M 待ち"],
  },
  {
    id: "tp-7",
    full_name: "石川 怜",
    display_name_en: "Rei Ishikawa",
    email: "r.ishikawa@example.com",
    kind: "casual",
    status: "cold",
    original_source: "referral",
    current_role: "編集長",
    current_company: "ESG メディア",
    years_of_experience: 12,
    skills: ["コンテンツマーケ", "SEO", "ESG/気候変動の知識", "ライティング"],
    location: "Tokyo, Japan",
    country_code: "JP",
    last_event_at: day(-100),
    last_event_summary: "塚本リクルーター紹介でカジュアル。当時はマーケポジションなし",
    owner_employee_id: "e6",
    notes: "経済紙出身。今 ESG コンテンツ責任者ポジション化すれば最有力。",
    open_signal: "passive",
    tags: ["マーケ", "編集経験"],
  },
  {
    id: "tp-8",
    full_name: "Park Jisoo",
    display_name_en: "Jisoo Park",
    email: "j.park@example.com",
    kind: "casual",
    status: "engaged",
    original_source: "linkedin",
    current_role: "Head of Product",
    current_company: "ソウル ESG Tech",
    years_of_experience: 9,
    skills: ["プロダクトマネジメント", "B2B SaaS", "UX", "データ分析"],
    location: "Seoul, South Korea",
    country_code: "KR",
    last_event_at: day(-40),
    last_event_summary: "オンラインで 30 分。グローバルチームで働きたい意向強い",
    last_contacted_at: day(-15),
    owner_employee_id: "e7",
    notes: "韓国市場拡大時の最有力 PdM 候補。Park Jihye 同士のネットワーク。",
    open_signal: "open",
    tags: ["韓国市場", "PdM"],
  },
  {
    id: "tp-9",
    full_name: "Aditya Kumar",
    email: "a.kumar.ml@example.com",
    kind: "casual",
    status: "warm",
    original_source: "linkedin",
    current_role: "Senior ML Engineer",
    current_company: "Bengaluru ClimateAI",
    years_of_experience: 7,
    skills: ["Python", "PyTorch", "MLOps", "時系列データ", "PostgreSQL", "衛星画像処理"],
    location: "Bengaluru, India",
    country_code: "IN",
    last_event_at: day(-25),
    last_event_summary: "VPoE 川崎と 45 分。リモート前提なら興味",
    last_contacted_at: day(-10),
    owner_employee_id: "e8",
    notes: "ML × 衛星 × 気候のドンピシャ。インド在住・リモートなら可能性高い。",
    open_signal: "passive",
    tags: ["ML", "インド", "高優先"],
  },
  {
    id: "tp-10",
    full_name: "Putri Setiawan",
    email: "p.setiawan@example.com",
    kind: "casual",
    status: "engaged",
    original_source: "referral",
    current_role: "Senior BD Manager",
    current_company: "Jakarta Energy Co.",
    years_of_experience: 8,
    skills: ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "PJM"],
    location: "Jakarta, Indonesia",
    country_code: "ID",
    last_event_at: day(-50),
    last_event_summary: "COO 佐藤と 60 分。10 月以降なら動ける",
    last_contacted_at: day(-12),
    owner_employee_id: "e3",
    notes: "ASEAN 拡大の最有力 BD。佐藤 COO が直接フォロー。",
    open_signal: "open",
    tags: ["BD", "ASEAN", "高優先"],
  },
  // ── その他バルク ─────────────────────────────
  {
    id: "tp-11",
    full_name: "佐藤 奈々",
    email: "n.sato@example.com",
    kind: "past_applicant",
    status: "cold",
    original_source: "agent",
    last_position_id: "pos-2",
    last_stage: "screening",
    current_role: "UX デザイナー",
    current_company: "東京デザインエージェンシー",
    years_of_experience: 6,
    skills: ["Figma", "UXリサーチ", "Webデザイン"],
    location: "Tokyo, Japan",
    country_code: "JP",
    last_event_at: day(-300),
    last_event_summary: "書類選考でレベル不一致。10 ヶ月経過、再応募可能性あり",
    open_signal: "unknown",
    tags: ["UX"],
  },
  {
    id: "tp-12",
    full_name: "Lopez Maria",
    display_name_en: "Maria Lopez",
    email: "m.lopez@alumni.green-carbon.inc",
    kind: "alumni",
    status: "warm",
    original_source: "alumni",
    current_role: "Director of Sustainability",
    current_company: "Madrid GreenFinance",
    years_of_experience: 13,
    skills: ["BD/Sales", "ESG/気候変動の知識", "英語ビジネスレベル", "金融"],
    location: "Madrid, Spain",
    country_code: "ES",
    last_event_at: day(-365),
    last_event_summary: "1 年前に円満退職。欧州拡大の際は連絡欲しいと本人発言",
    last_contacted_at: day(-90),
    owner_employee_id: "e1",
    notes: "欧州 ESG 金融。当社が欧州進出する際の橋渡し候補。",
    open_signal: "passive",
    tags: ["元社員", "欧州", "サステナ"],
  },
];

export const KIND_LABEL: Record<TalentKind, string> = {
  past_applicant: "過去応募者",
  alumni:         "アルムナイ",
  casual:         "カジュアル面談",
  silver_medal:   "銀メダル",
};

export const KIND_COLOR: Record<TalentKind, string> = {
  past_applicant: "border-gray-300 bg-gray-50 text-gray-700",
  alumni:         "border-purple-300 bg-purple-50 text-purple-800",
  casual:         "border-blue-300 bg-blue-50 text-blue-800",
  silver_medal:   "border-amber-300 bg-amber-50 text-amber-800",
};

export const STATUS_LABEL: Record<TalentStatus, string> = {
  cold:    "未接触",
  warm:    "返信待ち",
  engaged: "対話中",
  re_open: "再選考中",
  parked:  "保留",
};

export const STATUS_COLOR: Record<TalentStatus, string> = {
  cold:    "bg-gray-100 text-gray-700",
  warm:    "bg-amber-100 text-amber-800",
  engaged: "bg-emerald-100 text-emerald-800",
  re_open: "bg-blue-100 text-blue-800",
  parked:  "bg-muted text-muted-foreground",
};

export const SIGNAL_COLOR: Record<TalentPoolEntry["open_signal"], string> = {
  open:        "bg-emerald-100 text-emerald-800",
  passive:     "bg-amber-100 text-amber-800",
  not_looking: "bg-gray-100 text-gray-700",
  unknown:     "bg-gray-100 text-gray-700",
};
