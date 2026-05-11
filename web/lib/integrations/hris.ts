/**
 * HRIS 連携（BambooHR / Workday）の型 + デモ。
 *
 * 連携モード：
 *  - bamboohr : シンプル中規模 HRIS。subdomain + API key で REST。
 *  - workday  : エンタープライズ HRIS。SOAP/REST 双方、API ユーザー設定が複雑。
 *
 * 同期方向：
 *  - inbound (HRIS → 自社)：employee master、giving status、退職予定 等
 *  - outbound (自社 → HRIS)：採用決定 → onboarding 連携、評価結果、給与改定 等
 *
 * フィールドマッピング：
 *  - 自社 employees ↔ HRIS employee の対応関係を yaml/json で持つ
 *
 * 同期ジョブの状態：cron で日次同期、手動トリガ可能、conflict 時はマージルール
 */

export type HrisProvider = "bamboohr" | "workday";

export type HrisConnection = {
  provider: HrisProvider;
  /** プロバイダごとの接続情報 */
  config: {
    bamboohr?: { subdomain: string; api_key_set: boolean };
    workday?:  { tenant: string; api_user: string; oauth_set: boolean };
  };
  status: "connected" | "disconnected" | "error";
  last_sync_at?: string;
  sync_direction: "inbound_only" | "outbound_only" | "bidirectional";
};

/** フィールドマッピング */
export type FieldMapping = {
  /** 自社のテーブル.カラム */
  internal: string;
  /** HRIS 側のフィールド名 */
  external: string;
  /** 同期方向 */
  direction: "inbound" | "outbound" | "bidirectional";
  /** 変換ルール（あれば） */
  transform?: string;
};

export type SyncRun = {
  id: string;
  provider: HrisProvider;
  ran_at: string;
  duration_sec: number;
  /** 自社→HRIS の件数 */
  outbound_count: number;
  /** HRIS→自社 の件数 */
  inbound_count: number;
  /** コンフリクト件数 */
  conflicts: number;
  status: "ok" | "partial" | "error";
  error_message?: string;
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const hour = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

export const DEMO_HRIS_CONNECTIONS: HrisConnection[] = [
  {
    provider: "bamboohr",
    config: { bamboohr: { subdomain: "green-carbon", api_key_set: true } },
    status: "connected",
    last_sync_at: hour(-2),
    sync_direction: "bidirectional",
  },
  {
    provider: "workday",
    config: { workday: { tenant: "greencarbon_test", api_user: "—", oauth_set: false } },
    status: "disconnected",
    sync_direction: "bidirectional",
  },
];

export const DEMO_BAMBOOHR_MAPPINGS: FieldMapping[] = [
  { internal: "employees.full_name",       external: "displayName",     direction: "bidirectional" },
  { internal: "employees.email",           external: "workEmail",       direction: "bidirectional" },
  { internal: "employees.employee_code",   external: "employeeNumber",  direction: "bidirectional" },
  { internal: "employees.department_id",   external: "department",      direction: "bidirectional", transform: "department_id ↔ name lookup" },
  { internal: "employees.job_title",       external: "jobTitle",        direction: "bidirectional" },
  { internal: "employees.hire_date",       external: "hireDate",        direction: "inbound" },
  { internal: "employees.status",          external: "status",          direction: "inbound" },
  { internal: "employees.nationality",     external: "country",         direction: "inbound" },
  { internal: "compensation_history.base_annual", external: "payRate",  direction: "outbound", transform: "JPY annual → BambooHR pay frequency" },
  { internal: "one_on_ones",               external: "—",               direction: "outbound", transform: "1on1 完了で BambooHR の Performance Note へ" },
];

export const DEMO_SYNC_RUNS: SyncRun[] = [
  { id: "sr-1", provider: "bamboohr", ran_at: hour(-2),   duration_sec: 42,  outbound_count: 14, inbound_count: 287, conflicts: 0, status: "ok" },
  { id: "sr-2", provider: "bamboohr", ran_at: hour(-26),  duration_sec: 38,  outbound_count: 8,  inbound_count: 285, conflicts: 1, status: "partial",
    error_message: "1 件のコンフリクト：Park Jihye の job_title が両方で更新（自動マージ済 → BambooHR を優先）" },
  { id: "sr-3", provider: "bamboohr", ran_at: hour(-50),  duration_sec: 41,  outbound_count: 5,  inbound_count: 285, conflicts: 0, status: "ok" },
  { id: "sr-4", provider: "bamboohr", ran_at: day(-3),    duration_sec: 39,  outbound_count: 11, inbound_count: 284, conflicts: 0, status: "ok" },
  { id: "sr-5", provider: "workday",  ran_at: day(-7),    duration_sec: 0,   outbound_count: 0,  inbound_count: 0,   conflicts: 0, status: "error",
    error_message: "Workday OAuth 未設定。/admin/integrations から接続を完了してください" },
];

export const PROVIDER_META: Record<HrisProvider, { label: string; logoChar: string; cls: string; doc_url: string }> = {
  bamboohr: { label: "BambooHR", logoChar: "🐼", cls: "bg-amber-100 text-amber-900 border-amber-300",
              doc_url: "https://documentation.bamboohr.com/reference" },
  workday:  { label: "Workday",  logoChar: "🌅", cls: "bg-blue-100 text-blue-900 border-blue-300",
              doc_url: "https://community.workday.com/api" },
};
