-- ──────────────────────────────────────────────────────────────────
-- AI 利用ログ（Phase 5）
--
-- 各 AI 呼び出しの input/output トークン数と use case を記録。
-- /admin/ai-usage で集計表示するためのデータ源。
-- ──────────────────────────────────────────────────────────────────

create table if not exists ai_usage_log (
  id              uuid        primary key default gen_random_uuid(),
  use_case        text        not null,    -- 'recruiting-summary' | 'oneonone-summary' | 'retention-narrative' | 'dashboard-narrative'
  model           text        not null default 'claude-sonnet-4-5',
  input_tokens    integer     not null default 0,
  output_tokens   integer     not null default 0,
  user_id         uuid        references auth.users(id) on delete set null,
  status          text        not null check (status in ('ok', 'error')),
  error_message   text,
  duration_ms     integer,
  created_at      timestamptz not null default now()
);

create index if not exists ai_usage_log_created_idx
  on ai_usage_log (created_at desc);
create index if not exists ai_usage_log_use_case_idx
  on ai_usage_log (use_case, created_at desc);

-- RLS：HR 管理者のみ閲覧可。書き込みはサーバ側 service_role が直接行う想定。
alter table ai_usage_log enable row level security;

create policy ai_usage_log_admin_select on ai_usage_log
  for select using (has_role('hr_admin'));

comment on table ai_usage_log is
  'AI Copilot の利用履歴。input/output トークンとレイテンシを記録、コスト計算に使用。';
