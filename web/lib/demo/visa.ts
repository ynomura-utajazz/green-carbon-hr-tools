/**
 * 在留資格・ビザ管理のデモデータ。
 * 外国籍社員の在留カード期限・更新状況を一元管理。
 */

import { DEMO_EMPLOYEES } from "./employees";

export type VisaStatus =
  | "engineer_intl"      // 技術・人文知識・国際業務
  | "intra_company"      // 企業内転勤
  | "specialist"          // 高度専門職
  | "business_manager"    // 経営・管理
  | "permanent"           // 永住者
  | "spouse"              // 家族滞在 / 配偶者
  | "student"             // 留学
  | "specified_skilled"; // 特定技能

export const STATUS_LABEL: Record<VisaStatus, string> = {
  engineer_intl: "技術・人文知識・国際業務",
  intra_company: "企業内転勤",
  specialist: "高度専門職",
  business_manager: "経営・管理",
  permanent: "永住者",
  spouse: "家族滞在",
  student: "留学",
  specified_skilled: "特定技能",
};

export type VisaUrgency = "ok" | "watch" | "warning" | "critical" | "expired";

export const URGENCY_TONE: Record<VisaUrgency, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  watch: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-300 bg-red-50 text-red-900",
  expired: "border-gray-300 bg-gray-100 text-gray-800",
};

export const URGENCY_LABEL: Record<VisaUrgency, string> = {
  ok: "余裕あり",
  watch: "監視中",
  warning: "要対応",
  critical: "緊急",
  expired: "期限切れ",
};

export type RenewalProgress =
  | "not_started"      // 未着手
  | "documents_ready"  // 書類準備中
  | "submitted"        // 入管に提出済
  | "approved"         // 許可済
  | "renewed";         // 完了

export const PROGRESS_LABEL: Record<RenewalProgress, string> = {
  not_started: "未着手",
  documents_ready: "書類準備中",
  submitted: "入管申請中",
  approved: "許可済",
  renewed: "更新完了",
};

export type VisaRecord = {
  employee_id: string;
  visa_status: VisaStatus;
  card_number: string;
  issued_at: string;
  expires_at: string;
  renewal_progress: RenewalProgress;
  required_documents: { name: string; status: "ready" | "preparing" | "missing" }[];
  notes?: string;
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const DEMO_VISA_RECORDS: VisaRecord[] = [
  // 緊急（30日以内）
  {
    employee_id: "e11",  // Wibowo Agus
    visa_status: "engineer_intl",
    card_number: "AB12345678CD",
    issued_at: day(-1080),
    expires_at: day(14),
    renewal_progress: "documents_ready",
    required_documents: [
      { name: "在職証明書", status: "ready" },
      { name: "雇用契約書写し", status: "ready" },
      { name: "住民税課税証明書", status: "preparing" },
      { name: "源泉徴収票", status: "ready" },
      { name: "在留カード写し", status: "ready" },
    ],
    notes: "更新申請を 5/15 に予定。住民税証明取得待ち。",
  },
  {
    employee_id: "e12",  // Nguyen Thanh
    visa_status: "engineer_intl",
    card_number: "CD23456789EF",
    issued_at: day(-700),
    expires_at: day(24),
    renewal_progress: "documents_ready",
    required_documents: [
      { name: "在職証明書", status: "ready" },
      { name: "雇用契約書写し", status: "ready" },
      { name: "住民税課税証明書", status: "ready" },
      { name: "源泉徴収票", status: "preparing" },
    ],
    notes: "ベトナム拠点勤務だが東京での日数も多いため申請は東京入管。",
  },
  {
    employee_id: "e24",  // Tirza Grace
    visa_status: "engineer_intl",
    card_number: "EF34567890GH",
    issued_at: day(-720),
    expires_at: day(28),
    renewal_progress: "submitted",
    required_documents: [
      { name: "在職証明書", status: "ready" },
      { name: "雇用契約書写し", status: "ready" },
      { name: "住民税課税証明書", status: "ready" },
      { name: "源泉徴収票", status: "ready" },
    ],
    notes: "5/2 に入管へ提出。許可待ち。",
  },
  // 警告（90日以内）
  {
    employee_id: "e7",  // Park Jihye
    visa_status: "engineer_intl",
    card_number: "GH45678901IJ",
    issued_at: day(-540),
    expires_at: day(75),
    renewal_progress: "not_started",
    required_documents: [
      { name: "在職証明書", status: "missing" },
      { name: "雇用契約書写し", status: "missing" },
      { name: "住民税課税証明書", status: "missing" },
      { name: "源泉徴収票", status: "missing" },
    ],
  },
  {
    employee_id: "e22",  // Sara Aimen
    visa_status: "engineer_intl",
    card_number: "IJ56789012KL",
    issued_at: day(-365),
    expires_at: day(85),
    renewal_progress: "not_started",
    required_documents: [
      { name: "在職証明書", status: "missing" },
      { name: "雇用契約書写し", status: "missing" },
      { name: "住民税課税証明書", status: "missing" },
    ],
  },
  // 監視中（180日以内）
  {
    employee_id: "e25",  // Nguyen An
    visa_status: "engineer_intl",
    card_number: "KL67890123MN",
    issued_at: day(-180),
    expires_at: day(150),
    renewal_progress: "not_started",
    required_documents: [],
  },
  {
    employee_id: "e21",  // Saw Jasmine
    visa_status: "specialist",
    card_number: "MN78901234OP",
    issued_at: day(-200),
    expires_at: day(165),
    renewal_progress: "not_started",
    required_documents: [],
    notes: "高度専門職 1 号 (5 年)。次回更新時に 2 号への切替検討。",
  },
  // 余裕あり
  {
    employee_id: "e20",  // Lopez Maria
    visa_status: "specialist",
    card_number: "OP89012345QR",
    issued_at: day(-200),
    expires_at: day(530),
    renewal_progress: "not_started",
    required_documents: [],
  },
  {
    employee_id: "e27",  // Galina Sofia
    visa_status: "engineer_intl",
    card_number: "QR90123456ST",
    issued_at: day(-300),
    expires_at: day(425),
    renewal_progress: "not_started",
    required_documents: [],
  },
  {
    employee_id: "e28",  // Esha Grace
    visa_status: "specified_skilled",
    card_number: "ST01234567UV",
    issued_at: day(-50),
    expires_at: day(310),
    renewal_progress: "not_started",
    required_documents: [],
    notes: "インターン期間後の正社員転換時に在留資格変更要。",
  },
  {
    employee_id: "e29",  // Lee Felicia
    visa_status: "specified_skilled",
    card_number: "UV12345678WX",
    issued_at: day(-30),
    expires_at: day(330),
    renewal_progress: "not_started",
    required_documents: [],
  },
];

// ─── ヘルパ ─────────────────────────
export function urgencyOf(record: VisaRecord): VisaUrgency {
  const now = Date.now();
  const expires = new Date(record.expires_at).getTime();
  const daysLeft = Math.floor((expires - now) / 86_400_000);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "critical";
  if (daysLeft <= 90) return "warning";
  if (daysLeft <= 180) return "watch";
  return "ok";
}

export function daysUntilExpiry(record: VisaRecord): number {
  return Math.floor((new Date(record.expires_at).getTime() - Date.now()) / 86_400_000);
}

export function recordsByUrgency(records: VisaRecord[] = DEMO_VISA_RECORDS): Map<VisaUrgency, VisaRecord[]> {
  const map = new Map<VisaUrgency, VisaRecord[]>();
  for (const u of ["critical", "warning", "watch", "ok", "expired"] as VisaUrgency[]) map.set(u, []);
  for (const r of records) {
    map.get(urgencyOf(r))!.push(r);
  }
  return map;
}

export function recordForEmployee(employeeId: string): VisaRecord | undefined {
  return DEMO_VISA_RECORDS.find((r) => r.employee_id === employeeId);
}

export function foreignEmployeeIds(): string[] {
  return DEMO_EMPLOYEES.filter((e) => e.is_foreign_national).map((e) => e.id);
}
