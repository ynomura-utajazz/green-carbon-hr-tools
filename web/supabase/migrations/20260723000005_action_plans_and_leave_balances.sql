-- ──────────────────────────────────────────────────────────────────
-- action_plans / leave_balances テーブル（ドラフト・要レビュー）
--
-- 背景:
--   実データ化したが「対応テーブルが無く空のまま」だった2箇所を埋める。
--   - action_plans: pulse-survey の「アクション」タブ / 未対応アクションKPI。
--     lib/demo/surveys.ts の ActionPlan 型に対応。
--   - leave_balances: attendance の「部署別 有給取得率」。付与日数(分母)が
--     どこにも無く率を算出できなかったため、付与/消化のマスタを用意する。
--
-- いずれも additive。適用後、各ページの実データ経路が拾う。
-- ──────────────────────────────────────────────────────────────────

-- ===== pulse-survey のアクションプラン =====
create table if not exists action_plans (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references surveys(id) on delete cascade,
  title text not null,
  owner_id uuid references employees(id) on delete set null,
  status text not null default 'open' check (status in ('open','in_progress','done')),
  due_date date,
  description text,
  related_dimension text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists action_plans_campaign_idx on action_plans (campaign_id);

alter table action_plans enable row level security;
drop policy if exists action_plans_select on action_plans;
create policy action_plans_select on action_plans for select using (has_role('hr_admin'));
drop policy if exists action_plans_write on action_plans;
create policy action_plans_write on action_plans for all using (has_role('hr_admin')) with check (has_role('hr_admin'));

-- ===== attendance の有給付与/消化マスタ =====
create table if not exists leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  fiscal_year int not null,                    -- 例: 2026（年度）
  granted_days numeric(4,1) not null default 0,     -- 付与日数
  used_days numeric(4,1) not null default 0,        -- 消化日数
  carried_over_days numeric(4,1) not null default 0,-- 繰越日数
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, fiscal_year)
);
create index if not exists leave_balances_emp_idx on leave_balances (employee_id);

alter table leave_balances enable row level security;
-- 有給残は本人＋hr_admin。集計（部署別取得率）は hr_admin が集約表示する。
drop policy if exists leave_balances_select on leave_balances;
create policy leave_balances_select on leave_balances for select using (
  has_role('hr_admin') or employee_id = (select id from current_employee())
);
