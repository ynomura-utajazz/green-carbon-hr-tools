/**
 * 目安箱（コンプライアンス通報・ハラスメント相談）のデモデータ。
 * 匿名性とプライバシーを最優先。社外専用窓口（弁護士）への接続も。
 */

export type ReportCategory =
  | "harassment"        // ハラスメント
  | "power_harassment"  // パワハラ
  | "sexual_harassment" // セクハラ
  | "compliance"        // コンプライアンス・法令違反
  | "fraud"             // 不正・横領
  | "discrimination"    // 差別
  | "work_environment"  // 労働環境
  | "other";

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  harassment: "ハラスメント",
  power_harassment: "パワーハラスメント",
  sexual_harassment: "セクシャルハラスメント",
  compliance: "コンプライアンス違反",
  fraud: "不正・横領",
  discrimination: "差別",
  work_environment: "労働環境",
  other: "その他",
};

export const CATEGORY_TONE: Record<ReportCategory, string> = {
  harassment: "border-red-200 bg-red-50 text-red-800",
  power_harassment: "border-orange-200 bg-orange-50 text-orange-800",
  sexual_harassment: "border-pink-200 bg-pink-50 text-pink-800",
  compliance: "border-purple-200 bg-purple-50 text-purple-800",
  fraud: "border-rose-300 bg-rose-50 text-rose-900",
  discrimination: "border-amber-200 bg-amber-50 text-amber-800",
  work_environment: "border-blue-200 bg-blue-50 text-blue-800",
  other: "border-gray-200 bg-gray-50 text-gray-700",
};

export type Severity = "low" | "medium" | "high" | "critical";

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "最重要",
};

export const SEVERITY_TONE: Record<Severity, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-orange-300 bg-orange-50 text-orange-900",
  critical: "border-red-300 bg-red-50 text-red-900",
};

export type ReportStatus =
  | "received"        // 受付済
  | "triaging"        // 振り分け中
  | "investigating"   // 調査中
  | "escalated"       // 社外窓口へエスカレーション
  | "resolved"        // 対応完了
  | "closed";         // クローズ

export const STATUS_LABEL: Record<ReportStatus, string> = {
  received: "受付済",
  triaging: "振り分け中",
  investigating: "調査中",
  escalated: "社外エスカレーション",
  resolved: "対応完了",
  closed: "クローズ",
};

export const STATUS_TONE: Record<ReportStatus, string> = {
  received: "border-blue-200 bg-blue-50 text-blue-800",
  triaging: "border-purple-200 bg-purple-50 text-purple-800",
  investigating: "border-amber-200 bg-amber-50 text-amber-800",
  escalated: "border-rose-300 bg-rose-50 text-rose-900",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  closed: "border-gray-200 bg-gray-50 text-gray-700",
};

export type InvestigationNote = {
  id: string;
  author_id: string;       // HR/法務担当
  body: string;
  created_at: string;
  is_confidential: boolean;
};

export type Report = {
  id: string;
  number: string;             // 通報番号 #VB-2026-005
  reporter_id: string | null;  // 匿名なら null
  is_anonymous: boolean;
  category: ReportCategory;
  severity: Severity;
  status: ReportStatus;
  subject: string;
  body: string;                 // 通報内容
  involved_party_role?: string;  // 加害者役職（匿名性配慮で氏名は記載しない）
  desired_outcome?: string;      // 望む対応
  contact_method?: "email" | "slack" | "no_contact";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  triaged_to: ("hr" | "legal" | "executive" | "external_lawyer")[];
  investigation_notes: InvestigationNote[];
  // 通報者向けフィードバック（匿名でも経過は確認可能、ID で照合）
  reporter_visible_summary?: string;
};

const hour = (offset: number) => {
  const d = new Date();
  d.setHours(d.getHours() + offset);
  return d.toISOString();
};

export const DEMO_REPORTS: Report[] = [
  {
    id: "vb-1", number: "VB-2026-008",
    reporter_id: null, is_anonymous: true,
    category: "power_harassment", severity: "high", status: "investigating",
    subject: "上司からの過度な叱責が継続しています",
    body: "ここ数ヶ月、所属部の上司から朝会の場で過度に叱責されることが頻繁にあります。具体的には、他のメンバーの前で能力を否定する発言を 5 回以上記録しました。心身のダメージが大きく、業務への支障が出始めています。匿名で相談したく、まずは状況の調査をお願いしたいです。",
    involved_party_role: "部長級",
    desired_outcome: "状況の事実確認と、再発防止のための介入",
    contact_method: "no_contact",
    created_at: hour(-72), updated_at: hour(-2), resolved_at: null,
    triaged_to: ["hr", "legal"],
    investigation_notes: [
      { id: "n1", author_id: "e2", body: "受付確認。同部門の 1on1 ログから関連する記述を抽出開始。", created_at: hour(-70), is_confidential: true },
      { id: "n2", author_id: "e2", body: "外部 EAP 心理職への一次相談を提案するメッセージを匿名チャネルへ送信。", created_at: hour(-48), is_confidential: false },
      { id: "n3", author_id: "e2", body: "匿名通報者から追加情報受領（メモ参照）。慎重に部内ヒアリングの計画を策定中。", created_at: hour(-2), is_confidential: true },
    ],
    reporter_visible_summary: "ご報告ありがとうございました。HR と法務で調査を開始しています。安全な環境を最優先に対応します。次回更新は 1 週間以内を予定。",
  },
  {
    id: "vb-2", number: "VB-2026-007",
    reporter_id: null, is_anonymous: true,
    category: "compliance", severity: "critical", status: "escalated",
    subject: "海外取引における会計処理の疑義",
    body: "ASEAN 取引の一部で、契約書と実際の請求金額が異なるケースを偶然発見しました。意図的か事務ミスか不明ですが、規模感から見て看過できないため通報します。",
    involved_party_role: "管理職以上",
    desired_outcome: "第三者による事実確認",
    contact_method: "no_contact",
    created_at: hour(-120), updated_at: hour(-24), resolved_at: null,
    triaged_to: ["legal", "executive", "external_lawyer"],
    investigation_notes: [
      { id: "n4", author_id: "e26", body: "通報受領。CFO・取締役会議長へ即日報告。", created_at: hour(-118), is_confidential: true },
      { id: "n5", author_id: "e26", body: "外部弁護士事務所（顧問）に独立調査を依頼。社内アクセスを制限。", created_at: hour(-100), is_confidential: true },
      { id: "n6", author_id: "e26", body: "外部調査チームが進行中。完了予定 2-3 週間。社内関係者への通知は厳重管理。", created_at: hour(-24), is_confidential: true },
    ],
    reporter_visible_summary: "重要なご報告として受領しました。外部専門家による独立調査を開始しています。完了まで 2-3 週間を要する見込みです。",
  },
  {
    id: "vb-3", number: "VB-2026-006",
    reporter_id: "e15", is_anonymous: false,
    category: "harassment", severity: "medium", status: "investigating",
    subject: "他部門メンバーからの不適切な発言について",
    body: "プロジェクトミーティングで、他部門のメンバーから繰り返し人格を否定する発言を受けました。複数の証人もいます。マネージャーに既に伝えていますが、HR にも記録として残したいです。",
    involved_party_role: "同等職位",
    desired_outcome: "本人への改善要請、再発時の対応合意",
    contact_method: "slack",
    created_at: hour(-150), updated_at: hour(-30), resolved_at: null,
    triaged_to: ["hr"],
    investigation_notes: [
      { id: "n7", author_id: "e5", body: "通報者と 1on1。事実関係を確認。証言者リストを取得。", created_at: hour(-130), is_confidential: false },
      { id: "n8", author_id: "e5", body: "対象者の上長と面談予定。当事者ヒアリングは慎重に進める。", created_at: hour(-30), is_confidential: true },
    ],
    reporter_visible_summary: "通報を受け、関係者への聞き取りを進めています。来週末までに次のアクションを共有します。",
  },
  {
    id: "vb-4", number: "VB-2026-005",
    reporter_id: "e25", is_anonymous: false,
    category: "work_environment", severity: "medium", status: "resolved",
    subject: "勤務時間外の Slack 連絡が頻繁です",
    body: "週末や深夜に Slack で業務指示が届くことが多く、心理的負担を感じています。明示的な締め切りがあるわけではないのですが、対応しないと評価に影響しそうで悩んでいます。",
    involved_party_role: "上長",
    desired_outcome: "勤務時間外コミュニケーションのルール化",
    contact_method: "email",
    created_at: hour(-260), updated_at: hour(-40), resolved_at: hour(-40),
    triaged_to: ["hr"],
    investigation_notes: [
      { id: "n9", author_id: "e2", body: "通報者と面談。マネージャーとも個別協議。", created_at: hour(-240), is_confidential: false },
      { id: "n10", author_id: "e2", body: "全社向けに「勤務時間外連絡の自粛」ガイドラインを発出。Wiki に記録。", created_at: hour(-50), is_confidential: false },
      { id: "n11", author_id: "e2", body: "通報者・対象マネージャーともに改善を確認。本ケースをクローズ。", created_at: hour(-40), is_confidential: false },
    ],
    reporter_visible_summary: "通報ありがとうございました。全社向けガイドラインの発出と当該マネージャーへの改善依頼を実施し、状況の改善を確認しました。",
  },
  {
    id: "vb-5", number: "VB-2026-004",
    reporter_id: null, is_anonymous: true,
    category: "discrimination", severity: "high", status: "received",
    subject: "海外メンバーの評価における疑問",
    body: "海外オフィスのメンバーが、同等の成果を出していても、東京の社員と比較して評価が低い傾向があるように感じます。匿名で構わないので、評価制度の公平性を見直してほしいです。",
    involved_party_role: "評価制度全体",
    desired_outcome: "評価データの監査と再発防止",
    contact_method: "no_contact",
    created_at: hour(-6), updated_at: hour(-6), resolved_at: null,
    triaged_to: ["hr"],
    investigation_notes: [
      { id: "n12", author_id: "e2", body: "受付。Q1 評価データの国別集計を作成し、統計的差異を確認する作業を開始。", created_at: hour(-3), is_confidential: false },
    ],
    reporter_visible_summary: "受領しました。データに基づく監査を開始しており、来週中に初期所見を共有します。",
  },
];

// ─── ヘルパ ─────────────────────────
export function activeReports(): Report[] {
  return DEMO_REPORTS.filter((r) => r.status !== "resolved" && r.status !== "closed");
}

export function reportsByStatus(status: ReportStatus): Report[] {
  return DEMO_REPORTS.filter((r) => r.status === status);
}

export function reportsBySeverity(severity: Severity): Report[] {
  return DEMO_REPORTS.filter((r) => r.severity === severity);
}

export function reportsByCategory(): Map<ReportCategory, number> {
  const map = new Map<ReportCategory, number>();
  for (const r of DEMO_REPORTS) {
    map.set(r.category, (map.get(r.category) ?? 0) + 1);
  }
  return map;
}

export function avgResolutionDays(): number {
  const resolved = DEMO_REPORTS.filter((r) => r.resolved_at);
  if (resolved.length === 0) return 0;
  const total = resolved.reduce((s, r) =>
    s + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 86400_000, 0);
  return Math.round(total / resolved.length * 10) / 10;
}
