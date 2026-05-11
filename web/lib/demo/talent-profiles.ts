/**
 * 社員のタレント・プロフィール（活躍人材分析の基礎データ）。
 *
 * 本番ではこのデータは：
 *   - スキル：自己申告 + マネージャー評価 + 1on1 抽出 + GitHub/Slack 解析
 *   - 特性：パーソナリティ診断（StrengthsFinder/MBTI 等）
 *   - 成果：MBO/OKR スコア、評価履歴、昇進実績
 * から集約される想定。デモでは固定値で定義する。
 */

export type CompetencyArea =
  | "technical"        // 技術・専門性
  | "execution"        // 実行力・推進力
  | "communication"    // 言語化・対人
  | "leadership"       // 牽引力・統率
  | "strategy"         // 構想力・抽象化
  | "domain"           // ドメイン知識（気候・カーボン）
  | "global";          // 海外・多文化適応

export type Trait =
  | "学習指向"     | "自走力"       | "対人感受性"
  | "数字に強い"   | "巻き込み力"   | "好奇心"
  | "主体性"       | "規律"         | "実行スピード"
  | "粘り強さ"     | "創造性"       | "受容性";

export type TalentProfile = {
  employee_id: string;
  /** 0-5 整数 */
  competencies: Record<CompetencyArea, number>;
  /** 上位 3〜5 個。順序は強い順。 */
  signature_traits: Trait[];
  /** 直近 4 期の MBO 評点（A=4, B=3, C=2 等の数値化平均）。0-5。 */
  performance_score: number;
  /** 9-box 上の位置。high_perf_high_pot が「活躍人材」 */
  nine_box?:
    | "low_perf_low_pot"   | "low_perf_med_pot"   | "low_perf_high_pot"
    | "med_perf_low_pot"   | "med_perf_med_pot"   | "med_perf_high_pot"
    | "high_perf_low_pot"  | "high_perf_med_pot"  | "high_perf_high_pot";
  /** 入社時の前職カテゴリ（背景マッチング用） */
  background_industry: "consulting" | "tech_startup" | "tech_bigco" | "research" | "ngo" | "energy" | "finance" | "agency" | "other";
  /** "活躍人材"フラグ。9-box の high_perf_* または明示マーク */
  is_high_performer: boolean;
  /** 主要スキル（採用候補者と突合する） */
  skills: string[];
  /** 1 行紹介（リコメンド表示用） */
  one_liner?: string;
};

const COMP = (
  technical: number, execution: number, communication: number,
  leadership: number, strategy: number, domain: number, global: number,
): Record<CompetencyArea, number> => ({ technical, execution, communication, leadership, strategy, domain, global });

export const DEMO_TALENT_PROFILES: TalentProfile[] = [
  // ── 経営・人事
  { employee_id: "e1", competencies: COMP(3, 5, 5, 5, 5, 5, 4), signature_traits: ["巻き込み力", "創造性", "実行スピード", "粘り強さ"],
    performance_score: 4.8, nine_box: "high_perf_high_pot",
    background_industry: "consulting", is_high_performer: true,
    skills: ["経営戦略", "事業開発", "資金調達", "組織設計"],
    one_liner: "0→1 と組織拡大の両方をリードできる起業家マインドの CEO" },
  { employee_id: "e2", competencies: COMP(2, 4, 5, 5, 4, 3, 3), signature_traits: ["対人感受性", "巻き込み力", "規律"],
    performance_score: 4.6, nine_box: "high_perf_high_pot",
    background_industry: "consulting", is_high_performer: true,
    skills: ["人事戦略", "組織開発", "労務", "経営支援"],
    one_liner: "戦略人事で会社のスケールを支えるピープルリーダー" },

  // ── 技術部門
  { employee_id: "e8", competencies: COMP(5, 5, 4, 5, 4, 3, 3), signature_traits: ["巻き込み力", "実行スピード", "粘り強さ"],
    performance_score: 4.7, nine_box: "high_perf_high_pot",
    background_industry: "tech_bigco", is_high_performer: true,
    skills: ["TypeScript", "Node.js", "AWS", "システム設計", "チームビルディング", "PostgreSQL"],
    one_liner: "20 名規模の技術組織を立ち上げた VPoE。技術と組織の両立が強み" },
  { employee_id: "e9", competencies: COMP(5, 5, 3, 4, 3, 4, 2), signature_traits: ["自走力", "実行スピード", "学習指向"],
    performance_score: 4.5, nine_box: "high_perf_med_pot",
    background_industry: "tech_startup", is_high_performer: true,
    skills: ["TypeScript", "PostgreSQL", "Rust", "システム設計", "カーボン計算"],
    one_liner: "カーボン計算エンジンを 0→1 で構築したテックリード" },
  { employee_id: "e10", competencies: COMP(5, 4, 4, 3, 3, 4, 2), signature_traits: ["学習指向", "粘り強さ", "数字に強い"],
    performance_score: 4.3, nine_box: "high_perf_med_pot",
    background_industry: "tech_bigco", is_high_performer: true,
    skills: ["TypeScript", "Next.js", "PostgreSQL", "AWS", "技術文書"],
    one_liner: "品質と開発速度を両立する玄人系シニアエンジニア" },
  { employee_id: "e11", competencies: COMP(5, 4, 3, 3, 3, 3, 5), signature_traits: ["学習指向", "好奇心", "受容性"],
    performance_score: 4.0, nine_box: "med_perf_high_pot",
    background_industry: "tech_startup", is_high_performer: false,
    skills: ["TypeScript", "Python", "AWS", "PostgreSQL"],
    one_liner: "ジャカルタ拠点のエンジニア。グローバルチーム連携の要" },
  { employee_id: "e12", competencies: COMP(4, 5, 3, 2, 2, 3, 4), signature_traits: ["実行スピード", "自走力"],
    performance_score: 4.1, nine_box: "high_perf_low_pot",
    background_industry: "tech_startup", is_high_performer: true,
    skills: ["TypeScript", "React", "Node.js"],
    one_liner: "ベトナム拠点。爆速で機能を出すスピード型" },
  { employee_id: "e13", competencies: COMP(3, 3, 3, 2, 2, 3, 2), signature_traits: ["学習指向", "受容性"],
    performance_score: 3.5, nine_box: "med_perf_med_pot",
    background_industry: "other", is_high_performer: false,
    skills: ["TypeScript", "JavaScript"],
    one_liner: "新卒 1 年目。伸びしろ大" },

  // ── デザイン
  { employee_id: "e14", competencies: COMP(4, 4, 5, 4, 5, 3, 3), signature_traits: ["創造性", "対人感受性", "巻き込み力"],
    performance_score: 4.6, nine_box: "high_perf_high_pot",
    background_industry: "agency", is_high_performer: true,
    skills: ["Figma", "UXリサーチ", "Webデザイン", "ブランドデザイン", "プロトタイピング"],
    one_liner: "デザインで会社全体のクオリティを引き上げるリード" },
  { employee_id: "e15", competencies: COMP(4, 4, 4, 2, 3, 2, 2), signature_traits: ["創造性", "粘り強さ", "学習指向"],
    performance_score: 4.0, nine_box: "high_perf_med_pot",
    background_industry: "agency", is_high_performer: true,
    skills: ["Figma", "UXリサーチ", "Webデザイン", "プロトタイピング"],
    one_liner: "プロダクトの細部に強いプロダクトデザイナー" },

  // ── 事業開発・マーケ・人事
  { employee_id: "e3", competencies: COMP(2, 5, 5, 5, 5, 4, 4), signature_traits: ["巻き込み力", "実行スピード", "創造性"],
    performance_score: 4.7, nine_box: "high_perf_high_pot",
    background_industry: "consulting", is_high_performer: true,
    skills: ["事業開発", "ASEAN市場知識", "BD/Sales", "事業計画", "英語ビジネスレベル"],
    one_liner: "ASEAN 事業を一人で開拓し 5 億円受注を作った COO" },
  { employee_id: "e4", competencies: COMP(4, 4, 5, 5, 5, 4, 3), signature_traits: ["創造性", "数字に強い", "巻き込み力"],
    performance_score: 4.5, nine_box: "high_perf_high_pot",
    background_industry: "tech_startup", is_high_performer: true,
    skills: ["プロダクトマネジメント", "事業計画", "UX", "データ分析"],
    one_liner: "プロダクト戦略と数字の両輪を回す CPO" },

  // ── 一般メンバー（活躍人材ではない）
  { employee_id: "e5", competencies: COMP(2, 4, 4, 4, 3, 3, 3), signature_traits: ["対人感受性", "規律"],
    performance_score: 3.8, nine_box: "med_perf_med_pot", background_industry: "consulting", is_high_performer: false,
    skills: ["人事業務", "労務", "1on1 設計"] },
  { employee_id: "e6", competencies: COMP(2, 4, 4, 2, 2, 2, 2), signature_traits: ["主体性", "学習指向"],
    performance_score: 3.6, nine_box: "med_perf_med_pot", background_industry: "agency", is_high_performer: false,
    skills: ["リクルーティング", "母集団形成"] },
  { employee_id: "e7", competencies: COMP(3, 4, 3, 2, 2, 2, 4), signature_traits: ["学習指向", "受容性"],
    performance_score: 3.7, nine_box: "med_perf_med_pot", background_industry: "other", is_high_performer: false,
    skills: ["L&D", "研修設計", "韓国市場"] },
];

export function getTalent(employeeId: string): TalentProfile | undefined {
  return DEMO_TALENT_PROFILES.find((p) => p.employee_id === employeeId);
}

export function highPerformers(): TalentProfile[] {
  return DEMO_TALENT_PROFILES.filter((p) => p.is_high_performer);
}

// ── 部門別キャパシティ／戦略ギャップ（戦略採用リコメンド用） ─────────

export type StrategicGap = {
  area: string;
  severity: "high" | "med" | "low";
  rationale: string;
  recommended_role: string;
  required_skills: string[];
  needed_count: number;
  /** 解消すべき期限（YYYY-MM-DD） */
  target_by: string;
};

/**
 * 経営計画から逆算した「未来の組織で必要な人材」のデモデータ。
 * 本番では事業計画 × 現組織のスキル分布から自動算出する想定。
 */
export const DEMO_STRATEGIC_GAPS: StrategicGap[] = [
  {
    area: "AI/ML エンジニアリング",
    severity: "high",
    rationale:
      "Carbon 計算アルゴリズムの精度向上に AI/ML 人材が必須。現状は ML 実装経験者がゼロで、外注で対応中（コスト・スピード両面で限界）。",
    recommended_role: "ML エンジニア（シニア）",
    required_skills: ["Python", "PyTorch/TensorFlow", "MLOps", "時系列データ", "PostgreSQL"],
    needed_count: 2,
    target_by: "2026-09-30",
  },
  {
    area: "ASEAN 営業強化",
    severity: "high",
    rationale:
      "インドネシア・ベトナム拠点の営業面積が手薄。COO 1 人に依存しており、属人化リスクと拡大ペースが頭打ち。",
    recommended_role: "リージョナル事業開発（ASEAN）",
    required_skills: ["BD/Sales", "ASEAN市場知識", "英語ビジネスレベル", "プロジェクトマネジメント"],
    needed_count: 2,
    target_by: "2026-12-31",
  },
  {
    area: "規制対応・気候政策",
    severity: "med",
    rationale:
      "ICVCM・JCM・米国 IRA 等の制度変更に対応するスペシャリストが不在。誤った制度理解は事業リスク。",
    recommended_role: "気候政策スペシャリスト",
    required_skills: ["気候政策", "国際枠組（パリ協定/JCM）", "規制翻訳", "英語"],
    needed_count: 1,
    target_by: "2026-08-31",
  },
  {
    area: "プロダクトマネジメント",
    severity: "med",
    rationale:
      "CPO 1 人で全プロダクト見ており、機能優先度の判断速度が組織サイズに対し追いついていない。",
    recommended_role: "プロダクトマネージャー（B2B SaaS 経験）",
    required_skills: ["プロダクトマネジメント", "B2B SaaS", "データ分析", "UX"],
    needed_count: 1,
    target_by: "2026-10-31",
  },
  {
    area: "経理・IPO 準備",
    severity: "low",
    rationale:
      "監査法人選定後 12 ヶ月で IPO 準備に入る場合、早期に経理体制の強化が必要（特に連結決算）。",
    recommended_role: "経理マネージャー（IPO 経験）",
    required_skills: ["連結決算", "IPO 準備", "監査対応", "freee 経験"],
    needed_count: 1,
    target_by: "2027-03-31",
  },
];
