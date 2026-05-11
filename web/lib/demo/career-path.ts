/**
 * 社員のキャリアパス：過去ロール × 現在 × 将来オプション。
 */

export type RoleNode = {
  role: string;
  company?: string;
  start_year: number;
  end_year?: number; // 現職は undefined
  achievements?: string[];
};

export type CareerPath = {
  employee_id: string;
  /** 時系列 */
  history: RoleNode[];
  /** 現職（history の最後と同じ想定） */
  current: RoleNode;
  /** 将来オプション（パス候補） */
  future_options: {
    label: string;
    horizon: "1y" | "2y_3y" | "5y+";
    /** 進む確率 / 推奨度 0-1 */
    likelihood: number;
    description: string;
    required_skills: string[];
  }[];
};

export const DEMO_CAREER_PATHS: Record<string, CareerPath> = {
  // 川崎 健太（VPoE）
  e8: {
    employee_id: "e8",
    history: [
      { role: "ソフトウェアエンジニア", company: "Google Japan", start_year: 2014, end_year: 2018,
        achievements: ["広告 ML 基盤の改善", "Google Sheets API 開発"] },
      { role: "テックリード", company: "Tech Startup A", start_year: 2018, end_year: 2021,
        achievements: ["シリーズ B → C 期の技術組織立ち上げ"] },
      { role: "VPoE", company: "Green Carbon", start_year: 2021,
        achievements: ["20 名規模の技術組織立ち上げ", "Carbon 計算エンジン v2 をリリース"] },
    ],
    current: { role: "VPoE", company: "Green Carbon", start_year: 2021 },
    future_options: [
      { label: "CTO（社内昇格）", horizon: "1y", likelihood: 0.8,
        description: "事業側との連携を強化すれば即戦力。次世代 CTO 候補。",
        required_skills: ["事業計画", "経営戦略", "BD/Sales 理解"] },
      { label: "別社の CTO", horizon: "2y_3y", likelihood: 0.5,
        description: "Green Carbon での 5 年経験後、別気候テックの CTO へ",
        required_skills: ["プロダクトマネジメント", "資金調達"] },
      { label: "技術顧問・独立", horizon: "5y+", likelihood: 0.3,
        description: "技術顧問として複数社を支援する道",
        required_skills: ["メンタリング", "技術ブランディング"] },
    ],
  },

  // 藤本 渉（テックリード）
  e9: {
    employee_id: "e9",
    history: [
      { role: "エンジニア", company: "Tech Startup B", start_year: 2018, end_year: 2022,
        achievements: ["決済バックエンド構築"] },
      { role: "テックリード", company: "Green Carbon", start_year: 2022,
        achievements: ["カーボン計算エンジンを 0→1 で構築", "Rust 勉強会主催"] },
    ],
    current: { role: "テックリード", company: "Green Carbon", start_year: 2022 },
    future_options: [
      { label: "シニアテックリード（IC track）", horizon: "1y", likelihood: 0.85,
        description: "技術深耕の道。IC のままレビュー範囲を広げる",
        required_skills: ["システム設計", "技術文書", "メンタリング"] },
      { label: "Engineering Manager", horizon: "2y_3y", likelihood: 0.4,
        description: "マネジメント志向は弱いが選択肢として",
        required_skills: ["1on1 設計", "チームビルディング", "業績評価"] },
      { label: "Principal Engineer", horizon: "5y+", likelihood: 0.7,
        description: "技術の最高位として組織横断で意思決定",
        required_skills: ["アーキテクチャ", "技術発信", "事業理解"] },
    ],
  },

  // 高橋 真由（CHRO）
  e2: {
    employee_id: "e2",
    history: [
      { role: "コンサルタント", company: "戦略コンサル", start_year: 2010, end_year: 2015,
        achievements: ["大企業向け組織変革プロジェクト 5 件"] },
      { role: "HRBP", company: "Tech Bigco", start_year: 2015, end_year: 2021,
        achievements: ["1000 名規模の組織を 6 年支援"] },
      { role: "CHRO", company: "Green Carbon", start_year: 2021,
        achievements: ["人事制度設計、グローバル組織展開"] },
    ],
    current: { role: "CHRO", company: "Green Carbon", start_year: 2021 },
    future_options: [
      { label: "現職継続（5+ 年）", horizon: "5y+", likelihood: 0.7,
        description: "Green Carbon の長期コミット",
        required_skills: ["IPO 経験", "海外労務"] },
      { label: "別社 CHRO / 上場企業 HRBP Lead", horizon: "2y_3y", likelihood: 0.3,
        description: "Green Carbon IPO 後にスケールアップ経験を活かす",
        required_skills: ["IPO 後の人事制度", "グローバル労務"] },
    ],
  },

  // 原田 梨沙（デザインリード）
  e14: {
    employee_id: "e14",
    history: [
      { role: "プロダクトデザイナー", company: "Goodpatch", start_year: 2016, end_year: 2020 },
      { role: "シニアデザイナー", company: "B2B SaaS", start_year: 2020, end_year: 2022 },
      { role: "デザインリード", company: "Green Carbon", start_year: 2022,
        achievements: ["ブランドリブランディング", "B2B プロダクトの UX 改善"] },
    ],
    current: { role: "デザインリード", company: "Green Carbon", start_year: 2022 },
    future_options: [
      { label: "VP of Design", horizon: "1y", likelihood: 0.7,
        description: "5 名のデザインチームを統括する役職へ",
        required_skills: ["デザイン組織運営", "1on1", "予算管理"] },
      { label: "デザイン顧問・独立", horizon: "5y+", likelihood: 0.4,
        description: "気候テック特化のデザイン顧問",
        required_skills: ["ブランディング", "業界知見"] },
    ],
  },

  // 鎌田 彩（HRBP マネージャー）
  e5: {
    employee_id: "e5",
    history: [
      { role: "コンサルタント", company: "PwC", start_year: 2015, end_year: 2020 },
      { role: "HRBP", company: "Green Carbon", start_year: 2022,
        achievements: ["1on1 制度・サーベイ運用設計"] },
    ],
    current: { role: "HRBP マネージャー", company: "Green Carbon", start_year: 2022 },
    future_options: [
      { label: "シニア HRBP", horizon: "1y", likelihood: 0.8,
        description: "全社 HR ストラテジーへの参画",
        required_skills: ["戦略人事", "経営支援"] },
      { label: "CHRO（次世代）", horizon: "5y+", likelihood: 0.4,
        description: "高橋 CHRO の後継候補",
        required_skills: ["IPO 経験", "経営会議参加"] },
    ],
  },
};

export const HORIZON_LABEL: Record<CareerPath["future_options"][number]["horizon"], string> = {
  "1y":    "1 年以内",
  "2y_3y": "2-3 年",
  "5y+":   "5 年以上先",
};
