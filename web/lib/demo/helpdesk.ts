/**
 * HR ヘルプデスクのデモデータ。
 * 社員からの問い合わせをチケット化し、SLA 管理・カテゴリ分類・FAQ で対応。
 */

export type TicketCategory =
  | "payroll"          // 給与・賞与
  | "attendance"       // 勤怠・休暇
  | "benefits"         // 福利厚生
  | "policy"           // 人事制度
  | "onboarding"       // 入社関連
  | "offboarding"      // 退職関連
  | "visa"             // 在留資格
  | "training"         // 研修
  | "complaint"        // 苦情・相談
  | "other";

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  payroll: "給与・賞与",
  attendance: "勤怠・休暇",
  benefits: "福利厚生",
  policy: "人事制度",
  onboarding: "入社関連",
  offboarding: "退職関連",
  visa: "在留資格",
  training: "研修",
  complaint: "苦情・相談",
  other: "その他",
};

export const CATEGORY_TONE: Record<TicketCategory, string> = {
  payroll: "border-emerald-200 bg-emerald-50 text-emerald-800",
  attendance: "border-blue-200 bg-blue-50 text-blue-800",
  benefits: "border-purple-200 bg-purple-50 text-purple-800",
  policy: "border-indigo-200 bg-indigo-50 text-indigo-800",
  onboarding: "border-amber-200 bg-amber-50 text-amber-800",
  offboarding: "border-gray-200 bg-gray-50 text-gray-800",
  visa: "border-cyan-200 bg-cyan-50 text-cyan-800",
  training: "border-pink-200 bg-pink-50 text-pink-800",
  complaint: "border-red-200 bg-red-50 text-red-800",
  other: "border-gray-200 bg-gray-50 text-gray-700",
};

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "未対応",
  in_progress: "対応中",
  waiting: "回答待ち",
  resolved: "解決",
  closed: "完了",
};

export const STATUS_TONE: Record<TicketStatus, string> = {
  open: "border-blue-200 bg-blue-50 text-blue-800",
  in_progress: "border-amber-200 bg-amber-50 text-amber-800",
  waiting: "border-purple-200 bg-purple-50 text-purple-800",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  closed: "border-gray-200 bg-gray-50 text-gray-700",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

export const PRIORITY_TONE: Record<TicketPriority, string> = {
  low: "text-gray-700",
  medium: "text-blue-700",
  high: "text-orange-700",
  urgent: "text-red-700 font-bold",
};

// SLA: priority → 解決目標時間
export const SLA_HOURS: Record<TicketPriority, number> = {
  low: 72,
  medium: 24,
  high: 8,
  urgent: 2,
};

export type TicketComment = {
  id: string;
  author_id: string;
  body: string;
  is_internal: boolean;       // 社内メモ（申請者には非公開）
  created_at: string;
};

export type Ticket = {
  id: string;
  number: number;             // チケット番号 #2026-001
  requester_id: string;       // 申請社員
  assignee_id: string | null; // HR 担当
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  comments: TicketComment[];
  channel: "web" | "slack" | "email";
  related_faq_ids?: string[];
};

const hour = (offset: number) => {
  const d = new Date();
  d.setHours(d.getHours() + offset);
  return d.toISOString();
};

export const DEMO_TICKETS: Ticket[] = [
  // 緊急
  {
    id: "tk-1", number: 2026_071, requester_id: "e11", assignee_id: "e2",
    category: "visa", status: "in_progress", priority: "urgent",
    subject: "在留期限が 14 日後に迫っています",
    body: "在留資格の更新申請に必要な書類を急ぎ確認したいです。在職証明書・雇用契約書・所得証明をご準備いただけますか？",
    created_at: hour(-3), updated_at: hour(-1), resolved_at: null,
    channel: "slack",
    comments: [
      { id: "c-1-1", author_id: "e2", body: "対応します。15 分後にすべての書類を共有します。", is_internal: false, created_at: hour(-2) },
      { id: "c-1-2", author_id: "e2", body: "書類準備済み。Slack DM でも送付しました。", is_internal: false, created_at: hour(-1) },
    ],
  },
  // 高優先度
  {
    id: "tk-2", number: 2026_070, requester_id: "e23", assignee_id: "e5",
    category: "complaint", status: "waiting", priority: "high",
    subject: "業務量過多について HR と面談を希望します",
    body: "ここ 2 ヶ月、残業時間が 80 時間を超えています。チーム内のリソース配分について HR と面談したいです。",
    created_at: hour(-12), updated_at: hour(-6), resolved_at: null,
    channel: "web",
    comments: [
      { id: "c-2-1", author_id: "e5", body: "お疲れさまです。今週中に面談時間を調整します。マネージャーへの事前共有はいかがしますか？", is_internal: false, created_at: hour(-10) },
      { id: "c-2-2", author_id: "e23", body: "事前共有はお願いしません。一度 HR とだけ話したいです。", is_internal: false, created_at: hour(-6) },
    ],
  },
  {
    id: "tk-3", number: 2026_069, requester_id: "e25", assignee_id: "e6",
    category: "onboarding", status: "in_progress", priority: "high",
    subject: "PC が初日から動作不良です",
    body: "支給された PC が起動時にエラーが頻発します。代替機の手配は可能でしょうか？",
    created_at: hour(-20), updated_at: hour(-4), resolved_at: null,
    channel: "slack",
    comments: [
      { id: "c-3-1", author_id: "e6", body: "IT 部門と連携して代替機を手配中。明日午前中に到着予定。", is_internal: false, created_at: hour(-18) },
      { id: "c-3-2", author_id: "e6", body: "（社内メモ）IT が在庫から MacBook Pro を出荷。配送完了次第セットアップサポート手配。", is_internal: true, created_at: hour(-4) },
    ],
  },
  // 中優先度
  {
    id: "tk-4", number: 2026_068, requester_id: "e15", assignee_id: "e7",
    category: "training", status: "open", priority: "medium",
    subject: "外部カンファレンス参加費用の補助について",
    body: "Design Matters Tokyo 2026 に参加したいのですが、会社の補助制度はありますか？",
    created_at: hour(-30), updated_at: hour(-30), resolved_at: null,
    channel: "web",
    comments: [],
    related_faq_ids: ["faq-1"],
  },
  {
    id: "tk-5", number: 2026_067, requester_id: "e18", assignee_id: "e5",
    category: "payroll", status: "in_progress", priority: "medium",
    subject: "賞与の支給日と金額計算について",
    body: "夏季賞与の支給日と計算ロジックを教えてください。前年比でどう変わるかも知りたいです。",
    created_at: hour(-48), updated_at: hour(-20), resolved_at: null,
    channel: "email",
    comments: [
      { id: "c-5-1", author_id: "e5", body: "支給日は 7 月 5 日。計算ロジックは社内 Wiki にも記載があります（リンク）。", is_internal: false, created_at: hour(-30) },
      { id: "c-5-2", author_id: "e18", body: "ありがとうございます。確認しました。前年比のシミュレーションも別途お願いできますか？", is_internal: false, created_at: hour(-20) },
    ],
  },
  {
    id: "tk-6", number: 2026_066, requester_id: "e9", assignee_id: "e2",
    category: "policy", status: "open", priority: "medium",
    subject: "リモートワーク制度改定の解釈について",
    body: "5 月の制度改定で「四半期に 2 週間まで海外勤務可」とありますが、税務的なリスクはどう考えますか？",
    created_at: hour(-50), updated_at: hour(-50), resolved_at: null,
    channel: "web",
    comments: [],
    related_faq_ids: ["faq-2"],
  },
  {
    id: "tk-7", number: 2026_065, requester_id: "e10", assignee_id: "e6",
    category: "benefits", status: "open", priority: "low",
    subject: "確定拠出年金の運用商品変更",
    body: "DC 年金の運用商品を変更したいのですが、手続きを教えてください。",
    created_at: hour(-60), updated_at: hour(-60), resolved_at: null,
    channel: "web",
    comments: [],
    related_faq_ids: ["faq-3"],
  },
  // 解決済
  {
    id: "tk-8", number: 2026_064, requester_id: "e13", assignee_id: "e5",
    category: "onboarding", status: "resolved", priority: "medium",
    subject: "Slack ワークスペースに招待されていません",
    body: "入社初日ですが Slack に招待が届いていません。",
    created_at: hour(-100), updated_at: hour(-95), resolved_at: hour(-95),
    channel: "email",
    comments: [
      { id: "c-8-1", author_id: "e5", body: "申し訳ありません！招待を再送しました。ご確認ください。", is_internal: false, created_at: hour(-99) },
      { id: "c-8-2", author_id: "e13", body: "受信できました、ありがとうございます！", is_internal: false, created_at: hour(-95) },
    ],
  },
  {
    id: "tk-9", number: 2026_063, requester_id: "e17", assignee_id: "e6",
    category: "attendance", status: "closed", priority: "low",
    subject: "夏季休暇の取得期限について",
    body: "夏季休暇 5 日分はいつまでに取得すれば良いでしょうか？",
    created_at: hour(-120), updated_at: hour(-110), resolved_at: hour(-115),
    channel: "web",
    comments: [
      { id: "c-9-1", author_id: "e6", body: "9 月末までに取得をお願いします。詳細は社内 Wiki の「休暇制度」をご確認ください。", is_internal: false, created_at: hour(-118) },
    ],
    related_faq_ids: ["faq-4"],
  },
  {
    id: "tk-10", number: 2026_062, requester_id: "e22", assignee_id: "e7",
    category: "training", status: "resolved", priority: "low",
    subject: "オンライン語学学習の補助について",
    body: "英語学習のオンラインプラットフォームの会社補助はありますか？",
    created_at: hour(-150), updated_at: hour(-148), resolved_at: hour(-148),
    channel: "slack",
    comments: [
      { id: "c-10-1", author_id: "e7", body: "Cambly と Italki に補助あり。月額上限 1 万円までキャッシュバックされます。", is_internal: false, created_at: hour(-149) },
    ],
  },
  // 期限超過しそうなもの (open + 古い)
  {
    id: "tk-11", number: 2026_061, requester_id: "e3", assignee_id: null,
    category: "policy", status: "open", priority: "high",
    subject: "ストックオプション制度の改定提案",
    body: "新規入社者向けの SO 設計について、HR と CFO で議論したい点があります。",
    created_at: hour(-72), updated_at: hour(-72), resolved_at: null,
    channel: "email",
    comments: [],
  },
  // 自分が submitter のチケット (e1 = 野村さん視点)
  {
    id: "tk-12", number: 2026_060, requester_id: "e1", assignee_id: "e2",
    category: "policy", status: "in_progress", priority: "medium",
    subject: "経営層向け OKR 評価設計の見直し",
    body: "Q3 から経営層の OKR 評価の重み付けを見直したい。HR と相談したい。",
    created_at: hour(-200), updated_at: hour(-100), resolved_at: null,
    channel: "web",
    comments: [
      { id: "c-12-1", author_id: "e2", body: "了解です。ドラフト案を来週共有します。", is_internal: false, created_at: hour(-180) },
    ],
  },
];

export type Faq = {
  id: string;
  category: TicketCategory;
  question: string;
  answer: string;
  views: number;
  helpful_count: number;
  last_updated_at: string;
  related_link?: string;
};

const dayDate = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const DEMO_FAQS: Faq[] = [
  {
    id: "faq-1", category: "training",
    question: "外部カンファレンス・研修への参加費補助は？",
    answer: "業務関連性が認められる場合、年間 30 万円まで補助。事前申請が必要（マネージャー承認 → HR 承認）。社内 Wiki の「学習サポート制度」を参照。",
    views: 124, helpful_count: 89, last_updated_at: dayDate(-30), related_link: "/wiki/learning",
  },
  {
    id: "faq-2", category: "policy",
    question: "海外からのリモート勤務は可能？",
    answer: "四半期に最大 2 週間まで可能。ただし税務上の常駐リスクを避けるため、滞在国・期間を事前申告必須。長期赴任は別制度（海外赴任管理ツール）で管理。",
    views: 98, helpful_count: 76, last_updated_at: dayDate(-15),
  },
  {
    id: "faq-3", category: "benefits",
    question: "確定拠出年金（DC）の運用商品を変更したい",
    answer: "DC 運営機関のポータル（社内 Wiki にリンク）にログインし、運用商品の配分を変更可能。変更は月 1 回まで。",
    views: 56, helpful_count: 41, last_updated_at: dayDate(-45),
  },
  {
    id: "faq-4", category: "attendance",
    question: "夏季休暇・年末年始休暇の取得期限",
    answer: "夏季休暇 5 日は 7-9 月の間に取得。年末年始休暇は別枠（12/29-1/3 が公休）。詳細は就業規則 §15。",
    views: 234, helpful_count: 198, last_updated_at: dayDate(-60),
  },
  {
    id: "faq-5", category: "payroll",
    question: "給与日と振込タイミング",
    answer: "毎月 25 日（土日祝の場合は前営業日）に当月分を支給。明細は freee 経由で 23 日に確認可能。",
    views: 187, helpful_count: 165, last_updated_at: dayDate(-90),
  },
  {
    id: "faq-6", category: "onboarding",
    question: "入社初日に必要な持参物は？",
    answer: "印鑑（認印 OK）・身分証明書・銀行口座情報・年金手帳。詳細はオンボーディングチェックリストで確認。",
    views: 78, helpful_count: 65, last_updated_at: dayDate(-20), related_link: "/onboarding",
  },
  {
    id: "faq-7", category: "visa",
    question: "在留資格更新の手続きは？",
    answer: "期限 90 日前から申請可能。在職証明書・雇用契約書・住民税課税証明書を HR に依頼。詳細は在留資格管理ツール（visa）を参照。",
    views: 45, helpful_count: 38, last_updated_at: dayDate(-10), related_link: "/visa",
  },
  {
    id: "faq-8", category: "complaint",
    question: "ハラスメント相談はどこに？",
    answer: "「目安箱」ツールで匿名相談可能。または HR の信頼できるメンバーに直接 DM。社外窓口（弁護士）も利用可。",
    views: 32, helpful_count: 28, last_updated_at: dayDate(-5), related_link: "/voice-box",
  },
];

// ヘルパ
export function ticketsByStatus(): Map<TicketStatus, Ticket[]> {
  const map = new Map<TicketStatus, Ticket[]>();
  for (const s of ["open", "in_progress", "waiting", "resolved", "closed"] as TicketStatus[]) map.set(s, []);
  for (const t of DEMO_TICKETS) map.get(t.status)!.push(t);
  return map;
}

export function ticketsForRequester(employeeId: string): Ticket[] {
  return DEMO_TICKETS
    .filter((t) => t.requester_id === employeeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function ticketsForAssignee(employeeId: string): Ticket[] {
  return DEMO_TICKETS
    .filter((t) => t.assignee_id === employeeId && t.status !== "closed")
    .sort((a, b) => {
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
}

export function slaState(ticket: Ticket): { hoursLeft: number; breached: boolean } {
  if (ticket.status === "resolved" || ticket.status === "closed") {
    return { hoursLeft: 0, breached: false };
  }
  const elapsed = (Date.now() - new Date(ticket.created_at).getTime()) / 3600_000;
  const sla = SLA_HOURS[ticket.priority];
  const hoursLeft = Math.round((sla - elapsed) * 10) / 10;
  return { hoursLeft, breached: hoursLeft < 0 };
}

export function ticketsByCategory(): Map<TicketCategory, number> {
  const map = new Map<TicketCategory, number>();
  for (const t of DEMO_TICKETS) {
    map.set(t.category, (map.get(t.category) ?? 0) + 1);
  }
  return map;
}

export function avgResolutionHours(): number {
  const resolved = DEMO_TICKETS.filter((t) => t.resolved_at);
  if (resolved.length === 0) return 0;
  const total = resolved.reduce((s, t) =>
    s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 3600_000, 0);
  return Math.round(total / resolved.length * 10) / 10;
}
