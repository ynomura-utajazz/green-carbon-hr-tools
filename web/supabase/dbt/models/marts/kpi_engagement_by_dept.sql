-- Mart: 部門別エンゲージメント KPI
-- 1on1 mood 平均、サーベイ NPS、離職率を部門軸で集計

with monthly_mood as (
  select
    e.department_id,
    date_trunc('month', oo.session_date)::date as month_start,
    avg(oo.mood_score)::numeric(4, 2) as avg_mood,
    count(*) as session_count
  from {{ ref('stg_oneonones') }} oo
  join {{ ref('stg_employees') }} e on e.id = oo.member_id
  where oo.status = 'completed' and oo.mood_score is not null
  group by 1, 2
),
dept_attrition as (
  select
    e.department_id,
    date_trunc('month', e.left_date)::date as month_start,
    count(*) as exits
  from {{ ref('stg_employees') }} e
  where e.left_date is not null
  group by 1, 2
)
select
  d.id as department_id,
  d.name as department_name,
  m.month_start,
  to_char(m.month_start, 'YYYY-MM') as month_label,
  m.avg_mood,
  m.session_count,
  coalesce(a.exits, 0) as exits_count
from {{ source('public', 'departments') }} d
join monthly_mood m on m.department_id = d.id
left join dept_attrition a on a.department_id = d.id and a.month_start = m.month_start
order by d.name, m.month_start
