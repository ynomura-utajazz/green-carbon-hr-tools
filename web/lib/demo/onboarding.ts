/**
 * オンボーディングのデモデータ。
 * テンプレート（フェーズ + タスク）と実行中の進行データを分離。
 *
 * フェーズ: pre_arrival → day_1 → week_1 → month_1 → month_3
 */

export type OnboardingPhase = "pre_arrival" | "day_1" | "week_1" | "month_1" | "month_3";

export const PHASE_ORDER: OnboardingPhase[] = ["pre_arrival", "day_1", "week_1", "month_1", "month_3"];

export const PHASE_LABEL: Record<OnboardingPhase, string> = {
  pre_arrival: "入社前",
  day_1: "Day 1",
  week_1: "Week 1",
  month_1: "1ヶ月目",
  month_3: "3ヶ月目",
};

export const PHASE_OFFSET_DAYS: Record<OnboardingPhase, { start: number; end: number }> = {
  pre_arrival: { start: -14, end: 0 },
  day_1:       { start: 0,   end: 0 },
  week_1:      { start: 1,   end: 7 },
  month_1:     { start: 8,   end: 30 },
  month_3:     { start: 31,  end: 90 },
};

export type TaskOwner = "hr" | "manager" | "buddy" | "it" | "facilities" | "self" | "exec";

export const OWNER_LABEL: Record<TaskOwner, string> = {
  hr: "HR",
  manager: "マネージャー",
  buddy: "バディ",
  it: "IT/情シス",
  facilities: "総務",
  self: "本人",
  exec: "経営",
};

export const OWNER_COLOR: Record<TaskOwner, string> = {
  hr: "border-purple-200 bg-purple-50 text-purple-800",
  manager: "border-blue-200 bg-blue-50 text-blue-800",
  buddy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  it: "border-orange-200 bg-orange-50 text-orange-800",
  facilities: "border-amber-200 bg-amber-50 text-amber-800",
  self: "border-gc-200 bg-gc-50 text-gc-800",
  exec: "border-pink-200 bg-pink-50 text-pink-800",
};

export type TaskTemplate = {
  id: string;
  phase: OnboardingPhase;
  title: string;
  description?: string;
  owner: TaskOwner;
  default_offset_days: number;          // 入社日からの日数
  estimated_minutes?: number;
  triggers_calendar?: boolean;          // カレンダー予定生成対象
  triggers_slack?: boolean;             // Slack告知対象
};

export type OnboardingTemplate = {
  id: string;
  name: string;
  description: string;
  applicable_to: ("engineer" | "designer" | "business" | "intern" | "all")[];
  tasks: TaskTemplate[];
};

// ─── デフォルトテンプレート ────────────
const DEFAULT_TASKS: TaskTemplate[] = [
  // 入社前
  { id: "t-pre-1", phase: "pre_arrival", title: "雇用契約書の発行・締結", owner: "hr", default_offset_days: -14 },
  { id: "t-pre-2", phase: "pre_arrival", title: "メールアドレス・Google Workspace アカウント発行", owner: "it", default_offset_days: -7, triggers_slack: true },
  { id: "t-pre-3", phase: "pre_arrival", title: "PC・周辺機器の発注・配送", owner: "it", default_offset_days: -10 },
  { id: "t-pre-4", phase: "pre_arrival", title: "オフィスデスク・ロッカーの確保", owner: "facilities", default_offset_days: -5 },
  { id: "t-pre-5", phase: "pre_arrival", title: "ウェルカムメール送付（入社初日のご案内）", owner: "hr", default_offset_days: -3 },
  { id: "t-pre-6", phase: "pre_arrival", title: "バディの選定・連絡", owner: "manager", default_offset_days: -7 },

  // Day 1
  { id: "t-d1-1", phase: "day_1", title: "オフィス到着・受付対応", owner: "hr", default_offset_days: 0, estimated_minutes: 30 },
  { id: "t-d1-2", phase: "day_1", title: "PC セットアップ + 各種ツールへのサインイン", owner: "it", default_offset_days: 0, estimated_minutes: 60 },
  { id: "t-d1-3", phase: "day_1", title: "Slack ワークスペース招待・自己紹介投稿", owner: "hr", default_offset_days: 0, triggers_slack: true, estimated_minutes: 15 },
  { id: "t-d1-4", phase: "day_1", title: "全社会・ランチ会", owner: "hr", default_offset_days: 0, triggers_calendar: true, estimated_minutes: 90 },
  { id: "t-d1-5", phase: "day_1", title: "マネージャーとの初回 1on1", owner: "manager", default_offset_days: 0, triggers_calendar: true, estimated_minutes: 30 },
  { id: "t-d1-6", phase: "day_1", title: "オフィスツアー・席案内", owner: "buddy", default_offset_days: 0, estimated_minutes: 30 },
  { id: "t-d1-7", phase: "day_1", title: "コンプライアンス研修（情報セキュリティ・ハラスメント）", owner: "hr", default_offset_days: 0, triggers_calendar: true, estimated_minutes: 60 },

  // Week 1
  { id: "t-w1-1", phase: "week_1", title: "全部門メンバーとの 30 分 1on1（10名）", owner: "buddy", default_offset_days: 5, triggers_calendar: true },
  { id: "t-w1-2", phase: "week_1", title: "プロダクト・ミッション勉強会", owner: "exec", default_offset_days: 3, triggers_calendar: true, estimated_minutes: 60 },
  { id: "t-w1-3", phase: "week_1", title: "業務システム研修（Notion/GitHub/freee 等）", owner: "it", default_offset_days: 2, estimated_minutes: 120 },
  { id: "t-w1-4", phase: "week_1", title: "30/60/90 日目標の初稿作成", owner: "self", default_offset_days: 7 },
  { id: "t-w1-5", phase: "week_1", title: "メンタリング面談（バディと）", owner: "buddy", default_offset_days: 4, triggers_calendar: true, estimated_minutes: 30 },

  // 1ヶ月目
  { id: "t-m1-1", phase: "month_1", title: "30日目フィードバック面談", owner: "manager", default_offset_days: 30, triggers_calendar: true, estimated_minutes: 60 },
  { id: "t-m1-2", phase: "month_1", title: "初プロジェクトのアサイン・キックオフ", owner: "manager", default_offset_days: 14 },
  { id: "t-m1-3", phase: "month_1", title: "OKR の正式設定（マネージャーと合意）", owner: "self", default_offset_days: 21 },
  { id: "t-m1-4", phase: "month_1", title: "オンボーディング満足度サーベイ回答", owner: "self", default_offset_days: 30 },

  // 3ヶ月目
  { id: "t-m3-1", phase: "month_3", title: "試用期間レビュー・本採用決定", owner: "hr", default_offset_days: 90 },
  { id: "t-m3-2", phase: "month_3", title: "90日目フィードバック面談", owner: "manager", default_offset_days: 90, triggers_calendar: true, estimated_minutes: 60 },
  { id: "t-m3-3", phase: "month_3", title: "Q1 OKR の振り返り", owner: "self", default_offset_days: 90 },
];

export const DEMO_TEMPLATES: OnboardingTemplate[] = [
  {
    id: "tpl-default",
    name: "標準オンボーディング",
    description: "全社共通の標準テンプレート。全 25 タスク、5 フェーズ。",
    applicable_to: ["all"],
    tasks: DEFAULT_TASKS,
  },
  {
    id: "tpl-engineer",
    name: "エンジニア向け",
    description: "標準 + 開発環境セットアップ・コードレビュー文化導入を追加",
    applicable_to: ["engineer"],
    tasks: [
      ...DEFAULT_TASKS,
      { id: "t-eng-1", phase: "day_1", title: "GitHub Org・リポジトリアクセス権付与", owner: "it", default_offset_days: 0 },
      { id: "t-eng-2", phase: "week_1", title: "開発環境セットアップ完了 + 最初の PR 提出", owner: "self", default_offset_days: 5 },
      { id: "t-eng-3", phase: "week_1", title: "テックリードとアーキテクチャレビュー", owner: "manager", default_offset_days: 6, triggers_calendar: true },
    ],
  },
];

// ─── 進行中のオンボーディング ─────────
export type TaskState = {
  task_id: string;
  status: "pending" | "in_progress" | "done" | "blocked" | "skipped";
  assignee_id: string | null;
  due_date: string;        // ISO date
  completed_at: string | null;
  notes?: string;
};

export type OnboardingRun = {
  id: string;
  employee_id: string;     // employees.ts の ID
  template_id: string;
  manager_id: string;
  buddy_id: string | null;
  start_date: string;      // 入社日
  expected_completion: string;  // 90日後
  status: "active" | "completed" | "paused";
  task_states: TaskState[];
};

const dayStr = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

function buildTaskStates(template: OnboardingTemplate, startOffset: number, completionRate: number): TaskState[] {
  return template.tasks.map((t, idx) => {
    const due = dayStr(startOffset + t.default_offset_days);
    // フェーズ進行に応じて完了状態を演出
    const _phaseProgress = PHASE_ORDER.indexOf(t.phase);
    const overallProgress = Math.floor(template.tasks.length * completionRate);
    const isDone = idx < overallProgress;
    const isPast = startOffset + t.default_offset_days < 0;

    let status: TaskState["status"] = "pending";
    let completed_at: string | null = null;
    if (isDone) {
      status = "done";
      completed_at = dayStr(startOffset + t.default_offset_days + 1);
    } else if (isPast && (idx % 7 === 0)) {
      status = "blocked";
    } else if (isPast) {
      status = "in_progress";
    }
    return {
      task_id: t.id,
      status,
      assignee_id: null,
      due_date: due,
      completed_at,
      notes: status === "blocked" ? "PC 配送遅延のため再手配中" : undefined,
    };
  });
}

export const DEMO_ONBOARDING_RUNS: OnboardingRun[] = [
  // 鈴木 健 — 1ヶ月経過、エンジニア
  {
    id: "ob-1",
    employee_id: "e13",
    template_id: "tpl-engineer",
    manager_id: "e9",
    buddy_id: "e10",
    start_date: dayStr(-37),
    expected_completion: dayStr(53),
    status: "active",
    task_states: buildTaskStates(
      DEMO_TEMPLATES.find((t) => t.id === "tpl-engineer")!,
      -37, 0.55
    ),
  },
  // Esha Grace — 入社直後、デザインインターン
  {
    id: "ob-2",
    employee_id: "e28",
    template_id: "tpl-default",
    manager_id: "e14",
    buddy_id: "e15",
    start_date: dayStr(-7),
    expected_completion: dayStr(83),
    status: "active",
    task_states: buildTaskStates(DEMO_TEMPLATES[0], -7, 0.32),
  },
  // Lee Felicia — Day 1 直前、エンジニアインターン
  {
    id: "ob-3",
    employee_id: "e29",
    template_id: "tpl-engineer",
    manager_id: "e9",
    buddy_id: "e12",
    start_date: dayStr(7),
    expected_completion: dayStr(97),
    status: "active",
    task_states: buildTaskStates(
      DEMO_TEMPLATES.find((t) => t.id === "tpl-engineer")!,
      7, 0.10
    ),
  },
  // Nguyen An — 入社1週間目、マーケ
  {
    id: "ob-4",
    employee_id: "e25",
    template_id: "tpl-default",
    manager_id: "e23",
    buddy_id: "e24",
    start_date: dayStr(-3),
    expected_completion: dayStr(87),
    status: "active",
    task_states: buildTaskStates(DEMO_TEMPLATES[0], -3, 0.20),
  },
];

export function runById(id: string): OnboardingRun | undefined {
  return DEMO_ONBOARDING_RUNS.find((r) => r.id === id);
}

export function templateById(id: string): OnboardingTemplate | undefined {
  return DEMO_TEMPLATES.find((t) => t.id === id);
}

export function progressOf(run: OnboardingRun): { done: number; total: number; pct: number } {
  const done = run.task_states.filter((s) => s.status === "done").length;
  const total = run.task_states.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function currentPhaseOf(run: OnboardingRun): OnboardingPhase {
  const startMs = new Date(run.start_date).getTime();
  const dayDiff = Math.floor((Date.now() - startMs) / 86_400_000);
  if (dayDiff < 0) return "pre_arrival";
  if (dayDiff === 0) return "day_1";
  if (dayDiff <= 7) return "week_1";
  if (dayDiff <= 30) return "month_1";
  return "month_3";
}

export function overdueTasksOf(run: OnboardingRun, _template: OnboardingTemplate): number {
  const today = new Date().toISOString().slice(0, 10);
  return run.task_states.filter(
    (s) => (s.status === "pending" || s.status === "in_progress" || s.status === "blocked")
      && s.due_date < today
  ).length;
}

export function tasksDueSoon(run: OnboardingRun): number {
  const today = new Date().toISOString().slice(0, 10);
  const inSevenDays = dayStr(7);
  return run.task_states.filter(
    (s) => s.status !== "done" && s.due_date >= today && s.due_date <= inSevenDays
  ).length;
}
