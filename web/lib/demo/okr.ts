/**
 * MBO × OKR デモデータ。
 * 3 階層: company → department → individual。各 Objective に複数の Key Result。
 * 前期分の MBO 評価 (S/A/B/C/D) も保持。
 */

export type OkrLevel = "company" | "department" | "individual";
export type OkrStatus = "draft" | "active" | "at_risk" | "behind" | "achieved" | "missed";
export type MboGrade = "S" | "A" | "B" | "C" | "D";

export const STATUS_LABEL: Record<OkrStatus, string> = {
  draft: "下書き",
  active: "順調",
  at_risk: "要注意",
  behind: "遅延",
  achieved: "達成",
  missed: "未達",
};

export const STATUS_TONE: Record<OkrStatus, string> = {
  draft: "border-gray-200 bg-gray-50 text-gray-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  at_risk: "border-amber-200 bg-amber-50 text-amber-800",
  behind: "border-red-200 bg-red-50 text-red-800",
  achieved: "border-purple-200 bg-purple-50 text-purple-800",
  missed: "border-gray-300 bg-gray-100 text-gray-700",
};

export const MBO_GRADE_TONE: Record<MboGrade, string> = {
  S: "border-purple-300 bg-purple-50 text-purple-900",
  A: "border-emerald-300 bg-emerald-50 text-emerald-900",
  B: "border-blue-300 bg-blue-50 text-blue-900",
  C: "border-amber-300 bg-amber-50 text-amber-900",
  D: "border-red-300 bg-red-50 text-red-900",
};

export type ReviewCycle = {
  id: string;
  name: string;       // "2026 Q2"
  starts_on: string;
  ends_on: string;
  is_active: boolean;
};

export type KeyResult = {
  id: string;
  title: string;
  unit: string;            // "%", "件", "百万円", etc.
  target: number;
  baseline: number;
  current: number;
  progress: number;        // 0-100
  confidence: 1 | 2 | 3 | 4 | 5;
  last_updated_at: string;
};

export type Objective = {
  id: string;
  cycle_id: string;
  level: OkrLevel;
  parent_id: string | null;
  owner_id: string;
  title: string;
  description?: string;
  weight?: number;          // % 重み
  key_results: KeyResult[];
  progress: number;        // 平均
  status: OkrStatus;
  // 部署レベル用
  department_id?: string;
  // 個人レベル用
  visible_to: "company" | "department" | "private";
};

export type MboReview = {
  id: string;
  cycle_id: string;
  employee_id: string;
  reviewer_id: string;
  self_rating: MboGrade | null;
  manager_rating: MboGrade | null;
  final_rating: MboGrade | null;
  self_comment: string;
  manager_comment: string;
  calibrated_at: string | null;
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

// ─── Cycles ─────────────────────────────
export const DEMO_CYCLES: ReviewCycle[] = [
  { id: "cy-q2-26", name: "2026 Q2", starts_on: day(-30), ends_on: day(60), is_active: true },
  { id: "cy-q1-26", name: "2026 Q1", starts_on: day(-120), ends_on: day(-31), is_active: false },
  { id: "cy-q4-25", name: "2025 Q4", starts_on: day(-210), ends_on: day(-121), is_active: false },
];

// ─── 会社 OKR (5本) ────────────────────
const buildCompanyOkrs = (): Objective[] => [
  {
    id: "obj-co-1", cycle_id: "cy-q2-26", level: "company", parent_id: null, owner_id: "e1",
    title: "ASEAN 市場におけるカーボンクレジット創出量で No.1 を獲得",
    description: "気候変動対策のグローバルリーダーとして ASEAN 6カ国で確固たる地位を確立する。",
    key_results: [
      { id: "kr-co-1-1", title: "クレジット創出 累計", unit: "万t-CO2", target: 250, baseline: 130, current: 178, progress: 40, confidence: 4, last_updated_at: day(-3) },
      { id: "kr-co-1-2", title: "新規パートナーシップ締結", unit: "件", target: 12, baseline: 0, current: 7, progress: 58, confidence: 4, last_updated_at: day(-2) },
      { id: "kr-co-1-3", title: "現地拠点メンバー (海外)", unit: "名", target: 100, baseline: 78, current: 92, progress: 64, confidence: 5, last_updated_at: day(-5) },
    ],
    progress: 54, status: "active", visible_to: "company",
  },
  {
    id: "obj-co-2", cycle_id: "cy-q2-26", level: "company", parent_id: null, owner_id: "e1",
    title: "売上高 50 億円・営業利益率 18% を達成",
    description: "事業の本格的なスケール段階へ。",
    key_results: [
      { id: "kr-co-2-1", title: "売上高 (Q2 累計)", unit: "億円", target: 50, baseline: 32, current: 38, progress: 33, confidence: 3, last_updated_at: day(-1) },
      { id: "kr-co-2-2", title: "営業利益率", unit: "%", target: 18, baseline: 12, current: 14, progress: 33, confidence: 3, last_updated_at: day(-1) },
      { id: "kr-co-2-3", title: "MRR 解約率", unit: "%", target: 2.5, baseline: 4.0, current: 3.2, progress: 53, confidence: 4, last_updated_at: day(-3) },
    ],
    progress: 40, status: "at_risk", visible_to: "company",
  },
  {
    id: "obj-co-3", cycle_id: "cy-q2-26", level: "company", parent_id: null, owner_id: "e4",
    title: "プロダクト改善で NPS 50 超を達成",
    description: "ユーザー体験を抜本的に向上させ、Net Promoter Score を業界トップクラスに。",
    key_results: [
      { id: "kr-co-3-1", title: "NPS スコア", unit: "pt", target: 50, baseline: 32, current: 41, progress: 50, confidence: 4, last_updated_at: day(-7) },
      { id: "kr-co-3-2", title: "重要バグ未修正", unit: "件", target: 0, baseline: 23, current: 8, progress: 65, confidence: 4, last_updated_at: day(-2) },
      { id: "kr-co-3-3", title: "新機能リリース", unit: "件", target: 6, baseline: 0, current: 3, progress: 50, confidence: 4, last_updated_at: day(-4) },
    ],
    progress: 55, status: "active", visible_to: "company",
  },
  {
    id: "obj-co-4", cycle_id: "cy-q2-26", level: "company", parent_id: null, owner_id: "e2",
    title: "300名 → 350名へのスケーラブルな組織拡張",
    description: "急成長に耐えうるカルチャー・制度・組織設計を整備する。",
    key_results: [
      { id: "kr-co-4-1", title: "新規入社者数", unit: "名", target: 50, baseline: 0, current: 18, progress: 36, confidence: 4, last_updated_at: day(-2) },
      { id: "kr-co-4-2", title: "離職率 (年率換算)", unit: "%", target: 8, baseline: 12, current: 9.5, progress: 63, confidence: 4, last_updated_at: day(-5) },
      { id: "kr-co-4-3", title: "エンゲージメントスコア", unit: "pt", target: 75, baseline: 62, current: 68, progress: 46, confidence: 3, last_updated_at: day(-10) },
    ],
    progress: 48, status: "active", visible_to: "company",
  },
  {
    id: "obj-co-5", cycle_id: "cy-q2-26", level: "company", parent_id: null, owner_id: "e26",
    title: "IPO 準備の主要マイルストーンを達成",
    description: "監査法人選定 → J-SOX 整備 → 主幹事との協議を進める。",
    key_results: [
      { id: "kr-co-5-1", title: "J-SOX 整備項目", unit: "%", target: 100, baseline: 30, current: 55, progress: 36, confidence: 3, last_updated_at: day(-8) },
      { id: "kr-co-5-2", title: "ガバナンス委員会 設置", unit: "件", target: 3, baseline: 1, current: 2, progress: 50, confidence: 4, last_updated_at: day(-15) },
    ],
    progress: 43, status: "behind", visible_to: "company",
  },
];

// ─── 部署 OKR (12本) ────────────────────
const buildDepartmentOkrs = (): Objective[] => [
  // 技術
  {
    id: "obj-dep-eng-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-3", owner_id: "e8",
    department_id: "d-eng",
    title: "プロダクト品質を抜本改善し、重要バグをゼロに",
    description: "技術的負債解消とテストカバレッジ向上に集中投下。",
    key_results: [
      { id: "kr-dep-eng-1-1", title: "テストカバレッジ", unit: "%", target: 85, baseline: 62, current: 76, progress: 61, confidence: 4, last_updated_at: day(-2) },
      { id: "kr-dep-eng-1-2", title: "P0/P1 バグ", unit: "件", target: 0, baseline: 23, current: 8, progress: 65, confidence: 5, last_updated_at: day(-1) },
      { id: "kr-dep-eng-1-3", title: "p95 API レスポンス", unit: "ms", target: 200, baseline: 450, current: 280, progress: 68, confidence: 4, last_updated_at: day(-3) },
    ],
    progress: 65, status: "active", visible_to: "company",
  },
  {
    id: "obj-dep-eng-2", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-1", owner_id: "e8",
    department_id: "d-eng",
    title: "ASEAN 向け Carbon Platform v2 をリリース",
    description: "現地通貨対応・多言語化・規制対応を完了。",
    key_results: [
      { id: "kr-dep-eng-2-1", title: "対応言語", unit: "言語", target: 6, baseline: 2, current: 4, progress: 50, confidence: 4, last_updated_at: day(-5) },
      { id: "kr-dep-eng-2-2", title: "ASEAN 規制対応 国数", unit: "カ国", target: 5, baseline: 1, current: 3, progress: 50, confidence: 3, last_updated_at: day(-7) },
    ],
    progress: 50, status: "at_risk", visible_to: "company",
  },
  // プロダクト
  {
    id: "obj-dep-prd-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-3", owner_id: "e4",
    department_id: "d-product",
    title: "NPS 50 超に向けたプロダクト改善を主導",
    description: "ユーザーリサーチ起点の改善を継続的に。",
    key_results: [
      { id: "kr-dep-prd-1-1", title: "ユーザーインタビュー", unit: "件", target: 30, baseline: 0, current: 18, progress: 60, confidence: 5, last_updated_at: day(-2) },
      { id: "kr-dep-prd-1-2", title: "Discovery → Delivery 数", unit: "件", target: 12, baseline: 0, current: 7, progress: 58, confidence: 4, last_updated_at: day(-4) },
    ],
    progress: 59, status: "active", visible_to: "company",
  },
  // デザイン
  {
    id: "obj-dep-dsn-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-3", owner_id: "e14",
    department_id: "d-design",
    title: "デザインシステム v2 を全プロダクトに展開",
    description: "コンポーネントライブラリ統一・アクセシビリティ AA 対応。",
    key_results: [
      { id: "kr-dep-dsn-1-1", title: "DS 適用率", unit: "%", target: 100, baseline: 30, current: 75, progress: 64, confidence: 5, last_updated_at: day(-3) },
      { id: "kr-dep-dsn-1-2", title: "WCAG 2.1 AA 達成画面", unit: "%", target: 100, baseline: 40, current: 72, progress: 53, confidence: 4, last_updated_at: day(-5) },
    ],
    progress: 59, status: "active", visible_to: "company",
  },
  // 事業開発
  {
    id: "obj-dep-bd-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-1", owner_id: "e3",
    department_id: "d-bizdev",
    title: "ASEAN パートナーシップを 8 件締結",
    description: "Indonesia/Vietnam/Philippines を最重点。",
    key_results: [
      { id: "kr-dep-bd-1-1", title: "MOU 締結", unit: "件", target: 8, baseline: 0, current: 5, progress: 63, confidence: 4, last_updated_at: day(-1) },
      { id: "kr-dep-bd-1-2", title: "現地リード生成", unit: "件", target: 50, baseline: 0, current: 32, progress: 64, confidence: 4, last_updated_at: day(-2) },
    ],
    progress: 64, status: "active", visible_to: "company",
  },
  // グローバル
  {
    id: "obj-dep-gbl-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-1", owner_id: "e19",
    department_id: "d-global",
    title: "現地メンバーを 20 名追加採用",
    description: "Singapore/Jakarta/Manila ハブ拠点を強化。",
    key_results: [
      { id: "kr-dep-gbl-1-1", title: "現地採用", unit: "名", target: 20, baseline: 0, current: 9, progress: 45, confidence: 3, last_updated_at: day(-4) },
      { id: "kr-dep-gbl-1-2", title: "ローカルパートナー連携", unit: "件", target: 15, baseline: 5, current: 11, progress: 60, confidence: 4, last_updated_at: day(-6) },
    ],
    progress: 53, status: "active", visible_to: "company",
  },
  // マーケティング
  {
    id: "obj-dep-mkt-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-2", owner_id: "e23",
    department_id: "d-mkt",
    title: "リードジェネを 2.5 倍に拡大",
    description: "コンテンツ・SEO・パートナーマーケに集中投下。",
    key_results: [
      { id: "kr-dep-mkt-1-1", title: "MQL 月平均", unit: "件", target: 250, baseline: 100, current: 165, progress: 43, confidence: 3, last_updated_at: day(-3) },
      { id: "kr-dep-mkt-1-2", title: "オーガニック流入", unit: "%増", target: 80, baseline: 0, current: 42, progress: 53, confidence: 4, last_updated_at: day(-5) },
    ],
    progress: 48, status: "at_risk", visible_to: "company",
  },
  // 人事
  {
    id: "obj-dep-hr-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-4", owner_id: "e2",
    department_id: "d-hr",
    title: "採用パイプラインの強化と離職率改善",
    description: "リファラル比率上げ + オンボーディング深化。",
    key_results: [
      { id: "kr-dep-hr-1-1", title: "リファラル経由採用率", unit: "%", target: 35, baseline: 18, current: 24, progress: 35, confidence: 4, last_updated_at: day(-2) },
      { id: "kr-dep-hr-1-2", title: "30日離職率", unit: "%", target: 0, baseline: 5, current: 3, progress: 40, confidence: 4, last_updated_at: day(-7) },
      { id: "kr-dep-hr-1-3", title: "1on1 完了率", unit: "%", target: 95, baseline: 75, current: 88, progress: 65, confidence: 5, last_updated_at: day(-1) },
    ],
    progress: 47, status: "active", visible_to: "company",
  },
  // 経理
  {
    id: "obj-dep-fin-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-5", owner_id: "e26",
    department_id: "d-fin",
    title: "J-SOX 内部統制を整備し IPO 準備を加速",
    description: "監査法人選定・統制文書整備・運用テスト。",
    key_results: [
      { id: "kr-dep-fin-1-1", title: "統制文書整備", unit: "%", target: 100, baseline: 30, current: 55, progress: 36, confidence: 3, last_updated_at: day(-7) },
      { id: "kr-dep-fin-1-2", title: "運用テスト 完了プロセス", unit: "件", target: 12, baseline: 2, current: 5, progress: 30, confidence: 3, last_updated_at: day(-10) },
    ],
    progress: 33, status: "behind", visible_to: "department",
  },
  // 経営企画
  {
    id: "obj-dep-corp-1", cycle_id: "cy-q2-26", level: "department", parent_id: "obj-co-2", owner_id: "e1",
    department_id: "d-corp",
    title: "事業ポートフォリオの最適化",
    description: "高採算事業へのリソース集中、低採算事業の撤退判断。",
    key_results: [
      { id: "kr-dep-corp-1-1", title: "事業別 P&L 可視化", unit: "%", target: 100, baseline: 50, current: 90, progress: 80, confidence: 5, last_updated_at: day(-2) },
      { id: "kr-dep-corp-1-2", title: "リソース再配分 完了", unit: "件", target: 5, baseline: 0, current: 3, progress: 60, confidence: 4, last_updated_at: day(-5) },
    ],
    progress: 70, status: "active", visible_to: "company",
  },
];

// ─── 個人 OKR (代表 6 名分) ────────────────────
const buildIndividualOkrs = (): Objective[] => [
  // CEO 野村 — Company OKR と同期、KR が Q2 における自分の重点
  {
    id: "obj-ind-e1-1", cycle_id: "cy-q2-26", level: "individual", parent_id: "obj-co-1", owner_id: "e1",
    title: "ASEAN 市場リーダーシップの確立",
    description: "現地パートナーシップ獲得を最優先。",
    key_results: [
      { id: "kr-ind-e1-1-1", title: "現地企業との直接面談", unit: "社", target: 30, baseline: 0, current: 18, progress: 60, confidence: 4, last_updated_at: day(-3) },
      { id: "kr-ind-e1-1-2", title: "Tier1 メディア掲載", unit: "件", target: 8, baseline: 0, current: 4, progress: 50, confidence: 4, last_updated_at: day(-5) },
    ],
    progress: 55, status: "active", visible_to: "department",
  },
  // CHRO 高橋 — 部署 HR OKR と連動
  {
    id: "obj-ind-e2-1", cycle_id: "cy-q2-26", level: "individual", parent_id: "obj-dep-hr-1", owner_id: "e2",
    title: "HR システム刷新とプロセス標準化",
    description: "Green Carbon HR Tools の全社展開と運用定着。",
    key_results: [
      { id: "kr-ind-e2-1-1", title: "全社展開フェーズ", unit: "%", target: 100, baseline: 0, current: 45, progress: 45, confidence: 4, last_updated_at: day(-1) },
      { id: "kr-ind-e2-1-2", title: "週次トレーニング実施", unit: "回", target: 12, baseline: 0, current: 6, progress: 50, confidence: 5, last_updated_at: day(-2) },
    ],
    progress: 47, status: "active", visible_to: "department",
  },
  // VP Eng 川崎
  {
    id: "obj-ind-e8-1", cycle_id: "cy-q2-26", level: "individual", parent_id: "obj-dep-eng-1", owner_id: "e8",
    title: "技術組織のスケール対応",
    description: "シニアエンジニア採用 + 技術文化の醸成。",
    key_results: [
      { id: "kr-ind-e8-1-1", title: "シニアエンジニア採用", unit: "名", target: 5, baseline: 0, current: 2, progress: 40, confidence: 3, last_updated_at: day(-2) },
      { id: "kr-ind-e8-1-2", title: "技術勉強会 開催", unit: "回", target: 12, baseline: 4, current: 7, progress: 38, confidence: 4, last_updated_at: day(-4) },
      { id: "kr-ind-e8-1-3", title: "技術ブログ記事公開", unit: "本", target: 24, baseline: 8, current: 14, progress: 38, confidence: 3, last_updated_at: day(-7) },
    ],
    progress: 39, status: "at_risk", visible_to: "department",
  },
  // テックリード 藤本
  {
    id: "obj-ind-e9-1", cycle_id: "cy-q2-26", level: "individual", parent_id: "obj-dep-eng-2", owner_id: "e9",
    title: "ASEAN プラットフォーム 主要モジュール開発",
    key_results: [
      { id: "kr-ind-e9-1-1", title: "主要モジュール 完了", unit: "件", target: 6, baseline: 0, current: 4, progress: 67, confidence: 4, last_updated_at: day(-1) },
      { id: "kr-ind-e9-1-2", title: "コードレビュー 24h以内対応", unit: "%", target: 95, baseline: 70, current: 88, progress: 72, confidence: 5, last_updated_at: day(-2) },
    ],
    progress: 70, status: "active", visible_to: "department",
  },
  // デザインリード 原田
  {
    id: "obj-ind-e14-1", cycle_id: "cy-q2-26", level: "individual", parent_id: "obj-dep-dsn-1", owner_id: "e14",
    title: "デザインシステム v2 を全社導入",
    key_results: [
      { id: "kr-ind-e14-1-1", title: "コンポーネント整備", unit: "件", target: 80, baseline: 30, current: 62, progress: 64, confidence: 5, last_updated_at: day(-1) },
      { id: "kr-ind-e14-1-2", title: "ドキュメント整備", unit: "%", target: 100, baseline: 20, current: 65, progress: 56, confidence: 4, last_updated_at: day(-3) },
    ],
    progress: 60, status: "active", visible_to: "department",
  },
  // マーケMgr 南部
  {
    id: "obj-ind-e23-1", cycle_id: "cy-q2-26", level: "individual", parent_id: "obj-dep-mkt-1", owner_id: "e23",
    title: "コンテンツ起点のリードジェネ強化",
    key_results: [
      { id: "kr-ind-e23-1-1", title: "コンテンツ公開数", unit: "本", target: 60, baseline: 0, current: 28, progress: 47, confidence: 3, last_updated_at: day(-2) },
      { id: "kr-ind-e23-1-2", title: "コンテンツ起因 MQL", unit: "件", target: 200, baseline: 50, current: 95, progress: 30, confidence: 3, last_updated_at: day(-4) },
    ],
    progress: 38, status: "behind", visible_to: "department",
  },
];

export const DEMO_OBJECTIVES: Objective[] = [
  ...buildCompanyOkrs(),
  ...buildDepartmentOkrs(),
  ...buildIndividualOkrs(),
];

// ─── MBO 評価（前期 Q1 分） ────────────
export const DEMO_MBO_REVIEWS: MboReview[] = [
  { id: "mbo-1", cycle_id: "cy-q1-26", employee_id: "e1",  reviewer_id: "e1",  self_rating: "A", manager_rating: "A", final_rating: "A", self_comment: "ASEAN 戦略の方向性を明確化できた。実行はこれから。", manager_comment: "リーダーシップを発揮。次期は実装フェーズ。", calibrated_at: day(-25) },
  { id: "mbo-2", cycle_id: "cy-q1-26", employee_id: "e2",  reviewer_id: "e1",  self_rating: "A", manager_rating: "S", final_rating: "S", self_comment: "HR システム刷新を主導。", manager_comment: "全社の HR 基盤を整備。組織スケールに大きく貢献。", calibrated_at: day(-25) },
  { id: "mbo-3", cycle_id: "cy-q1-26", employee_id: "e8",  reviewer_id: "e4",  self_rating: "B", manager_rating: "A", final_rating: "A", self_comment: "技術負債解消を進めた。採用は遅れ。", manager_comment: "品質改善は計画通り。採用は Q2 で取り戻す前提で。", calibrated_at: day(-25) },
  { id: "mbo-4", cycle_id: "cy-q1-26", employee_id: "e9",  reviewer_id: "e8",  self_rating: "A", manager_rating: "A", final_rating: "A", self_comment: "テックリードとして安定したアウトプット。", manager_comment: "次フェーズはリーダーシップ拡張に期待。", calibrated_at: day(-25) },
  { id: "mbo-5", cycle_id: "cy-q1-26", employee_id: "e14", reviewer_id: "e4",  self_rating: "A", manager_rating: "A", final_rating: "A", self_comment: "DS v2 の設計完了。", manager_comment: "次は実装定着まで。", calibrated_at: day(-25) },
  { id: "mbo-6", cycle_id: "cy-q1-26", employee_id: "e23", reviewer_id: "e1",  self_rating: "B", manager_rating: "B", final_rating: "B", self_comment: "リードジェネ目標未達。施策見直しが必要。", manager_comment: "Q2 はチャネル戦略の再設計から。", calibrated_at: day(-25) },
  { id: "mbo-7", cycle_id: "cy-q1-26", employee_id: "e10", reviewer_id: "e8",  self_rating: "A", manager_rating: "A", final_rating: "A", self_comment: "API リファクタを完遂。", manager_comment: "技術リードシップ良好。", calibrated_at: day(-25) },
  { id: "mbo-8", cycle_id: "cy-q1-26", employee_id: "e15", reviewer_id: "e14", self_rating: "B", manager_rating: "B", final_rating: "B", self_comment: "プロダクトデザインで貢献。", manager_comment: "より裁量の大きい仕事を任せたい。", calibrated_at: day(-25) },
];

// ─── ヘルパ ─────────────────────────
export function activeCycle(): ReviewCycle | undefined {
  return DEMO_CYCLES.find((c) => c.is_active);
}

export function objectivesByLevel(level: OkrLevel, cycleId?: string): Objective[] {
  return DEMO_OBJECTIVES.filter((o) =>
    o.level === level && (!cycleId || o.cycle_id === cycleId)
  );
}

export function childrenOf(parentId: string): Objective[] {
  return DEMO_OBJECTIVES.filter((o) => o.parent_id === parentId);
}

export function objectiveById(id: string): Objective | undefined {
  return DEMO_OBJECTIVES.find((o) => o.id === id);
}

export function objectivesForOwner(ownerId: string, cycleId?: string): Objective[] {
  return DEMO_OBJECTIVES.filter((o) =>
    o.owner_id === ownerId && (!cycleId || o.cycle_id === cycleId)
  );
}

export function reviewsForCycle(cycleId: string): MboReview[] {
  return DEMO_MBO_REVIEWS.filter((r) => r.cycle_id === cycleId);
}

export function reviewForEmployee(employeeId: string, cycleId: string): MboReview | undefined {
  return DEMO_MBO_REVIEWS.find((r) => r.employee_id === employeeId && r.cycle_id === cycleId);
}

export function avgProgressOf(objs: Objective[]): number {
  if (objs.length === 0) return 0;
  return Math.round(objs.reduce((s, o) => s + o.progress, 0) / objs.length);
}

export function statusFromProgress(progress: number): OkrStatus {
  if (progress >= 100) return "achieved";
  if (progress >= 70) return "active";
  if (progress >= 40) return "at_risk";
  return "behind";
}
