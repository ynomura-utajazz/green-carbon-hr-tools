-- ──────────────────────────────────────────────────────────────────
-- departments / employee_roles の RLS ポリシー追加
--
-- 初期スキーマで enable row level security したが policy 未定義だったテーブルへ
-- アクセス権を付与する。
-- ──────────────────────────────────────────────────────────────────

-- ───── departments ─────
-- SELECT: 同じ組織のメンバーは閲覧可
drop policy if exists departments_select on departments;
create policy departments_select on departments
  for select using (
    organization_id = (select organization_id from current_employee())
  );

-- INSERT/UPDATE/DELETE: HR 管理者のみ
drop policy if exists departments_admin on departments;
create policy departments_admin on departments
  for all using (
    has_role('hr_admin')
  ) with check (
    has_role('hr_admin')
  );

-- ───── employee_roles ─────
-- SELECT: 本人は自分のロール参照可、HR 管理者は全員参照可
drop policy if exists employee_roles_self_select on employee_roles;
create policy employee_roles_self_select on employee_roles
  for select using (
    employee_id = (select id from current_employee())
    or has_role('hr_admin')
  );

-- INSERT/UPDATE/DELETE: HR 管理者のみ
drop policy if exists employee_roles_admin on employee_roles;
create policy employee_roles_admin on employee_roles
  for all using (
    has_role('hr_admin')
  ) with check (
    has_role('hr_admin')
  );

-- ───── organizations ─────
-- SELECT: 自組織のみ
drop policy if exists organizations_select on organizations;
create policy organizations_select on organizations
  for select using (
    id = (select organization_id from current_employee())
  );

-- HR 管理者のみ更新可（組織自体の編集は稀）
drop policy if exists organizations_admin on organizations;
create policy organizations_admin on organizations
  for update using (has_role('hr_admin'))
  with check (has_role('hr_admin'));

-- ───── 部署の子孫取得用ヘルパー関数（循環参照防止 / 配下集計に使用） ─────
create or replace function get_department_descendants(dept_id uuid)
returns table(id uuid, name text)
language sql stable security definer as $$
  with recursive d as (
    select id, name from departments where id = dept_id
    union all
    select c.id, c.name
    from departments c
    join d on c.parent_id = d.id
  )
  select id, name from d where id <> dept_id;
$$;

comment on function get_department_descendants is
  '指定部署の子孫部署一覧を返す。循環参照チェック・配下社員集計などに使用。';
