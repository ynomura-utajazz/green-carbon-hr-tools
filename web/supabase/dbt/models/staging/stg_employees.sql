-- Staging: employees テーブルの正規化
-- 入社日・退職日を計算しやすいフィールドへ整形

with src as (
  select * from {{ source('public', 'employees') }}
)
select
  id,
  organization_id,
  employee_code,
  full_name,
  email,
  department_id,
  manager_id,
  job_title,
  job_grade,
  employment_type,
  status,
  nationality,
  is_foreign_national,
  hire_date::date as hire_date,
  case
    when status = 'on_leave' then 'on_leave'
    when deleted_at is not null then 'left'
    else 'active'
  end as employment_status,
  -- 在籍ステージ（engagement-deep と同じ）
  case
    when extract(month from age(current_date, hire_date)) +
         extract(year from age(current_date, hire_date)) * 12 < 4 then 'onboarding'
    when extract(year from age(current_date, hire_date)) < 1 then 'new_hire'
    when extract(year from age(current_date, hire_date)) < 3 then 'established'
    when extract(year from age(current_date, hire_date)) < 5 then 'veteran'
    else 'lifer'
  end as tenure_stage,
  extract(year from age(current_date, hire_date)) +
    extract(month from age(current_date, hire_date)) / 12.0 as tenure_years,
  deleted_at::date as left_date,
  created_at,
  updated_at
from src
where deleted_at is null or deleted_at >= current_date - interval '24 months'
