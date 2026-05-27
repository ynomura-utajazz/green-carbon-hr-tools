-- ──────────────────────────────────────────────────────────────────
-- HR テスター・管理者に hr_admin ロール付与
--
-- Phase B 移行に伴い、現状 service role バイパスで運用している API を
-- 正しい RLS（hr_admin 必須）に戻すための準備マイグレーション。
--
-- 対象メール:
--   - y.nomura@green-carbon.inc (管理者)
--   - s.kitagawa@green-carbon.inc
--   - a.murai@green-carbon.inc
--   - y.kondo@green-carbon.inc
--   - a.kamada@green-carbon.inc
--   - a.kurihara@green-carbon.inc
--
-- 冪等：すでに付与済みでも ON CONFLICT で skip。
-- ──────────────────────────────────────────────────────────────────

with target_emails as (
  select unnest(array[
    'y.nomura@green-carbon.inc',
    's.kitagawa@green-carbon.inc',
    'a.murai@green-carbon.inc',
    'y.kondo@green-carbon.inc',
    'a.kamada@green-carbon.inc',
    'a.kurihara@green-carbon.inc'
  ]) as email
),
matching_employees as (
  select e.id as employee_id
  from employees e
  join target_emails t on t.email = e.email
  where e.deleted_at is null
)
insert into employee_roles (employee_id, role)
select employee_id, 'hr_admin'::user_role
from matching_employees
on conflict (employee_id, role) do nothing;

-- 結果確認用ビュー（後で SELECT すれば付与状況がわかる）
create or replace view _hr_admin_check as
  select e.email, e.full_name, er.role, er.created_at as role_granted_at
  from employees e
  left join employee_roles er on er.employee_id = e.id and er.role = 'hr_admin'
  where e.email like '%@green-carbon.inc'
    and e.deleted_at is null
  order by e.email;

comment on view _hr_admin_check is 'hr_admin ロール付与状況の確認ビュー。本番では SELECT * FROM _hr_admin_check で確認可能。';
