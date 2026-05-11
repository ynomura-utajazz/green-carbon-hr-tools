-- Mart: 月次離職率（trailing 12 month average 込み）
-- 経営会議用の最重要 KPI。

with months as (
  select generate_series(
    date_trunc('month', current_date - interval '24 months'),
    date_trunc('month', current_date),
    interval '1 month'
  )::date as month_start
),
headcount as (
  select
    m.month_start,
    count(distinct e.id) filter (
      where e.hire_date <= m.month_start + interval '1 month - 1 day'
        and (e.left_date is null or e.left_date >= m.month_start)
    ) as active_headcount
  from months m
  cross join {{ ref('stg_employees') }} e
  group by 1
),
exits as (
  select
    date_trunc('month', e.left_date)::date as month_start,
    count(*) as exits_count
  from {{ ref('stg_employees') }} e
  where e.left_date is not null
  group by 1
)
select
  m.month_start,
  to_char(m.month_start, 'YYYY-MM') as month_label,
  h.active_headcount,
  coalesce(x.exits_count, 0) as exits_count,
  case when h.active_headcount > 0
    then coalesce(x.exits_count, 0)::numeric / h.active_headcount
    else 0 end as monthly_attrition_rate,
  -- 12 ヶ月移動平均
  avg(case when h.active_headcount > 0
    then coalesce(x.exits_count, 0)::numeric / h.active_headcount else 0 end)
    over (order by m.month_start rows between 11 preceding and current row) as ttm_attrition_rate
from months m
left join headcount h on h.month_start = m.month_start
left join exits     x on x.month_start = m.month_start
order by m.month_start
