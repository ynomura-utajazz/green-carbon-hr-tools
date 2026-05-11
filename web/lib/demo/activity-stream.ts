/**
 * Activity Stream v2 — 統合監査ログ
 *
 * 3 つのソースを 1 本のタイムラインに正規化：
 *  - audit_logs        : テーブル行の create / update / delete / view（人 + システム）
 *  - ai_usage_log      : Claude / Whisper など AI 呼び出し（use_case + コスト）
 *  - user_actions      : ログイン・エクスポート・ページビュー等の UX イベント
 *
 * 型を 1 つに揃えると、フィルタ・検索・CSV エクスポートが一回で済む。
 * 本番では Supabase の VIEW（`marts.v_activity_stream`）に集約 → 共通の
 * カラム（actor / category / action / target / metadata / occurred_at）を
 * RLS 越しで配信する想定。
 */

export type ActivityCategory = "audit" | "ai" | "user";

export type ActivitySeverity = "info" | "notice" | "warn" | "destructive";

export type ActivityEvent = {
  id: string;
  category: ActivityCategory;
  /** 動詞（create / update / delete / view / generate / login / export 等） */
  action: string;
  /** 対象（テーブル名 + ID、AI のユースケース名、ページ URL 等） */
  target: string;
  /** 操作者（system は「システム」と表示） */
  actor: string;
  actor_role?: "hr_admin" | "manager" | "executive" | "employee" | "system";
  occurred_at: string;
  severity: ActivitySeverity;
  /** 自由テキストの簡易説明 */
  summary: string;
  /** 詳細（diff / token / IP 等） */
  metadata?: Record<string, unknown>;
};

const min = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const hr  = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

// ── デモイベント（合計 ~40 件、最新→過去の順） ─────────────────
export const DEMO_ACTIVITY: ActivityEvent[] = [
  // ── 直近 1 時間 ──
  { id: "ev-001", category: "ai", action: "generate", target: "ai_usage_log/recruiting-summary",
    actor: "野村 裕太", actor_role: "manager", occurred_at: min(3), severity: "info",
    summary: "候補者サマリ生成（cand-128）", metadata: { input_tokens: 412, output_tokens: 681, cost_usd: 0.0114, model: "claude-sonnet-4-5" } },
  { id: "ev-002", category: "audit", action: "update", target: "employees/e15",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: min(8), severity: "notice",
    summary: "高橋による役職変更：シニアエンジニア → テックリード",
    metadata: { diff: { job_title: ["シニアエンジニア", "テックリード"] }, ip: "203.0.113.21" } },
  { id: "ev-003", category: "user", action: "login", target: "/auth/callback",
    actor: "藤本 直樹", actor_role: "employee", occurred_at: min(11), severity: "info",
    summary: "Google SSO でログイン", metadata: { provider: "google", ua: "Chrome 134 / macOS" } },
  { id: "ev-004", category: "ai", action: "transcribe", target: "ai_usage_log/action-extraction",
    actor: "野村 裕太", actor_role: "manager", occurred_at: min(14), severity: "info",
    summary: "1on1 音声文字起こし（Whisper, 8 分 12 秒）",
    metadata: { duration_sec: 492, audio_size_mb: 7.4, model: "whisper-1", cost_usd: 0.049 } },
  { id: "ev-005", category: "ai", action: "agent_run", target: "ai_usage_log/agent.candidate_research",
    actor: "野村 裕太", actor_role: "manager", occurred_at: min(22), severity: "info",
    summary: "AI エージェント：候補者リサーチ（5 分）", metadata: { steps: 6, total_tokens: 14_320 } },

  { id: "ev-006", category: "audit", action: "create", target: "one_on_ones/ses_2026-05-09T03:00",
    actor: "野村 裕太", actor_role: "manager", occurred_at: min(34), severity: "info",
    summary: "1on1 セッション作成（藤本さんと）" },
  { id: "ev-007", category: "user", action: "export_csv", target: "/recruiting?export=funnel",
    actor: "塚本 真純", actor_role: "hr_admin", occurred_at: min(47), severity: "notice",
    summary: "採用ファネルを CSV エクスポート（287 行）",
    metadata: { rows: 287, file: "recruiting-funnel-2026-05.csv" } },

  // ── 直近 6 時間 ──
  { id: "ev-010", category: "audit", action: "update", target: "compensation_history/comp_e6",
    actor: "鎌田 彩", actor_role: "hr_admin", occurred_at: hr(2), severity: "destructive",
    summary: "報酬改定：900 万 → 950 万（給与帯 S3）",
    metadata: { diff: { base_annual: [9_000_000, 9_500_000] }, requires_approval: true, approved_by: "高橋 真由" } },
  { id: "ev-011", category: "ai", action: "generate", target: "ai_usage_log/retention-narrative",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(2.5), severity: "info",
    summary: "離職リスク介入プラン生成（5 名分）", metadata: { input_tokens: 2_180, output_tokens: 4_120, cost_usd: 0.072 } },
  { id: "ev-012", category: "audit", action: "view", target: "salary_band/S4",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(3), severity: "info",
    summary: "給与帯 S4 を閲覧" },
  { id: "ev-013", category: "user", action: "page_view", target: "/admin/audit-log",
    actor: "塚本 真純", actor_role: "hr_admin", occurred_at: hr(3.2), severity: "info",
    summary: "監査ログを閲覧" },
  { id: "ev-014", category: "ai", action: "agent_run", target: "ai_usage_log/agent.schedule_interview",
    actor: "塚本 真純", actor_role: "hr_admin", occurred_at: hr(4), severity: "warn",
    summary: "AI エージェント：面接調整（承認待ちで停止）",
    metadata: { steps_completed: 3, paused_at_step: 4, reason: "Google Calendar への招待送信は HR 承認が必要" } },
  { id: "ev-015", category: "audit", action: "delete", target: "candidates/cand-99",
    actor: "塚本 真純", actor_role: "hr_admin", occurred_at: hr(5), severity: "destructive",
    summary: "候補者を辞退として削除", metadata: { diff: { stage: "withdrawn" }, soft_delete: true } },
  { id: "ev-016", category: "ai", action: "generate", target: "ai_usage_log/oneonone-summary",
    actor: "佐藤 慎吾", actor_role: "manager", occurred_at: hr(5.5), severity: "info",
    summary: "1on1 議事録要約 → アクション 3 件抽出",
    metadata: { actions_extracted: 3, input_tokens: 1_840, output_tokens: 920 } },

  // ── 過去 24 時間 ──
  { id: "ev-020", category: "audit", action: "update", target: "integration_tokens/slack",
    actor: "system", actor_role: "system", occurred_at: hr(8), severity: "notice",
    summary: "Slack OAuth トークンを自動ローテート", metadata: { rotated: true, expires_in_days: 90 } },
  { id: "ev-021", category: "user", action: "page_view", target: "/admin/ai-usage",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(9), severity: "info",
    summary: "AI 利用状況を閲覧" },
  { id: "ev-022", category: "audit", action: "create", target: "offers/of_cand-1",
    actor: "野村 裕太", actor_role: "manager", occurred_at: hr(11), severity: "notice",
    summary: "オファー発行（Senior Climate Engineer）" },
  { id: "ev-023", category: "ai", action: "generate", target: "ai_usage_log/dashboard-narrative",
    actor: "system", actor_role: "system", occurred_at: hr(12), severity: "info",
    summary: "経営ダッシュボード月次サマリを自動生成（cron）", metadata: { input_tokens: 3_200, output_tokens: 1_840 } },
  { id: "ev-024", category: "user", action: "login", target: "/auth/callback",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(14), severity: "info",
    summary: "Google SSO でログイン", metadata: { provider: "google", ip: "203.0.113.42" } },
  { id: "ev-025", category: "audit", action: "update", target: "employees/e6",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(20), severity: "notice",
    summary: "マネージャー変更（e3 → e1）", metadata: { diff: { manager_id: ["e3", "e1"] } } },
  { id: "ev-026", category: "audit", action: "create", target: "audit_logs/self-test",
    actor: "system", actor_role: "system", occurred_at: hr(26), severity: "info",
    summary: "監査ログ自己テスト" },
  { id: "ev-027", category: "ai", action: "agent_run", target: "ai_usage_log/agent.compile_brief",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(27), severity: "info",
    summary: "AI エージェント：週次ブリーフィング配信完了", metadata: { recipients: 38, channels: ["#leadership"] } },

  // ── 過去 1〜7 日 ──
  { id: "ev-030", category: "audit", action: "update", target: "retention_records/rr_e6",
    actor: "system", actor_role: "system", occurred_at: hr(30), severity: "warn",
    summary: "離職リスクスコアが上昇（42 → 58）", metadata: { diff: { score: [42, 58] }, threshold: 60 } },
  { id: "ev-031", category: "user", action: "export_csv", target: "/hr-dashboard?export=headcount",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(36), severity: "notice",
    summary: "ヘッドカウント月次を CSV エクスポート（300 行）" },
  { id: "ev-032", category: "ai", action: "generate", target: "ai_usage_log/coaching",
    actor: "藤本 直樹", actor_role: "employee", occurred_at: hr(40), severity: "info",
    summary: "AI コーチング（GROW）月次セッション" },
  { id: "ev-033", category: "audit", action: "view", target: "voice_box/vb-031",
    actor: "塚本 真純", actor_role: "hr_admin", occurred_at: hr(42), severity: "warn",
    summary: "目安箱通報を閲覧（重大度：高）", metadata: { anonymous: true, severity_level: "high" } },
  { id: "ev-034", category: "user", action: "page_view", target: "/admin/integrations",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(48), severity: "info",
    summary: "連携サービス管理を閲覧" },
  { id: "ev-035", category: "ai", action: "transcribe", target: "ai_usage_log/action-extraction",
    actor: "佐藤 慎吾", actor_role: "manager", occurred_at: hr(50), severity: "info",
    summary: "1on1 音声文字起こし（5 分 24 秒）",
    metadata: { duration_sec: 324, model: "whisper-1", cost_usd: 0.032 } },
  { id: "ev-036", category: "audit", action: "delete", target: "wiki_pages/wp-deprecated",
    actor: "高橋 真由", actor_role: "hr_admin", occurred_at: hr(72), severity: "destructive",
    summary: "古い社内 Wiki 5 ページをアーカイブ", metadata: { archived_count: 5 } },
  { id: "ev-037", category: "ai", action: "agent_run", target: "ai_usage_log/agent.data_quality_check",
    actor: "system", actor_role: "system", occurred_at: hr(74), severity: "info",
    summary: "AI エージェント：データ品質チェック（夜間 cron）",
    metadata: { issues_found: 3, auto_fixed: 2 } },
  { id: "ev-038", category: "user", action: "login", target: "/auth/callback",
    actor: "Park Jihye", actor_role: "employee", occurred_at: hr(96), severity: "info",
    summary: "Google SSO でログイン（韓国オフィス）", metadata: { provider: "google", country: "KR" } },
  { id: "ev-039", category: "audit", action: "update", target: "salary_band/S5",
    actor: "鎌田 彩", actor_role: "hr_admin", occurred_at: hr(120), severity: "destructive",
    summary: "給与帯 S5 のレンジ更新（年次見直し）",
    metadata: { diff: { range_min: [12_000_000, 12_500_000], range_max: [16_000_000, 17_000_000] } } },
  { id: "ev-040", category: "ai", action: "generate", target: "ai_usage_log/recruiting-summary",
    actor: "塚本 真純", actor_role: "hr_admin", occurred_at: hr(144), severity: "info",
    summary: "候補者バッチ評価（28 名）", metadata: { batch_size: 28, total_cost_usd: 0.342 } },
];

export const CATEGORY_META: Record<ActivityCategory, { label: string; emoji: string; cls: string }> = {
  audit: { label: "監査", emoji: "📋", cls: "border-blue-200 bg-blue-50 text-blue-900" },
  ai:    { label: "AI",   emoji: "🤖", cls: "border-violet-200 bg-violet-50 text-violet-900" },
  user:  { label: "操作", emoji: "👤", cls: "border-emerald-200 bg-emerald-50 text-emerald-900" },
};

export const SEVERITY_META: Record<ActivitySeverity, { label: string; cls: string }> = {
  info:        { label: "情報", cls: "text-muted-foreground" },
  notice:      { label: "注意", cls: "text-blue-700" },
  warn:        { label: "警告", cls: "text-amber-700" },
  destructive: { label: "破壊的", cls: "text-red-700 font-bold" },
};
