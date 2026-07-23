-- ──────────────────────────────────────────────────────────────────
-- 本番スキーマ検証SQL（読み取り専用・安全）
--
-- 目的:
--   DEMO→実データ化 と RLSポリシー適用の「前提確認」。
--   本番 Supabase で以下を確認する:
--     (A) 実データ化対象テーブルが本番に存在するか
--     (B) アプリ/RLSが参照するカラムが本番に存在するか（スキーマドリフト検出）
--     (C) RLS が有効か・SELECTポリシーが定義済みか
--
-- 使い方: Supabase SQL Editor に貼り付けて実行。3つの結果セットが返る。
--   何も変更しない（information_schema / pg_catalog を読むだけ）。
-- ──────────────────────────────────────────────────────────────────

-- (A)(C) 対象テーブルの存在 + RLS有効 + ポリシー数
select
  t.table_name,
  (c.relrowsecurity is true)                          as rls_enabled,
  coalesce(p.n, 0)                                     as select_policies
from (values
  ('employees'),('departments'),('candidates'),('candidate_events'),('positions'),
  ('attendance_records'),('health_checks'),('visa_records'),
  ('surveys'),('survey_responses'),('retention_scores'),('value_awards'),
  ('leave_requests'),('reviews'),('salary_bands'),('trainings'),('training_attendances'),
  ('employee_skills'),('goals'),('key_results'),('alumni'),
  ('onboarding_runs'),('offboarding_runs')
) as t(table_name)
left join pg_class c
  on c.relname = t.table_name and c.relnamespace = 'public'::regnamespace
left join (
  select tablename, count(*) filter (where cmd in ('SELECT','ALL')) as n
  from pg_policies where schemaname = 'public' group by tablename
) p on p.tablename = t.table_name
order by rls_enabled desc nulls last, t.table_name;
-- 期待: 実データ化するテーブルは rls_enabled=true かつ select_policies>=1。
--       select_policies=0 かつ rls_enabled=true → deny-by-default で常時0件（RLSマイグレ適用が必要）。
--       行が返らない table_name → 本番にそのテーブルが存在しない（マイグレ未適用）。

-- (B) RLSポリシー / アプリが参照するカラムの実在確認（ドリフト検出）
select c.table_name, c.column_name
from information_schema.columns c
where c.table_schema = 'public'
  and (c.table_name, c.column_name) in (
    ('attendance_records','employee_id'),
    ('health_checks','employee_id'), ('health_checks','result'), ('health_checks','followup_required'), ('health_checks','checked_at'),
    ('visa_records','employee_id'), ('visa_records','expires_at'), ('visa_records','visa_status'),
    ('retention_scores','employee_id'), ('retention_scores','score'), ('retention_scores','level'), ('retention_scores','factors'),
    ('value_awards','recipient_id'), ('value_awards','nominator_id'), ('value_awards','value_tag'),
    ('surveys','organization_id'), ('surveys','type'), ('survey_responses','respondent_id'), ('survey_responses','answers'),
    ('candidates','position_id'), ('candidates','stage'), ('candidates','notes'),
    ('leave_requests','approver_id'), ('reviews','reviewer_id'),
    ('salary_bands','organization_id'), ('trainings','organization_id'),
    ('goals','owner_id'), ('key_results','goal_id'),
    ('onboarding_runs','buddy_id')
  )
order by c.table_name, c.column_name;
-- 期待: ここにリストした (table, column) が全て返ること。
--       返らない組 = 本番に存在しない列 = ドリフト。RLS/実データ化前に要修正。

-- (C補足) 各対象テーブルの行数（実データが入っているか。空なら実データ化しても空状態）
-- 注意: RLS越しではなくオーナー(service)権限のSQL Editorで実行するので実件数が見える。
select 'candidates' as tbl, count(*) from candidates
union all select 'health_checks', count(*) from health_checks
union all select 'visa_records', count(*) from visa_records
union all select 'attendance_records', count(*) from attendance_records
union all select 'retention_scores', count(*) from retention_scores
union all select 'value_awards', count(*) from value_awards
union all select 'survey_responses', count(*) from survey_responses;
-- 注意: 上のUNIONは、存在しないテーブルがあるとエラーになる。
--       (A)でテーブル存在を確認してから、存在するものだけ残して実行すること。
