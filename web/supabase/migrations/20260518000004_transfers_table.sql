-- ──────────────────────────────────────────────────────────────────
-- 異動辞令 (transfers) テーブル
--
-- 社員の組織変更（部署異動・上司変更・昇格・降格・役職変更）を
-- 履歴として記録 + 発令日到達時に employees レコードへ自動適用。
-- ──────────────────────────────────────────────────────────────────

do $$ begin
  create type transfer_type as enum (
    'promotion',     -- 昇格・昇進
    'demotion',      -- 降格
    'lateral',       -- 横移動（部署変更）
    'role_change',   -- 役職変更
    'manager_change',-- 上司変更
    'grade_change'   -- グレード変更
  );
exception when duplicate_object then null;
end $$;

create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  transfer_type transfer_type not null,

  effective_date date not null,            -- 発令日（この日から適用）
  is_applied boolean not null default false, -- employees に適用済みか

  -- 変更前の状態（記録のため）
  from_department_id uuid references departments(id) on delete set null,
  from_manager_id uuid references employees(id) on delete set null,
  from_job_title text,
  from_job_grade text,

  -- 変更後の状態
  to_department_id uuid references departments(id) on delete set null,
  to_manager_id uuid references employees(id) on delete set null,
  to_job_title text,
  to_job_grade text,

  reason text,                              -- 異動理由
  created_by uuid references employees(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (employee_id <> to_manager_id),     -- 自分自身を上司にできない
  check (employee_id <> from_manager_id)
);

create index if not exists transfers_employee_idx on transfers(employee_id);
create index if not exists transfers_effective_idx on transfers(effective_date desc);
create index if not exists transfers_pending_idx on transfers(effective_date)
  where is_applied = false;
create index if not exists transfers_org_idx on transfers(organization_id);

alter table transfers enable row level security;

-- RLS: 同組織のメンバーは閲覧可。HR 管理者のみ作成/更新/削除可
drop policy if exists transfers_select on transfers;
create policy transfers_select on transfers
  for select using (
    organization_id = (select organization_id from current_employee())
  );

drop policy if exists transfers_modify on transfers;
create policy transfers_modify on transfers
  for all using (has_role('hr_admin'))
  with check (has_role('hr_admin'));

-- ───── 適用関数 ─────
-- 異動辞令を employees に反映するヘルパー
create or replace function apply_transfer(transfer_id uuid) returns void
language plpgsql security definer as $$
declare
  t transfers%rowtype;
begin
  select * into t from transfers where id = transfer_id;
  if not found then raise exception 'transfer not found'; end if;
  if t.is_applied then raise exception 'transfer already applied'; end if;

  update employees set
    department_id = coalesce(t.to_department_id, department_id),
    manager_id = case when t.to_manager_id is not null then t.to_manager_id else manager_id end,
    job_title = coalesce(t.to_job_title, job_title),
    job_grade = coalesce(t.to_job_grade, job_grade),
    updated_at = now()
  where id = t.employee_id;

  update transfers set is_applied = true, updated_at = now() where id = transfer_id;
end;
$$;

comment on table transfers is '異動辞令の履歴。発令日到達時に apply_transfer() で employees に反映。';
comment on function apply_transfer is '異動辞令を employees レコードに反映する。冪等性のため is_applied フラグでガード。';
