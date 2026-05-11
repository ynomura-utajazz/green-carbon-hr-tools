/**
 * 外部候補プール（LinkedIn 風 / リファラル候補のソース）。
 *
 * 本番では LinkedIn API / Wantedly / GitHub から非同期収集する想定。
 * デモではタイプ多様な 30 名を固定で持つ。
 *
 * 「誰が知っていそうか」のシグナル：
 *  - 同じ会社（current / past）
 *  - 同じ業界カテゴリ
 *  - 共通スキル
 *  - 同じ国・地域
 */

export type ExternalProfile = {
  id: string;
  full_name: string;
  display_name_en?: string;
  current_company: string;
  current_role: string;
  past_companies: string[];
  /** 業界カテゴリ（社員プロフィールと突合） */
  industry: "consulting" | "tech_startup" | "tech_bigco" | "research" | "ngo" | "energy" | "finance" | "agency" | "other";
  skills: string[];
  years_of_experience: number;
  location: string;     // "Tokyo, Japan" / "Singapore" / "Jakarta"
  country_code: string; // "JP" / "SG" / "ID" / "VN" / ...
  linkedin_url?: string;
  github_url?: string;
  /** 公開状態：応募意思の段階 */
  signal: "open_to_work" | "passive" | "not_looking";
  /** 短い自己紹介 / リサーチサマリ */
  bio: string;
};

export const DEMO_EXTERNAL_POOL: ExternalProfile[] = [
  // ── ML / Carbon ドメイン
  { id: "x1",  full_name: "Aditya Kumar", display_name_en: "Aditya Kumar",
    current_company: "Bengaluru ClimateAI", current_role: "Senior ML Engineer",
    past_companies: ["Google India", "IIT Bombay"], industry: "tech_startup",
    skills: ["Python", "PyTorch", "MLOps", "時系列データ", "PostgreSQL", "衛星画像処理"],
    years_of_experience: 7, location: "Bengaluru, India", country_code: "IN",
    linkedin_url: "https://linkedin.com/in/aditya-kumar-ml",
    signal: "passive",
    bio: "ClimateAI で森林炭素量推定モデルを 3 年運用。Sentinel-2 と PyTorch で精度向上。" },
  { id: "x2",  full_name: "張 雪", display_name_en: "Xue Zhang",
    current_company: "上海 GreenTech", current_role: "AI Research Engineer",
    past_companies: ["Microsoft Research Asia", "清華大学"], industry: "research",
    skills: ["Python", "TensorFlow", "MLOps", "論文執筆", "リモートセンシング"],
    years_of_experience: 5, location: "Shanghai, China", country_code: "CN",
    linkedin_url: "https://linkedin.com/in/xue-zhang-ai",
    signal: "open_to_work",
    bio: "リモートセンシング × ML の論文 4 本。気候領域に専念したい。日本語学習中。" },
  { id: "x3",  full_name: "山下 直樹", display_name_en: "Naoki Yamashita",
    current_company: "東京 ML スタートアップ", current_role: "ML Lead",
    past_companies: ["Google Japan", "東大大学院"], industry: "tech_bigco",
    skills: ["Python", "PyTorch", "MLOps", "システム設計", "チームビルディング"],
    years_of_experience: 9, location: "Tokyo, Japan", country_code: "JP",
    linkedin_url: "https://linkedin.com/in/naoki-yamashita",
    signal: "passive",
    bio: "Google で広告 ML を 4 年。現職で ML チーム 6 名をリード。気候領域に転身興味あり。" },

  // ── ASEAN BD / Sales
  { id: "x4",  full_name: "Putri Setiawan", display_name_en: "Putri Setiawan",
    current_company: "Jakarta Energy Co.", current_role: "Senior BD Manager",
    past_companies: ["McKinsey Indonesia", "PT Pertamina"], industry: "consulting",
    skills: ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "プロジェクトマネジメント", "エネルギー業界"],
    years_of_experience: 8, location: "Jakarta, Indonesia", country_code: "ID",
    signal: "open_to_work",
    bio: "Pertamina で再エネプロジェクト 3 件主導。気候テックに転身希望。インドネシア語・英語ネイティブ。" },
  { id: "x5",  full_name: "Tran Minh Tu", display_name_en: "Minh Tu Tran",
    current_company: "ホーチミン Renewable Inc.", current_role: "Country Manager (Vietnam)",
    past_companies: ["Singapore CleanTech", "VinGroup"], industry: "energy",
    skills: ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "現地法人立ち上げ"],
    years_of_experience: 10, location: "Ho Chi Minh, Vietnam", country_code: "VN",
    signal: "passive",
    bio: "ベトナム再エネ市場で代理店ネットワーク構築実績。現地拠点立ち上げ 2 回経験。" },
  { id: "x6",  full_name: "Cheong Wei Ming", display_name_en: "Wei Ming Cheong",
    current_company: "Singapore Carbon Markets", current_role: "Director, ASEAN",
    past_companies: ["Bain Singapore", "Goldman Sachs"], industry: "finance",
    skills: ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "金融", "カーボンクレジット計算"],
    years_of_experience: 12, location: "Singapore", country_code: "SG",
    signal: "passive",
    bio: "シンガポールでカーボンクレジット取引市場の立ち上げ。ASEAN ネットワーク広い。" },

  // ── 気候政策スペシャリスト
  { id: "x7",  full_name: "Sarah Williams", display_name_en: "Sarah Williams",
    current_company: "London ICVCM Council", current_role: "Senior Policy Advisor",
    past_companies: ["UN Climate Change", "Oxford 大学"], industry: "ngo",
    skills: ["気候政策", "国際枠組（パリ協定/JCM）", "規制翻訳", "英語"],
    years_of_experience: 11, location: "London, UK", country_code: "GB",
    signal: "passive",
    bio: "ICVCM の認証フレームワーク策定に携わる。日本市場の制度設計にも知見。" },
  { id: "x8",  full_name: "高橋 玲奈", display_name_en: "Reina Takahashi",
    current_company: "環境省（出向）", current_role: "気候変動対策室",
    past_companies: ["世界銀行", "外務省"], industry: "ngo",
    skills: ["気候政策", "国際枠組（パリ協定/JCM）", "規制翻訳"],
    years_of_experience: 7, location: "Tokyo, Japan", country_code: "JP",
    signal: "open_to_work",
    bio: "JCM の制度設計サイドの政策担当。民間に転身希望。英語ビジネスレベル。" },

  // ── プロダクト
  { id: "x9",  full_name: "野村 健太", display_name_en: "Kenta Nomura",
    current_company: "東京 B2B SaaS", current_role: "Senior Product Manager",
    past_companies: ["Smartsheet", "Slack Japan"], industry: "tech_startup",
    skills: ["プロダクトマネジメント", "B2B SaaS", "データ分析", "UX"],
    years_of_experience: 8, location: "Tokyo, Japan", country_code: "JP",
    linkedin_url: "https://linkedin.com/in/kenta-nomura-pm",
    signal: "passive",
    bio: "Slack Japan で大規模 B2B SaaS の PdM。社会的インパクトある領域に興味。" },
  { id: "x10", full_name: "Park Jisoo", display_name_en: "Jisoo Park",
    current_company: "ソウル ESG Tech", current_role: "Head of Product",
    past_companies: ["Naver", "Coupang"], industry: "tech_bigco",
    skills: ["プロダクトマネジメント", "B2B SaaS", "UX", "データ分析"],
    years_of_experience: 9, location: "Seoul, South Korea", country_code: "KR",
    signal: "open_to_work",
    bio: "Coupang で物流 SaaS の PdM。気候 × アジア市場に専念したい。" },

  // ── 経理 / IPO
  { id: "x11", full_name: "佐々木 拓也", display_name_en: "Takuya Sasaki",
    current_company: "上場準備中の SaaS", current_role: "経理マネージャー",
    past_companies: ["有限責任 あずさ監査法人", "メルカリ"], industry: "finance",
    skills: ["連結決算", "IPO 準備", "監査対応", "freee 経験", "月次決算"],
    years_of_experience: 10, location: "Tokyo, Japan", country_code: "JP",
    signal: "passive",
    bio: "あずさ → メルカリ IPO 準備に従事。次は気候テックで IPO 経験を活かしたい。" },

  // ── デザイン / UX
  { id: "x12", full_name: "中村 美咲", display_name_en: "Misaki Nakamura",
    current_company: "東京 デザインエージェンシー", current_role: "Design Lead",
    past_companies: ["IDEO Tokyo", "Goodpatch"], industry: "agency",
    skills: ["Figma", "UXリサーチ", "Webデザイン", "ブランドデザイン", "プロトタイピング"],
    years_of_experience: 9, location: "Tokyo, Japan", country_code: "JP",
    linkedin_url: "https://linkedin.com/in/misaki-nakamura",
    signal: "passive",
    bio: "IDEO で B2B プロダクトのデザイン経験。気候テックの世界観を作る仕事に興味。" },

  // ── エンジニア（汎用）
  { id: "x13", full_name: "Wei Chen", display_name_en: "Wei Chen",
    current_company: "Singapore CleanTech", current_role: "Senior Engineer",
    past_companies: ["Stripe", "Grab"], industry: "tech_bigco",
    skills: ["TypeScript", "Node.js", "AWS", "PostgreSQL", "システム設計"],
    years_of_experience: 7, location: "Singapore", country_code: "SG",
    signal: "open_to_work",
    bio: "Stripe で決済バックエンド。アジア在住の英語ネイティブ環境で働きたい。" },
  { id: "x14", full_name: "Nguyen Anh Tuan", display_name_en: "Anh Tuan Nguyen",
    current_company: "ハノイ Software House", current_role: "Tech Lead",
    past_companies: ["VinAI", "FPT Software"], industry: "tech_startup",
    skills: ["TypeScript", "Rust", "PostgreSQL", "AWS"],
    years_of_experience: 8, location: "Hanoi, Vietnam", country_code: "VN",
    signal: "passive",
    bio: "VinAI でスケーラブルなインフラを担当。日本企業との協業経験 3 年。" },

  // ── マーケ / コンテンツ
  { id: "x15", full_name: "石川 怜", display_name_en: "Rei Ishikawa",
    current_company: "ESG メディア", current_role: "編集長",
    past_companies: ["朝日新聞", "Forbes Japan"], industry: "agency",
    skills: ["コンテンツマーケ", "SEO", "ESG/気候変動の知識", "ライティング"],
    years_of_experience: 12, location: "Tokyo, Japan", country_code: "JP",
    signal: "passive",
    bio: "ESG 領域の取材・編集 5 年。経済紙出身で経営層への発信に強み。" },
];

export function profileById(id: string): ExternalProfile | undefined {
  return DEMO_EXTERNAL_POOL.find((p) => p.id === id);
}
