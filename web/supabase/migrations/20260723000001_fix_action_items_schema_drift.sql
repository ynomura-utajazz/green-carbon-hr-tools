-- ──────────────────────────────────────────────────────────────────
-- 1on1 スキーマ収束（自己完結・冪等・データ保持）
--
-- 背景（重要）:
--   20260518000002_oneonones_tables.sql は「壊れたマイグレーション」。
--   initial_schema(20260508000001) が必ず先に action_items(旧: employee_id,
--   organization_id なし) を作るため、20260518000002 の
--     create table if not exists action_items (...)   ← どの環境でも no-op
--   となり、その直後の
--     create index ... on action_items(member_id)      ← 42703 で必ず失敗
--   でマイグレーション全体がロールバックする。結果として oneonones(新) すら
--   作られず、app の 1on1 ページのクエリが 42703 / 42P01 で失敗し、
--   （page.tsx が error を握りつぶすため）1on1・アクション項目が常に空になる。
--
-- 本ファイルの役割:
--   20260518000002 + 20260518000003 が「意図した最終形」へ、現状が
--   どの状態（oneonones 無し / action_items 旧スキーマ など）でも 1 回で収束させる。
--   全操作を冪等・データ保持で構成。Supabase SQL Editor 直貼りでも、
--   マイグレーションランナー経由でも安全に実行できる。
--
-- 注意:
--   - 適用前に本番の実スキーマ（information_schema）を確認しておくこと。
--   - `db push` を使う場合、未修正の 20260518000002 が先に走ると失敗するため、
--     20260518000002 側の是正 or schema_migrations 整合が別途必要
--     （運用方針は診断結果を見て確定）。手動 SQL Editor 実行はその制約なし。
-- ──────────────────────────────────────────────────────────────────

-- ───── 0) enum: oneonone_mood ─────
do $$ begin
  create type oneonone_mood as enum ('great', 'good', 'ok', 'down', 'bad');
exception when duplicate_object then null;
end $$;

-- ───── 1) oneonones(新) を保証（20260518000002 + 20260518000003 相当・冪等）─────
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
  calendar_event_id text,
  meet_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_id <> manager_id)
);

-- 20260518000003: AI サマリ列
alter table oneonones add column if not exists ai_summary text;

create index if not exists oneonones_manager_idx   on oneonones(manager_id);
create index if not exists oneonones_member_idx    on oneonones(member_id);
create index if not exists oneonones_scheduled_idx on oneonones(scheduled_at desc);
create index if not exists oneonones_completed_idx on oneonones(completed_at desc) where completed_at is not null;

alter table oneonones enable row level security;

drop policy if exists oneonones_select on oneonones;
create policy oneonones_select on oneonones
  for select using (
    manager_id = (select id from current_employee())
    or member_id = (select id from current_employee())
    or has_role('hr_admin')
  );

drop policy if exists oneonones_modify on oneonones;
create policy oneonones_modify on oneonones
  for all using (
    manager_id = (select id from current_employee())
    or has_role('hr_admin')
  ) with check (
    manager_id = (select id from current_employee())
    or has_role('hr_admin')
  );

-- ───── 2) action_items を最終形へ収束 ─────
do $$
begin
  if to_regclass('public.action_items') is null then
    -- 全く存在しない場合は目標スキーマで新規作成
    create table action_items (
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
    raise notice 'action_items を目標スキーマで新規作成しました。';
  else
    -- 既存（ドリフト）テーブルを収束

    -- 2-1) employee_id → member_id リネーム（FK・NOT NULL は保持される）
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='action_items' and column_name='employee_id')
       and not exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='action_items' and column_name='member_id')
    then
      alter table action_items rename column employee_id to member_id;
      raise notice 'action_items.employee_id を member_id にリネームしました。';
    end if;

    -- 2-2) それでも member_id が無ければ追加（employee_id も無い異常系）
    if not exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='action_items' and column_name='member_id')
    then
      alter table action_items add column member_id uuid references employees(id) on delete cascade;
      raise notice 'action_items.member_id を新規追加しました（要 backfill 確認）。';
    end if;

    -- 2-3) organization_id 追加（nullable → backfill → not null）
    if not exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='action_items' and column_name='organization_id')
    then
      alter table action_items add column organization_id uuid references organizations(id) on delete cascade;
      update action_items ai set organization_id = e.organization_id
        from employees e where e.id = ai.member_id and ai.organization_id is null;
      update action_items ai set organization_id = o.organization_id
        from oneonones o where o.id = ai.one_on_one_id and ai.organization_id is null;
      if not exists (select 1 from action_items where organization_id is null) then
        alter table action_items alter column organization_id set not null;
        raise notice 'action_items.organization_id を追加し not null 化しました。';
      else
        raise notice 'organization_id を補完できない行が残存。手動確認が必要なため not null 化はスキップ。';
      end if;
    end if;

    -- 2-4) updated_at 追加
    if not exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='action_items' and column_name='updated_at')
    then
      alter table action_items add column updated_at timestamptz not null default now();
      raise notice 'action_items.updated_at を追加しました。';
    end if;

    -- 2-5) member_id を not null 化（全行揃っていれば）
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='action_items'
                 and column_name='member_id' and is_nullable='YES')
       and not exists (select 1 from action_items where member_id is null)
    then
      alter table action_items alter column member_id set not null;
      raise notice 'action_items.member_id を not null 化しました。';
    end if;
  end if;
end $$;

-- 2-6) one_on_one_id の FK を oneonones へ張り替え（旧 one_on_ones 参照の解消）
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where rel.relname = 'action_items'
      and rel.relnamespace = 'public'::regnamespace
      and con.contype = 'f'
      and att.attname = 'one_on_one_id'
  loop
    execute format('alter table action_items drop constraint %I', c.conname);
    raise notice 'FK % を drop しました（one_on_one_id）。', c.conname;
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.action_items'::regclass
      and conname = 'action_items_one_on_one_id_fkey'
  ) then
    alter table action_items
      add constraint action_items_one_on_one_id_fkey
      foreign key (one_on_one_id) references oneonones(id) on delete set null;
    raise notice 'one_on_one_id の FK を oneonones(id) に張り替えました。';
  end if;
end $$;

-- 2-7) インデックス（member_id 確定後に安全に作成）
create index if not exists action_items_one_on_one_idx on action_items(one_on_one_id);
create index if not exists action_items_assignee_idx   on action_items(assignee_id);
create index if not exists action_items_member_idx     on action_items(member_id);
create index if not exists action_items_due_idx        on action_items(due_date) where completed_at is null;

-- 2-8) RLS ポリシー（20260518000002 と同一。member_id 参照が通るようになる）
alter table action_items enable row level security;

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

comment on table oneonones    is '1on1 セッション (Phase B)';
comment on table action_items is '1on1 から派生するアクション項目 (Phase B)';
