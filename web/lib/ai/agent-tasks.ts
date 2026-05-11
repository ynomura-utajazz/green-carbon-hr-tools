/**
 * AI エージェントのタスクテンプレート + 実行ログ。
 *
 * 想定実装：Claude Agent SDK / Computer Use API を活用し、
 * HR 業務（候補者リサーチ、スケジュール調整、ドキュメント整備）を自動実行。
 *
 * 各タスクは：
 *  1. テンプレート（system prompt + tool 定義）
 *  2. 実行履歴（ステップ単位で進捗を記録、失敗時は人にエスカレーション）
 *  3. 承認フロー（destructive な操作は HR 管理者の承認待ち）
 */

export type AgentTaskKind =
  | "candidate_research"   // 候補者の経歴・公開情報リサーチ
  | "schedule_interview"   // 面接スケジュール調整（候補者 + 面接官）
  | "compile_brief"        // 面接前ブリーフィング自動生成 + Slack 通知
  | "onboarding_kickoff"   // 入社者の Slack/Calendar/HRIS セットアップ
  | "data_quality_check";  // 名簿データの矛盾検出（重複/欠損/古い情報）

export type StepStatus = "pending" | "running" | "ok" | "error" | "awaiting_approval";

export type AgentTaskRun = {
  id: string;
  kind: AgentTaskKind;
  title: string;
  initiated_by: string;
  initiated_at: string;
  /** 全体ステータス */
  status: "queued" | "running" | "ok" | "error" | "paused";
  steps: {
    seq: number;
    description: string;
    status: StepStatus;
    started_at?: string;
    finished_at?: string;
    output_summary?: string;
    error_message?: string;
  }[];
  /** 最終アウトプットサマリ */
  result?: string;
  /** トークン消費 */
  total_tokens?: { input: number; output: number };
};

export const TASK_KIND_META: Record<AgentTaskKind, { label: string; emoji: string; description: string; estimated_min: number }> = {
  candidate_research:   { label: "候補者リサーチ",      emoji: "🔍", description: "LinkedIn/GitHub/X から公開情報を集約 → 1 ページサマリ", estimated_min: 5 },
  schedule_interview:   { label: "面接スケジュール調整", emoji: "📅", description: "Google Calendar の空き枠を見つけて候補者と面接官を調整", estimated_min: 3 },
  compile_brief:        { label: "面接ブリーフィング",   emoji: "📝", description: "候補者情報 → AI ブリーフィング生成 → Slack DM 配信",  estimated_min: 4 },
  onboarding_kickoff:   { label: "入社者セットアップ",  emoji: "🚀", description: "Slack 招待 / Calendar 1on1 設定 / HRIS マスタ登録",  estimated_min: 8 },
  data_quality_check:   { label: "名簿データ品質チェック", emoji: "🧹", description: "重複・欠損・古い情報を検出して HR にレポート",      estimated_min: 6 },
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const min = (n: number) => new Date(Date.now() + n * 60_000).toISOString();

export const DEMO_AGENT_RUNS: AgentTaskRun[] = [
  {
    id: "run-1", kind: "candidate_research", title: "Aditya Kumar（cand-x1）のリサーチ",
    initiated_by: "塚本 真純", initiated_at: min(-12),
    status: "ok",
    steps: [
      { seq: 1, description: "LinkedIn URL から公開プロフィール取得", status: "ok", started_at: min(-12), finished_at: min(-11), output_summary: "プロフィール 1.2KB を取得" },
      { seq: 2, description: "GitHub アカウント特定 + 主要 OSS リポ取得", status: "ok", started_at: min(-11), finished_at: min(-9), output_summary: "3 リポジトリ・コミット履歴を集約" },
      { seq: 3, description: "X 発信の頻度・トピック分析", status: "ok", started_at: min(-9), finished_at: min(-7), output_summary: "ML × 気候のツイート 80%" },
      { seq: 4, description: "AI でサマリ作成", status: "ok", started_at: min(-7), finished_at: min(-5), output_summary: "1 ページの候補者ブリーフ生成" },
    ],
    result: "ML エンジニア候補（インド在住）として強い適合性。Carbon 計算経験あり。X で公開発信が活発（社員アドボカシー観点でも◎）。詳細は Notion ページに保存済。",
    total_tokens: { input: 8_400, output: 1_200 },
  },
  {
    id: "run-2", kind: "schedule_interview", title: "田中 浩二 × CTO 面接の調整",
    initiated_by: "野村 裕太", initiated_at: min(-30),
    status: "ok",
    steps: [
      { seq: 1, description: "候補者と CTO の希望日程を確認", status: "ok",  started_at: min(-30), finished_at: min(-28), output_summary: "候補者: 平日 14-18 時、CTO: 5/15-5/17" },
      { seq: 2, description: "Google Calendar から両者の空き枠を交差", status: "ok", started_at: min(-28), finished_at: min(-27), output_summary: "5/16 (金) 15:00-16:00 が両者空き" },
      { seq: 3, description: "Calendar 招待を作成（Meet 付き）",  status: "ok", started_at: min(-27), finished_at: min(-26), output_summary: "招待送付済 + Slack に通知" },
    ],
    result: "5/16 (金) 15:00 で確定。候補者から確認返信あり。Slack #recruiting に通知済。",
    total_tokens: { input: 3_200, output: 800 },
  },
  {
    id: "run-3", kind: "onboarding_kickoff", title: "Wei Chen さん入社準備（5/20）",
    initiated_by: "高橋 真由", initiated_at: min(-180),
    status: "paused",
    steps: [
      { seq: 1, description: "Slack ワークスペースに招待",        status: "ok", started_at: min(-180), finished_at: min(-178), output_summary: "招待送付・@wei-chen として join" },
      { seq: 2, description: "Calendar に 30/60/90 日マイルストーン登録", status: "ok", started_at: min(-178), finished_at: min(-176), output_summary: "12 件のイベント作成" },
      { seq: 3, description: "BambooHR に社員レコード登録",       status: "awaiting_approval",
        output_summary: "給与レコード作成は HR 管理者の承認待ち（年収 ¥10,200,000）" },
      { seq: 4, description: "バディ自動マッチ + Slack 紹介",      status: "pending" },
    ],
    total_tokens: { input: 5_100, output: 2_400 },
  },
  {
    id: "run-4", kind: "data_quality_check", title: "全社員データ品質チェック（週次）",
    initiated_by: "system (cron)", initiated_at: day(-2),
    status: "ok",
    steps: [
      { seq: 1, description: "重複メールアドレス検出",       status: "ok", output_summary: "0 件" },
      { seq: 2, description: "manager_id の循環参照検出",    status: "ok", output_summary: "0 件" },
      { seq: 3, description: "BambooHR との差分検出",        status: "ok", output_summary: "3 件（部署変更）→ HR に Slack 通知" },
      { seq: 4, description: "古い slack_user_id 検出",       status: "ok", output_summary: "2 件のスタブを削除" },
    ],
    result: "1 件のデータ不整合を自動修正、3 件を HR にエスカレーション。",
    total_tokens: { input: 2_800, output: 600 },
  },
  {
    id: "run-5", kind: "compile_brief", title: "今週の面接ブリーフィング自動配信",
    initiated_by: "system (cron)", initiated_at: day(-1),
    status: "error",
    steps: [
      { seq: 1, description: "今週の面接予定 3 件を Calendar から取得", status: "ok", output_summary: "3 件（火・水・金）" },
      { seq: 2, description: "各候補者のブリーフィングを AI 生成",        status: "ok", output_summary: "3 件生成完了" },
      { seq: 3, description: "面接官に Slack DM で配信",                  status: "error",
        error_message: "Slack rate limit に達した（1/3 のみ送信成功）" },
    ],
    total_tokens: { input: 4_500, output: 3_200 },
  },
];

export const STATUS_META: Record<AgentTaskRun["status"], { label: string; cls: string }> = {
  queued:  { label: "待機中",     cls: "bg-muted text-muted-foreground" },
  running: { label: "実行中",     cls: "bg-blue-100 text-blue-800" },
  ok:      { label: "成功",       cls: "bg-emerald-100 text-emerald-800" },
  error:   { label: "失敗",       cls: "bg-red-100 text-red-800" },
  paused:  { label: "承認待ち",   cls: "bg-amber-100 text-amber-800" },
};

// ── Pure helpers（UI から切り出し、テスト可能） ─────────

export type AgentRunSummary = {
  total: number;
  byStatus: Record<AgentTaskRun["status"], number>;
  /** awaiting_approval ステップを 1 つでも持つ run の数 */
  pendingApproval: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  /** 成功率 = ok / (ok + error)。実行中・承認待ちは分母から除外 */
  successRate: number;
};

export function summarizeRuns(runs: AgentTaskRun[]): AgentRunSummary {
  const byStatus: AgentRunSummary["byStatus"] = { queued: 0, running: 0, ok: 0, error: 0, paused: 0 };
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let pendingApproval = 0;
  for (const r of runs) {
    byStatus[r.status]++;
    totalInputTokens  += r.total_tokens?.input  ?? 0;
    totalOutputTokens += r.total_tokens?.output ?? 0;
    if (r.steps.some((s) => s.status === "awaiting_approval")) pendingApproval++;
  }
  const decided = byStatus.ok + byStatus.error;
  const successRate = decided > 0 ? byStatus.ok / decided : 0;
  return { total: runs.length, byStatus, pendingApproval, totalInputTokens, totalOutputTokens, successRate };
}

/** 1 ステップ承認 → status を ok に倒し、必要なら親 run の status も running に戻す */
export function approveStep(run: AgentTaskRun, seq: number, now: Date = new Date()): AgentTaskRun {
  const steps = run.steps.map((s) =>
    s.seq === seq && s.status === "awaiting_approval"
      ? { ...s, status: "ok" as StepStatus, finished_at: now.toISOString() }
      : s,
  );
  const stillBlocked = steps.some((s) => s.status === "awaiting_approval");
  return {
    ...run,
    steps,
    status: stillBlocked ? "paused" : run.status === "paused" ? "running" : run.status,
  };
}
