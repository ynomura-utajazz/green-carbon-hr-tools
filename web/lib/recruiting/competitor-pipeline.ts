/**
 * 競合 JD 収集パイプラインの型定義 + デモジョブステータス。
 *
 * 本番運用：
 *  1. cron（GitHub Actions or Vercel Cron）が日次で実行
 *  2. 各ソース（LinkedIn / Wantedly / Indeed）からスクレイピング or 公式 API で取得
 *  3. AI で構造化（job title / required_skills / comp_range）
 *  4. competitor_jds テーブルに upsert
 *  5. 新規・大変更ジョブは Slack に通知
 *
 * 法令注意：
 *  - LinkedIn 利用規約はスクレイピング禁止 → 公式 API（Talent Solutions）契約必須
 *  - Wantedly はクロールに条件あり → 連絡してパートナー API を取得推奨
 *  - Indeed は robots.txt + Indeed Publisher Program を通じた取得
 *  - 公開された求人情報の収集は競争法的にも問題なし（条件は明示・公開情報のみ）
 */

export type ScrapeSource = "linkedin" | "wantedly" | "indeed" | "company_career_page";
export type JobStatus = "idle" | "running" | "ok" | "error";

export type ScrapeJob = {
  id: string;
  source: ScrapeSource;
  /** クエリ条件（"climate tech ML engineer" 等） */
  query: string;
  /** ターゲット国・地域 */
  geo: string;
  /** スケジュール（cron） */
  schedule: string;
  /** 最終実行日時 */
  last_run_at?: string;
  /** 最終ステータス */
  last_status: JobStatus;
  /** 直近で取得したジョブ件数 */
  last_jobs_found: number;
  /** 取得ジョブのうち、構造化に成功した件数 */
  last_jobs_parsed: number;
  /** AI 構造化のエラー件数 */
  last_errors: number;
  /** 新規 / 変更検出（前回との差分） */
  new_jobs: number;
  changed_jobs: number;
  enabled: boolean;
  /** 次回実行予定 */
  next_run_at: string;
};

export type ScrapeRunLog = {
  id: string;
  job_id: string;
  ran_at: string;
  duration_sec: number;
  jobs_found: number;
  jobs_parsed: number;
  errors: number;
  status: JobStatus;
  error_message?: string;
};

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const hour = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

export const DEMO_SCRAPE_JOBS: ScrapeJob[] = [
  {
    id: "sj-1", source: "linkedin",
    query: "ML Engineer climate carbon",
    geo: "Japan + Singapore + India",
    schedule: "0 9 * * *", // 毎日 9:00
    last_run_at: hour(-3),
    last_status: "ok",
    last_jobs_found: 47,
    last_jobs_parsed: 45,
    last_errors: 2,
    new_jobs: 4,
    changed_jobs: 3,
    enabled: true,
    next_run_at: hour(21),
  },
  {
    id: "sj-2", source: "wantedly",
    query: "気候 + ML / 気候 + プロダクトマネージャー",
    geo: "Tokyo",
    schedule: "0 9 */2 * *", // 隔日
    last_run_at: hour(-30),
    last_status: "ok",
    last_jobs_found: 23,
    last_jobs_parsed: 22,
    last_errors: 1,
    new_jobs: 1,
    changed_jobs: 0,
    enabled: true,
    next_run_at: hour(18),
  },
  {
    id: "sj-3", source: "indeed",
    query: "ESG エンジニア / 気候政策 / カーボン",
    geo: "Japan",
    schedule: "0 9 * * MON",
    last_run_at: day(-3),
    last_status: "ok",
    last_jobs_found: 58,
    last_jobs_parsed: 55,
    last_errors: 3,
    new_jobs: 2,
    changed_jobs: 5,
    enabled: true,
    next_run_at: day(4),
  },
  {
    id: "sj-4", source: "company_career_page",
    query: "Pachama / Sylvera / Watershed / Persefoni 公式採用ページ",
    geo: "Global",
    schedule: "0 12 * * *",
    last_run_at: hour(-1),
    last_status: "error",
    last_jobs_found: 0,
    last_jobs_parsed: 0,
    last_errors: 4,
    new_jobs: 0,
    changed_jobs: 0,
    enabled: true,
    next_run_at: hour(23),
  },
  {
    id: "sj-5", source: "linkedin",
    query: "Sustainability BD ASEAN",
    geo: "Singapore + Indonesia + Vietnam",
    schedule: "0 9 * * MON,THU",
    last_run_at: day(-2),
    last_status: "ok",
    last_jobs_found: 31,
    last_jobs_parsed: 31,
    last_errors: 0,
    new_jobs: 6,
    changed_jobs: 2,
    enabled: true,
    next_run_at: day(2),
  },
];

export const DEMO_RUN_LOGS: ScrapeRunLog[] = [
  { id: "log-1", job_id: "sj-4", ran_at: hour(-1),  duration_sec: 18,  jobs_found: 0,  jobs_parsed: 0,  errors: 4, status: "error", error_message: "Pachama career page returned 403 (Cloudflare bot protection)" },
  { id: "log-2", job_id: "sj-1", ran_at: hour(-3),  duration_sec: 142, jobs_found: 47, jobs_parsed: 45, errors: 2, status: "ok" },
  { id: "log-3", job_id: "sj-2", ran_at: hour(-30), duration_sec: 87,  jobs_found: 23, jobs_parsed: 22, errors: 1, status: "ok" },
  { id: "log-4", job_id: "sj-5", ran_at: day(-2),   duration_sec: 105, jobs_found: 31, jobs_parsed: 31, errors: 0, status: "ok" },
  { id: "log-5", job_id: "sj-3", ran_at: day(-3),   duration_sec: 195, jobs_found: 58, jobs_parsed: 55, errors: 3, status: "ok" },
  { id: "log-6", job_id: "sj-1", ran_at: day(-1),   duration_sec: 155, jobs_found: 44, jobs_parsed: 43, errors: 1, status: "ok" },
];

export const SOURCE_INFO: Record<ScrapeSource, { label: string; legal: string; api_method: string }> = {
  linkedin: {
    label: "LinkedIn",
    legal: "公式 Talent Solutions API 必須。スクレイピング禁止。",
    api_method: "Talent Solutions REST API（年間 $5,000+）",
  },
  wantedly: {
    label: "Wantedly",
    legal: "公開求人のクロールは技術的に可だが、利用規約要確認。",
    api_method: "公式 API パートナー登録 推奨",
  },
  indeed: {
    label: "Indeed",
    legal: "Indeed Publisher Program / XML フィード経由が公式。",
    api_method: "Indeed Publisher Program",
  },
  company_career_page: {
    label: "企業 career ページ",
    legal: "公開ページの取得は問題なし。robots.txt は尊重。",
    api_method: "Playwright + AI 構造化抽出（自前）",
  },
};
