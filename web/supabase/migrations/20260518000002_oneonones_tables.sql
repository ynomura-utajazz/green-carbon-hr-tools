-- ──────────────────────────────────────────────────────────────────
-- 1on1 セッション + アクション項目テーブル
--
-- Phase B 後半。これまで demo データのみだった 1on1 機能を実データ化。
-- ──────────────────────────────────────────────────────────────────

-- 1on1 気分の列挙型
do $$ begin
  create type oneonone_mood as enum ('great', 'good', 'ok', 'down', 'bad');
exception when duplicate_object then null;
end $$;

-- 1on1 セッション
create table if not exists oneonones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  manager_id uuid not null references employees(id) on delete cascade,
  member_id uuid not null references employees(id) on delete cascade,

  scheduled_at timestamptz not null,
  completed_at timestamptz,
  duration_minutes int not null default 30,
  mood oneonone_mood,
  agenda text,
  notes text,
  topics text[] not null default '{}',

  -- Google Calendar 連携
  calendar_event_id text,
  meet_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (member_id <> manager_id)
);

create index if not exists oneonones_manager_idx on oneonones(manager_id);
create index if not exists oneonones_member_idx on oneonones(member_id);
create index if not exists oneonones_scheduled_idx on oneonones(scheduled_at desc);
create index if not exists oneonones_completed_idx on oneonones(completed_at desc) where completed_at is not null;

alter table oneonones enable row level security;

-- アクション項目
create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  one_on_one_id uuid references oneonones(id) on delete set null,
  member_id uuid not null references employees(id) on delete cascade,
  assignee_id uuid not null references employees(id) on delete cascade,

  title text not null,
  description text,
  due_date date,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists action_items_one_on_one_idx on action_items(one_on_one_id);
create index if not exists action_items_assignee_idx on action_items(assignee_id);
create index if not exists action_items_member_idx on action_items(member_id);
create index if not exists action_items_due_idx on action_items(due_date)
  where completed_at is null;

alter table action_items enable row level security;

-- ───── RLS ポリシー ─────
-- oneonones: 当事者（manager / member）と hr_admin のみ参照可
drop policy if exists oneonones_select on oneonones;
create policy oneonones_select on oneonones
  for select using (
    manager_id = (select id from current_employee())
    or member_id = (select id from current_employee())
    or has_role('hr_admin')
  );

-- oneonones: 当事者か hr_admin のみ作成/更新/削除可
drop policy if exists oneonones_modify on oneonones;
create policy oneonones_modify on oneonones
  for all using (
    manager_id = (select id from current_employee())
    or has_role('hr_admin')
  ) with check (
    manager_id = (select id from current_employee())
    or has_role('hr_admin')
  );

-- action_items: 自分が assignee, member, または 親 1on1 の manager か hr_admin
drop policy if exists action_items_select on action_items;
create policy action_items_select on action_items
  for select using (
    assignee_id = (select id from current_employee())
    or member_id = (select id from current_employee())
    or has_role('hr_admin')
    or exists (
      select 1 from oneonones o
      where o.id = action_items.one_on_one_id
        and o.manager_id = (select id from current_employee())
    )
  );

drop policy if exists action_items_modify on action_items;
create policy action_items_modify on action_items
  for all using (
    has_role('hr_admin')
    or exists (
      select 1 from oneonones o
      where o.id = action_items.one_on_one_id
        and o.manager_id = (select id from current_employee())
    )
  ) with check (
    has_role('hr_admin')
    or exists (
      select 1 from oneonones o
      where o.id = action_items.one_on_one_id
        and o.manager_id = (select id from current_employee())
    )
  );

comment on table oneonones is '1on1 セッション (Phase B)';
comment on table action_items is '1on1 から派生するアクション項目 (Phase B)';
