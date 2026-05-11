-- ──────────────────────────────────────────────
-- Green Carbon HR Tools v2 — 初期スキーマ
-- 設計方針:
--  * 単一テナント（社内専用）。ただし将来のSaaS化に備え organization_id を持たせ拡張余地を残す
--  * Row Level Security (RLS) を全テーブル必須
--  * RBAC: hr_admin / manager / employee / executive
--  * 全テーブルに created_at / updated_at / deleted_at（論理削除）
--  * 機密データ（給与・健康診断など）は専用ロールのみ参照
-- ──────────────────────────────────────────────

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ───── 列挙型 ──────────────────────────────────
create type employment_type as enum ('full_time', 'part_time', 'contract', 'intern', 'business_partner');
create type employment_status as enum ('active', 'on_leave', 'resigned', 'pre_join');
create type user_role as enum ('hr_admin', 'manager', 'employee', 'executive', 'readonly');
create type review_grade as enum ('S', 'A', 'B', 'C', 'D');
create type leave_kind as enum ('annual', 'sick', 'special', 'maternity', 'paternity', 'condolence', 'other');
create type leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type one_on_one_mood as enum ('great', 'good', 'ok', 'down', 'bad');
create type survey_type as enum ('pulse', 'engagement', 'onboarding', 'exit');
create type risk_level as enum ('low', 'medium', 'high', 'critical');

-- ───── 組織 ────────────────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  locale text not null default 'ja',
  created_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  parent_id uuid references departments(id) on delete set null,
  name text not null,
  code text,
  display_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

-- ───── 社員 ────────────────────────────────────
create table employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  auth_user_id uuid unique,                   -- supabase auth.users.id
  employee_code text not null,
  email text not null,
  full_name text not null,
  full_name_kana text,
  preferred_name text,                        -- 通称（外国籍社員等）
  display_name_en text,
  avatar_url text,

  department_id uuid references departments(id) on delete set null,
  manager_id uuid references employees(id) on delete set null,
  job_title text,
  job_grade text,

  employment_type employment_type not null default 'full_time',
  status employment_status not null default 'active',

  hire_date date,
  resign_date date,
  birth_date date,
  nationality text,
  is_foreign_national boolean generated always as (nationality is not null and nationality <> 'JP') stored,

  phone text,
  emergency_contact jsonb,
  address jsonb,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  unique (organization_id, employee_code),
  unique (organization_id, email)
);

create index employees_full_name_trgm on employees using gin (full_name gin_trgm_ops);
create index employees_dept on employees(department_id);
create index employees_manager on employees(manager_id);
create index employees_status on employees(status) where deleted_at is null;

-- ───── ロール ──────────────────────────────────
create table employee_roles (
  employee_id uuid not null references employees(id) on delete cascade,
  role user_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references employees(id),
  primary key (employee_id, role)
);

-- ───── 在留資格 ────────────────────────────────
create table visa_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id) on delete cascade,
  visa_status text not null,                  -- 例: 技術・人文知識・国際業務
  card_number text,
  issued_at date,
  expires_at date not null,
  notes text,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visa_expires_idx on visa_records(expires_at);

-- ───── 1on1 ───────────────────────────────────
create table one_on_ones (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references employees(id) on delete cascade,
  member_id uuid not null references employees(id) on delete cascade,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  duration_minutes int,
  agenda text,
  notes text,                                 -- マネージャー視点
  member_notes text,                          -- メンバー視点（任意）
  mood one_on_one_mood,
  topics text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index one_on_ones_member_idx on one_on_ones(member_id, scheduled_at desc);
create index one_on_ones_manager_idx on one_on_ones(manager_id, scheduled_at desc);

create table action_items (
  id uuid primary key default gen_random_uuid(),
  one_on_one_id uuid references one_on_ones(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  assignee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───── 評価・OKR ──────────────────────────────
create table review_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references review_cycles(id) on delete cascade,
  owner_id uuid not null references employees(id) on delete cascade,
  parent_goal_id uuid references goals(id) on delete set null,
  level text not null check (level in ('company', 'department', 'individual')),
  title text not null,
  description text,
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  weight numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table key_results (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  title text not null,
  target numeric,
  actual numeric,
  unit text,
  progress numeric(5,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references review_cycles(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  reviewer_id uuid references employees(id),
  self_rating review_grade,
  manager_rating review_grade,
  final_rating review_grade,
  self_comment text,
  manager_comment text,
  calibrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, employee_id)
);

-- ───── サーベイ ────────────────────────────────
create table surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type survey_type not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  questions jsonb not null,                   -- [{id, text, kind: 'scale'|'text'|'select', options?}]
  is_anonymous boolean not null default true,
  created_by uuid references employees(id),
  created_at timestamptz not null default now()
);

create table survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  respondent_id uuid references employees(id) on delete set null,  -- anonymous の場合 null
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

-- ───── オンボーディング ────────────────────────
create table onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phases jsonb not null                        -- [{phase, day_offset, tasks: [...]}]
);

create table onboarding_runs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  template_id uuid references onboarding_templates(id),
  buddy_id uuid references employees(id),
  status text not null default 'in_progress',
  task_state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ───── オフボーディング・アルムナイ ───────────
create table offboarding_runs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id) on delete cascade,
  resignation_announced_at timestamptz,
  last_working_day date,
  reason text,
  handover_status jsonb default '{}'::jsonb,
  exit_interview_completed boolean default false,
  alumni_consent boolean default false,
  created_at timestamptz not null default now()
);

create table alumni (
  id uuid primary key default gen_random_uuid(),
  former_employee_id uuid unique references employees(id) on delete set null,
  full_name text not null,
  email text,
  current_company text,
  current_role text,
  linkedin_url text,
  referral_score int,
  notes text,
  last_contact_at date,
  created_at timestamptz not null default now()
);

-- ───── 勤怠・休暇 ─────────────────────────────
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  work_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  break_minutes int default 0,
  overtime_minutes int default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  kind leave_kind not null,
  starts_on date not null,
  ends_on date not null,
  days numeric(4,1) not null,
  reason text,
  status leave_status not null default 'pending',
  approver_id uuid references employees(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───── 給与 ────────────────────────────────────
create table salary_bands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  job_grade text not null,
  min_amount numeric(12,0) not null,
  mid_amount numeric(12,0) not null,
  max_amount numeric(12,0) not null,
  currency text not null default 'JPY',
  effective_from date not null,
  unique (organization_id, job_grade, effective_from)
);

create table compensation_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  effective_from date not null,
  base_salary numeric(12,0) not null,
  variable_pay numeric(12,0),
  currency text not null default 'JPY',
  reason text,
  created_at timestamptz not null default now()
);

-- ───── リテンション ────────────────────────────
create table retention_scores (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  computed_at timestamptz not null default now(),
  score numeric(5,2) not null,                -- 0-100
  level risk_level not null,
  factors jsonb not null,                     -- {comp:0.3, manager:0.5, ...}
  recommendation text
);
create index retention_latest on retention_scores(employee_id, computed_at desc);

-- ───── 表彰 ────────────────────────────────────
create table value_awards (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references employees(id) on delete cascade,
  nominator_id uuid not null references employees(id) on delete cascade,
  value_tag text not null,                    -- Challenge / Co-Creation / ...
  message text not null,
  awarded_at timestamptz not null default now()
);

-- ───── 健診 ────────────────────────────────────
create table health_checks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  checked_at date,
  result review_grade,
  followup_required boolean default false,
  notes text,
  clinic text,
  created_at timestamptz not null default now()
);

-- ───── スキル・研修 ────────────────────────────
create table skills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category text not null,
  name text not null,
  unique (organization_id, name)
);

create table employee_skills (
  employee_id uuid not null references employees(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  level int not null check (level between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (employee_id, skill_id)
);

create table trainings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity int
);

create table training_attendances (
  training_id uuid not null references trainings(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  status text not null default 'invited',
  completed_at timestamptz,
  primary key (training_id, employee_id)
);

-- ───── 採用 ────────────────────────────────────
create table positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  department_id uuid references departments(id),
  description text,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid references positions(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  source text,                                -- referral / linkedin / wantedly / ...
  stage text not null default 'applied',      -- applied / screening / interview / offer / hired / rejected
  resume_url text,
  notes text,
  rating int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table candidate_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  kind text not null,                         -- stage_change / interview_done / note ...
  payload jsonb not null,
  created_by uuid references employees(id),
  created_at timestamptz not null default now()
);

-- ───── 監査ログ ────────────────────────────────
create table audit_logs (
  id bigserial primary key,
  organization_id uuid references organizations(id) on delete cascade,
  actor_id uuid references employees(id) on delete set null,
  action text not null,                       -- create / update / delete / view
  resource_type text not null,
  resource_id text,
  diff jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on audit_logs(actor_id, created_at desc);
create index audit_logs_resource_idx on audit_logs(resource_type, resource_id);

-- ───── 通知 ────────────────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references employees(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on notifications(recipient_id, created_at desc) where read_at is null;

-- ───── updated_at 自動更新 ─────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where column_name = 'updated_at' and table_schema = 'public'
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on %I
        for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- ───── RLS 有効化 ──────────────────────────────
alter table employees enable row level security;
alter table departments enable row level security;
alter table employee_roles enable row level security;
alter table visa_records enable row level security;
alter table one_on_ones enable row level security;
alter table action_items enable row level security;
alter table goals enable row level security;
alter table key_results enable row level security;
alter table reviews enable row level security;
alter table surveys enable row level security;
alter table survey_responses enable row level security;
alter table onboarding_runs enable row level security;
alter table offboarding_runs enable row level security;
alter table alumni enable row level security;
alter table attendance_records enable row level security;
alter table leave_requests enable row level security;
alter table salary_bands enable row level security;
alter table compensation_history enable row level security;
alter table retention_scores enable row level security;
alter table value_awards enable row level security;
alter table health_checks enable row level security;
alter table employee_skills enable row level security;
alter table trainings enable row level security;
alter table training_attendances enable row level security;
alter table candidates enable row level security;
alter table candidate_events enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;

-- 認証中ユーザーの employees レコードを返すヘルパー
create or replace function current_employee() returns employees
language sql stable security definer as $$
  select * from employees where auth_user_id = auth.uid() limit 1;
$$;

create or replace function has_role(target_role user_role) returns boolean
language sql stable security definer as $$
  select exists(
    select 1 from employee_roles er
    join employees e on e.id = er.employee_id
    where e.auth_user_id = auth.uid() and er.role = target_role
  );
$$;

-- ───── 代表的なポリシー（残りは追加マイグレーションで拡張） ─────
-- 全社員: 自分自身と同じ組織のメンバー基本情報を閲覧可
create policy employees_select on employees for select using (
  organization_id = (select organization_id from current_employee())
);
create policy employees_self_update on employees for update using (
  auth_user_id = auth.uid()
) with check (auth_user_id = auth.uid());
create policy employees_admin_all on employees for all using (
  has_role('hr_admin')
) with check (has_role('hr_admin'));

-- 1on1: 関係者のみ
create policy oneonones_select on one_on_ones for select using (
  manager_id = (select id from current_employee())
  or member_id = (select id from current_employee())
  or has_role('hr_admin')
);
create policy oneonones_modify on one_on_ones for all using (
  manager_id = (select id from current_employee()) or has_role('hr_admin')
) with check (
  manager_id = (select id from current_employee()) or has_role('hr_admin')
);

-- 給与: HR管理者と本人のみ
create policy comp_self on compensation_history for select using (
  employee_id = (select id from current_employee()) or has_role('hr_admin')
);
create policy comp_admin on compensation_history for all using (
  has_role('hr_admin')
) with check (has_role('hr_admin'));

-- 監査ログ: HR管理者のみ参照可、書き込みはサーバ側のサービスロールから
create policy audit_admin on audit_logs for select using (has_role('hr_admin'));

-- 通知: 受信者のみ
create policy notif_self on notifications for all using (
  recipient_id = (select id from current_employee())
) with check (
  recipient_id = (select id from current_employee())
);
