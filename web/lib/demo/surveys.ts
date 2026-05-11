/**
 * パルスサーベイのデモデータ。
 * 月次の定点観測 + 年次のエンゲージメントサーベイの2系統を持つ。
 */

import { DEMO_DEPARTMENTS } from "./employees";

export type SurveyKind = "pulse" | "engagement" | "onboarding" | "exit";
export type QuestionKind = "scale_5" | "scale_10" | "single_choice" | "multi_choice" | "text" | "enps";
export type CampaignStatus = "draft" | "scheduled" | "active" | "closed" | "analyzed";

export const KIND_LABEL: Record<SurveyKind, string> = {
  pulse: "月次パルス",
  engagement: "年次エンゲージメント",
  onboarding: "オンボーディング",
  exit: "退職時",
};

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "下書き",
  scheduled: "配信予定",
  active: "回答受付中",
  closed: "回答終了",
  analyzed: "分析完了",
};

export const STATUS_TONE: Record<CampaignStatus, string> = {
  draft: "border-gray-200 bg-gray-50 text-gray-700",
  scheduled: "border-blue-200 bg-blue-50 text-blue-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  closed: "border-amber-200 bg-amber-50 text-amber-800",
  analyzed: "border-purple-200 bg-purple-50 text-purple-800",
};

export type Question = {
  id: string;
  text: string;
  kind: QuestionKind;
  dimension: string;          // "engagement" | "manager" | "career" | "compensation" | "work_life" | "psychological_safety"
  options?: string[];
  required: boolean;
};

export const DIMENSION_LABEL: Record<string, string> = {
  engagement: "エンゲージメント",
  manager: "マネージャー",
  career: "キャリア成長",
  compensation: "報酬・評価",
  work_life: "ワークライフ",
  psychological_safety: "心理的安全性",
  enablement: "業務遂行性",
  diversity: "ダイバーシティ",
};

export const DIMENSION_COLOR: Record<string, string> = {
  engagement: "from-gc-400 to-gc-600",
  manager: "from-blue-400 to-blue-600",
  career: "from-purple-400 to-purple-600",
  compensation: "from-amber-400 to-amber-600",
  work_life: "from-emerald-400 to-emerald-600",
  psychological_safety: "from-pink-400 to-pink-600",
  enablement: "from-cyan-400 to-cyan-600",
  diversity: "from-indigo-400 to-indigo-600",
};

export type Campaign = {
  id: string;
  kind: SurveyKind;
  title: string;
  description: string;
  status: CampaignStatus;
  is_anonymous: boolean;
  starts_at: string;
  ends_at: string;
  target_count: number;        // 配信対象数
  response_count: number;      // 回答数
  questions: Question[];
  // 集計結果（簡易）
  results?: {
    dimensions: Record<string, number>;        // dim → avg score (0-5 or 0-10)
    enps?: { promoter: number; passive: number; detractor: number; score: number };
    by_department: Record<string, number>;     // dept_id → avg engagement
    sentiment_keywords: string[];              // 自由記述から抽出（demo）
    top_actions: string[];                      // 推奨アクション
  };
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const PULSE_QUESTIONS: Question[] = [
  { id: "q1", text: "今週、自分の仕事に意欲を感じていますか？", kind: "scale_5", dimension: "engagement", required: true },
  { id: "q2", text: "今週、達成感を感じる出来事がありましたか？", kind: "scale_5", dimension: "engagement", required: true },
  { id: "q3", text: "マネージャーとのコミュニケーションは十分ですか？", kind: "scale_5", dimension: "manager", required: true },
  { id: "q4", text: "業務に必要なリソース（情報・ツール）は揃っていますか？", kind: "scale_5", dimension: "enablement", required: true },
  { id: "q5", text: "今週、率直な意見を言える環境でしたか？", kind: "scale_5", dimension: "psychological_safety", required: true },
  { id: "q6", text: "ワークロードは適切ですか？", kind: "scale_5", dimension: "work_life", required: true },
  { id: "q7", text: "改善してほしいことがあれば教えてください（任意）", kind: "text", dimension: "engagement", required: false },
];

const ENGAGEMENT_QUESTIONS: Question[] = [
  { id: "eq1", text: "Green Carbon を友人や知人にお勧めする可能性は？（0-10）", kind: "enps", dimension: "engagement", required: true },
  { id: "eq2", text: "あなたの仕事は会社のミッション達成にどれほど貢献していますか？", kind: "scale_5", dimension: "engagement", required: true },
  { id: "eq3", text: "マネージャーは適切なフィードバックを提供してくれますか？", kind: "scale_5", dimension: "manager", required: true },
  { id: "eq4", text: "マネージャーはあなたのキャリアを支援してくれますか？", kind: "scale_5", dimension: "manager", required: true },
  { id: "eq5", text: "今後 1〜2 年でどのようなキャリア成長が見込めると感じますか？", kind: "scale_5", dimension: "career", required: true },
  { id: "eq6", text: "報酬は仕事の質に対して適正と感じますか？", kind: "scale_5", dimension: "compensation", required: true },
  { id: "eq7", text: "評価プロセスは公平・透明と感じますか？", kind: "scale_5", dimension: "compensation", required: true },
  { id: "eq8", text: "業務量と私生活のバランスは取れていますか？", kind: "scale_5", dimension: "work_life", required: true },
  { id: "eq9", text: "意見・反対意見を率直に言えますか？", kind: "scale_5", dimension: "psychological_safety", required: true },
  { id: "eq10", text: "多様な背景のメンバーが活躍できる環境ですか？", kind: "scale_5", dimension: "diversity", required: true },
  { id: "eq11", text: "業務に必要な情報・ツールは揃っていますか？", kind: "scale_5", dimension: "enablement", required: true },
  { id: "eq12", text: "改善提案があればお書きください（任意・匿名）", kind: "text", dimension: "engagement", required: false },
];

// 部署IDからスコアの軽いゆらぎを作る
const deptScores = (base: Record<string, number>): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const d of DEMO_DEPARTMENTS) {
    const seed = d.id.charCodeAt(d.id.length - 1) % 7;
    const variance = (seed - 3) * 0.08;
    out[d.id] = Math.max(2.5, Math.min(5, (base[d.id] ?? 3.7) + variance));
  }
  return out;
};

export const DEMO_CAMPAIGNS: Campaign[] = [
  // 進行中（直近）
  {
    id: "cmp-1",
    kind: "pulse",
    title: "5月 月次パルス",
    description: "直近1ヶ月の状況をお聞かせください。所要 2 分。匿名で集計します。",
    status: "active",
    is_anonymous: true,
    starts_at: day(-3), ends_at: day(4),
    target_count: 297, response_count: 184,
    questions: PULSE_QUESTIONS,
    results: {
      dimensions: {
        engagement: 3.9,
        manager: 4.1,
        enablement: 3.7,
        psychological_safety: 4.0,
        work_life: 3.5,
      },
      by_department: deptScores({
        "d-corp": 4.2, "d-bizdev": 3.8, "d-product": 3.6, "d-eng": 4.0,
        "d-design": 4.1, "d-mkt": 3.4, "d-hr": 4.3, "d-fin": 3.9, "d-global": 4.1,
      }),
      sentiment_keywords: ["業務量が多い", "新サービス開発", "海外との時差", "学習機会の充実"],
      top_actions: [
        "マーケティング部のワークロード負荷を再点検",
        "海外チームとの非同期コミュニケーション強化",
      ],
    },
  },
  // 完了済（4月パルス・分析済）
  {
    id: "cmp-2",
    kind: "pulse",
    title: "4月 月次パルス",
    description: "前月の振り返り",
    status: "analyzed",
    is_anonymous: true,
    starts_at: day(-34), ends_at: day(-27),
    target_count: 290, response_count: 246,
    questions: PULSE_QUESTIONS,
    results: {
      dimensions: {
        engagement: 3.7,
        manager: 4.0,
        enablement: 3.5,
        psychological_safety: 3.9,
        work_life: 3.3,
      },
      by_department: deptScores({
        "d-corp": 4.0, "d-bizdev": 3.7, "d-product": 3.5, "d-eng": 3.9,
        "d-design": 4.0, "d-mkt": 3.2, "d-hr": 4.2, "d-fin": 3.8, "d-global": 4.0,
      }),
      sentiment_keywords: ["業務量過多", "Q1 評価の不透明感", "リモート時のコミュニケーション"],
      top_actions: [
        "Q1 評価フィードバックの透明化",
        "マーケ部のリソース増強",
      ],
    },
  },
  // 完了済（年次エンゲージメント・分析済）
  {
    id: "cmp-3",
    kind: "engagement",
    title: "2026 年次エンゲージメントサーベイ",
    description: "年に1度の包括的なエンゲージメント調査。所要 8 分。",
    status: "analyzed",
    is_anonymous: true,
    starts_at: day(-95), ends_at: day(-80),
    target_count: 280, response_count: 263,
    questions: ENGAGEMENT_QUESTIONS,
    results: {
      dimensions: {
        engagement: 3.8,
        manager: 4.0,
        career: 3.5,
        compensation: 3.4,
        work_life: 3.6,
        psychological_safety: 4.0,
        diversity: 4.2,
        enablement: 3.7,
      },
      enps: { promoter: 95, passive: 120, detractor: 48, score: 18 },
      by_department: deptScores({
        "d-corp": 4.0, "d-bizdev": 3.7, "d-product": 3.6, "d-eng": 3.9,
        "d-design": 4.1, "d-mkt": 3.5, "d-hr": 4.2, "d-fin": 3.8, "d-global": 4.0,
      }),
      sentiment_keywords: ["キャリアパス不透明", "報酬制度の透明化希望", "リモートワーク最適化", "多様性は評価", "心理的安全性高い"],
      top_actions: [
        "キャリアラダーの公開とキャリア面談の強化",
        "報酬テーブル・昇給ロジックの社内開示",
        "マネージャー育成プログラムの開始",
      ],
    },
  },
  // 配信予定（次月パルス）
  {
    id: "cmp-4",
    kind: "pulse",
    title: "6月 月次パルス",
    description: "毎月第1月曜配信。",
    status: "scheduled",
    is_anonymous: true,
    starts_at: day(28), ends_at: day(35),
    target_count: 300, response_count: 0,
    questions: PULSE_QUESTIONS,
  },
  // ドラフト（特別パルス）
  {
    id: "cmp-5",
    kind: "pulse",
    title: "リモートワーク制度改定 評価サーベイ",
    description: "5月のリモートワーク制度改定後のフィードバックを募集。",
    status: "draft",
    is_anonymous: false,
    starts_at: day(14), ends_at: day(28),
    target_count: 300, response_count: 0,
    questions: [
      { id: "rq1", text: "新制度に満足していますか？", kind: "scale_5", dimension: "work_life", required: true },
      { id: "rq2", text: "改善提案があれば（任意）", kind: "text", dimension: "work_life", required: false },
    ],
  },
];

// ─── アクションプラン ─────────────
export type ActionPlan = {
  id: string;
  campaign_id: string;
  title: string;
  owner_id: string;
  status: "open" | "in_progress" | "done";
  due_date: string;
  description: string;
  related_dimension: string;
};

export const DEMO_ACTION_PLANS: ActionPlan[] = [
  { id: "ap-1", campaign_id: "cmp-3", title: "キャリアラダーの公開", owner_id: "e2", status: "in_progress", due_date: day(45), description: "全職種のキャリアラダーを社内 Wiki に公開し、四半期ごとに更新", related_dimension: "career" },
  { id: "ap-2", campaign_id: "cmp-3", title: "報酬テーブル開示の準備", owner_id: "e26", status: "open", due_date: day(60), description: "給与帯ロジックを HR リーダーシップ向けに先行開示", related_dimension: "compensation" },
  { id: "ap-3", campaign_id: "cmp-2", title: "マーケ部のリソース増強", owner_id: "e2", status: "in_progress", due_date: day(20), description: "コンテンツマーケ採用 1 名・派遣 1 名を確保", related_dimension: "work_life" },
  { id: "ap-4", campaign_id: "cmp-2", title: "Q1 評価フィードバックセッション", owner_id: "e5", status: "done", due_date: day(-10), description: "全マネージャー向けにフィードバック手法ワークショップを実施", related_dimension: "compensation" },
  { id: "ap-5", campaign_id: "cmp-3", title: "マネージャー育成プログラム", owner_id: "e7", status: "open", due_date: day(75), description: "ピープルマネジメント基礎研修を月次開催", related_dimension: "manager" },
];

// ─── ヘルパ ─────────────────────────
export function activeCampaigns(): Campaign[] {
  return DEMO_CAMPAIGNS.filter((c) => c.status === "active");
}

export function latestAnalyzedCampaign(): Campaign | undefined {
  return DEMO_CAMPAIGNS
    .filter((c) => c.status === "analyzed")
    .sort((a, b) => b.ends_at.localeCompare(a.ends_at))[0];
}

export function actionsForCampaign(campaignId: string): ActionPlan[] {
  return DEMO_ACTION_PLANS.filter((a) => a.campaign_id === campaignId);
}

export function responseRate(c: Campaign): number {
  return c.target_count > 0 ? Math.round((c.response_count / c.target_count) * 100) : 0;
}

// パルス・スコアの推移（最新 6 ヶ月のシミュレーション）
export const PULSE_TREND = [
  { month: "12月", engagement: 3.5, manager: 3.8, work_life: 3.2 },
  { month: "1月", engagement: 3.6, manager: 3.9, work_life: 3.3 },
  { month: "2月", engagement: 3.5, manager: 3.9, work_life: 3.1 },
  { month: "3月", engagement: 3.8, manager: 4.0, work_life: 3.4 },
  { month: "4月", engagement: 3.7, manager: 4.0, work_life: 3.3 },
  { month: "5月", engagement: 3.9, manager: 4.1, work_life: 3.5 },
];
