-- Staging: 1on1 セッションの正規化

with src as (
  select * from {{ source('public', 'one_on_ones') }}
)
select
  id,
  manager_id,
  member_id,
  scheduled_at::date as session_date,
  duration_minutes,
  status,
  mood,
  -- mood: low/med/high → 1/2/3
  case mood
    when 'low'  then 1
    when 'med'  then 2
    when 'high' then 3
  end as mood_score,
  completed_at::timestamptz as completed_at,
  created_at,
  updated_at
from src
