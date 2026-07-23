-- ──────────────────────────────────────────────────────────────────
-- RLS SELECT ポリシー未定義テーブルの是正（ドラフト・要レビュー）
--
-- 背景:
--   初期スキーマで多数のテーブルに `enable row level security` したが
--   `create policy` を定義しておらず、PostgreSQL の deny-by-default により
--   ユーザーRLSクライアント(createClient)経由では hr_admin でも常に0件になる。
--   ポータルの受賞一覧・ビザ警告などが「静かに空」になる原因。
--
-- 方針（機微度で可視範囲を分ける）:
--   - hr_admin は全行閲覧可（管理業務のため）。
--   - PII/機微テーブル（給与・健康・在留・評価・離職リスク・勤怠）は
--     「hr_admin ＋ 本人のみ」に限定。全社員には見せない。
--   - 組織内で共有前提のもの（受賞・研修・サーベイ・スキル・目標）は
--     同一組織メンバーに read を許可。
--   - 書き込み(INSERT/UPDATE/DELETE)は本マイグレでは触らない（多くは
--     service_role 経由 or 別途）。SELECT のみを対象にする。
--
-- ⚠️ 要レビュー: 各テーブルの可視範囲は運用ポリシー次第。適用前に
--   「誰がどのデータを見てよいか」を確認すること。特に給与・評価・健康・在留。
--   本番の実スキーマ（列名/テーブル存在）確認後に適用する。
-- ──────────────────────────────────────────────────────────────────

-- ヘルパ: current_employee().id / .organization_id は既存関数。
-- 本人判定 = 対象の employee 参照列 = current_employee().id
-- 組織判定 = 対象 employee の organization_id = 自分の organization_id

-- ===== 機微テーブル: hr_admin ＋ 本人のみ =====

-- 勤怠
drop policy if exists attendance_records_select on attendance_records;
create policy attendance_records_select on attendance_records for select using (
  has_role('hr_admin') or employee_id = (select id from current_employee())
);

-- 健康診断（健康PII）
drop policy if exists health_checks_select on health_checks;
create policy health_checks_select on health_checks for select using (
  has_role('hr_admin') or employee_id = (select id from current_employee())
);

-- 在留資格（ビザPII）
drop policy if exists visa_records_select on visa_records;
create policy visa_records_select on visa_records for select using (
  has_role('hr_admin') or employee_id = (select id from current_employee())
);

-- 休暇申請（本人＋承認者＋hr_admin）
drop policy if exists leave_requests_select on leave_requests;
create policy leave_requests_select on leave_requests for select using (
  has_role('hr_admin')
  or employee_id = (select id from current_employee())
  or approver_id = (select id from current_employee())
);

-- 人事評価（本人＋評価者＋hr_admin）
drop policy if exists reviews_select on reviews;
create policy reviews_select on reviews for select using (
  has_role('hr_admin')
  or employee_id = (select id from current_employee())
  or reviewer_id = (select id from current_employee())
);

-- 離職リスクスコア（機微・hr_admin のみ）
drop policy if exists retention_scores_select on retention_scores;
create policy retention_scores_select on retention_scores for select using (
  has_role('hr_admin')
);

-- オフボーディング（本人＋hr_admin）
drop policy if exists offboarding_runs_select on offboarding_runs;
create policy offboarding_runs_select on offboarding_runs for select using (
  has_role('hr_admin') or employee_id = (select id from current_employee())
);

-- ===== 組織内で共有可: hr_admin ＋ 同一組織メンバー =====

-- バリューアワード（受賞は組織内で共有される想定）
drop policy if exists value_awards_select on value_awards;
create policy value_awards_select on value_awards for select using (
  has_role('hr_admin')
  or exists (
    select 1 from employees e
    where e.id = value_awards.recipient_id
      and e.organization_id = (select organization_id from current_employee())
  )
);

-- 給与テーブル（バンド定義。個人給与ではなくレンジ定義。組織内参照可）
drop policy if exists salary_bands_select on salary_bands;
create policy salary_bands_select on salary_bands for select using (
  has_role('hr_admin')
  or organization_id = (select organization_id from current_employee())
);

-- 研修カタログ
drop policy if exists trainings_select on trainings;
create policy trainings_select on trainings for select using (
  has_role('hr_admin')
  or organization_id = (select organization_id from current_employee())
);

-- 研修受講（本人＋hr_admin）
drop policy if exists training_attendances_select on training_attendances;
create policy training_attendances_select on training_attendances for select using (
  has_role('hr_admin') or employee_id = (select id from current_employee())
);

-- サーベイ定義（組織内）
drop policy if exists surveys_select on surveys;
create policy surveys_select on surveys for select using (
  has_role('hr_admin')
  or organization_id = (select organization_id from current_employee())
);

-- サーベイ回答（本人＋hr_admin。匿名回答は respondent_id null → hr_admin のみ）
drop policy if exists survey_responses_select on survey_responses;
create policy survey_responses_select on survey_responses for select using (
  has_role('hr_admin') or respondent_id = (select id from current_employee())
);

-- 社員スキル（本人＋同一組織メンバー＋hr_admin。スキルは組織内で可視前提）
drop policy if exists employee_skills_select on employee_skills;
create policy employee_skills_select on employee_skills for select using (
  has_role('hr_admin')
  or exists (
    select 1 from employees e
    where e.id = employee_skills.employee_id
      and e.organization_id = (select organization_id from current_employee())
  )
);

-- 目標(MBO/OKR)（本人＋hr_admin。組織可視にしたい場合はレビューで調整）
drop policy if exists goals_select on goals;
create policy goals_select on goals for select using (
  has_role('hr_admin') or owner_id = (select id from current_employee())
);

-- キーリザルト（親 goal の可視性を継承）
drop policy if exists key_results_select on key_results;
create policy key_results_select on key_results for select using (
  has_role('hr_admin')
  or exists (
    select 1 from goals g
    where g.id = key_results.goal_id
      and g.owner_id = (select id from current_employee())
  )
);

-- アルムナイ（退職者情報・hr_admin のみ）
drop policy if exists alumni_select on alumni;
create policy alumni_select on alumni for select using (
  has_role('hr_admin')
);

-- オンボーディング（本人＋バディ＋hr_admin）
drop policy if exists onboarding_runs_select on onboarding_runs;
create policy onboarding_runs_select on onboarding_runs for select using (
  has_role('hr_admin')
  or employee_id = (select id from current_employee())
  or buddy_id = (select id from current_employee())
);

-- ===== 採用データ: hr_admin のみ（候補者情報は機微）=====

drop policy if exists candidates_select on candidates;
create policy candidates_select on candidates for select using (
  has_role('hr_admin')
);

drop policy if exists candidate_events_select on candidate_events;
create policy candidate_events_select on candidate_events for select using (
  has_role('hr_admin')
);
