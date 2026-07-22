-- ============================================================================
-- コアのデモ導線シード（本番で「本物の状態」を見るための最小データ）
--
-- 目的:
--   ① 1on1 の作成・記録を試せるようにする
--      → ログインする本人（既定: y.nomura）の直属部下を数名つくる。
--        1on1 UI は「manager_id が自分の社員（＝直属部下）」だけを相手に
--        選べる仕様のため、部下がいないと作成できない（テスターの指摘の原因）。
--   ② AI 抽出のデモ材料（メモ入りの完了済み 1on1）を1件用意する
--      → 実際に本物の AI 応答を出すには Vercel に ANTHROPIC_API_KEY が必要。
--   ③ 別ロール（一般社員）での見え方を検証する ← セクションB（任意・要復元）
--
-- 安全性:
--   - 追加する社員は employee_code が 'TEST-MEM-%'、氏名も「TEST 」始まりで
--     識別可能。末尾のクリーンアップで完全削除できる。
--   - 再実行可能（先頭で既存の TEST- デモ行を消してから入れ直す）。
--   - Supabase SQL Editor（postgres 権限）で実行する前提。RLS は適用されない。
--
-- 実行場所: Supabase Dashboard → SQL Editor → 貼り付けて Run
-- ============================================================================


-- ── 事前チェック: デモの「マネージャー」になる人が存在するか ───────────────
--   別の人がデモするなら、このメールを差し替えてから実行してください。
--   （その人が Google でログインして 1on1 を作成・記録する担当になります）
do $$
declare mgr employees;
begin
  select * into mgr from employees
    where email = 'y.nomura@green-carbon.inc' and deleted_at is null
    limit 1;
  if mgr.id is null then
    raise exception 'マネージャー候補 (y.nomura@green-carbon.inc) が見つかりません。メールを実在の社員に変更してください。';
  end if;
end $$;


-- ============================================================================
-- セクションA: 1on1 デモ導線（安全・いつでも削除可）
-- ============================================================================

-- A-0. 既存の TEST- デモ行を掃除（再実行できるように）
delete from action_items
  where member_id in (select id from employees where employee_code like 'TEST-MEM-%')
     or assignee_id in (select id from employees where employee_code like 'TEST-MEM-%');
delete from oneonones
  where member_id in (select id from employees where employee_code like 'TEST-MEM-%');
delete from employees where employee_code like 'TEST-MEM-%';

-- A-1. 直属部下を2名つくる（manager_id = デモ担当者）
insert into employees
  (organization_id, employee_code, email, full_name, full_name_kana,
   department_id, manager_id, job_title, employment_type, status, hire_date)
select mgr.organization_id, v.code, v.email, v.name, v.kana,
       mgr.department_id, mgr.id, v.title, 'full_time', 'active', v.hire
from employees mgr
cross join (values
  ('TEST-MEM-01', 'test.member1@green-carbon.inc', 'TEST 田中 太郎', 'テスト タナカ タロウ', 'メンバー', date '2025-04-01'),
  ('TEST-MEM-02', 'test.member2@green-carbon.inc', 'TEST 佐藤 花子', 'テスト サトウ ハナコ', 'メンバー', date '2024-10-01')
) as v(code, email, name, kana, title, hire)
where mgr.email = 'y.nomura@green-carbon.inc';

-- A-2. 完了済みの 1on1 を1件（メモ入り → AI抽出のデモ材料）＋ 予定を1件
insert into oneonones
  (organization_id, manager_id, member_id, scheduled_at, completed_at,
   duration_minutes, mood, agenda, notes, topics)
select mgr.organization_id, mgr.id, mem.id,
       now() - interval '3 days', now() - interval '3 days', 30, 'good',
       '直近の業務状況とキャリアの相談',
       E'案件Aの進捗は順調で、想定より1週間前倒しで進んでいる。\n本人は来期からマネジメント業務にも挑戦したい意向。\nネクストアクション: 次回までにマネジメント研修のリストを共有する（担当: マネージャー、期日: 来週金曜）。',
       array['キャリア', '業務状況']
from employees mgr, employees mem
where mgr.email = 'y.nomura@green-carbon.inc' and mem.employee_code = 'TEST-MEM-01';

insert into oneonones
  (organization_id, manager_id, member_id, scheduled_at,
   duration_minutes, agenda, topics)
select mgr.organization_id, mgr.id, mem.id,
       now() + interval '2 days', 30,
       '入社後の振り返りと目標設定',
       array['オンボーディング']
from employees mgr, employees mem
where mgr.email = 'y.nomura@green-carbon.inc' and mem.employee_code = 'TEST-MEM-02';

-- A-3. アクションアイテムを1件（完了済み 1on1 に紐づく）
insert into action_items
  (organization_id, one_on_one_id, member_id, assignee_id, title, due_date)
select o.organization_id, o.id, mem.id, mgr.id,
       'マネジメント研修のリストを共有する', current_date + 5
from oneonones o
join employees mem on mem.id = o.member_id and mem.employee_code = 'TEST-MEM-01'
join employees mgr on mgr.id = o.manager_id
where o.completed_at is not null
limit 1;


-- ============================================================================
-- 確認: 何が入ったか
-- ============================================================================
select 'members' as kind, employee_code, full_name from employees where employee_code like 'TEST-MEM-%'
union all
select 'oneonones', to_char(scheduled_at, 'YYYY-MM-DD'),
       coalesce(completed_at::text, '(予定)')
  from oneonones where member_id in (select id from employees where employee_code like 'TEST-MEM-%')
order by kind;


-- ============================================================================
-- セクションB【任意・要注意】別ロール（一般社員）での見え方を検証する
--
--   ⚠️ これは "実在する人" の権限を一時的に下げます。実行するとその人は
--      hr_admin 権限を失い、管理画面が見えなくなります（検証が終わったら
--      下の「復元」を必ず実行してください）。
--   検証手順:
--     1. 下の DOWNGRADE を実行（例では a.kurihara を一般社員に）
--     2. その本人が Google でログイン → /admin/* や管理メニューが
--        消えている / アクセスすると弾かれることを確認
--     3. 下の RESTORE を実行して hr_admin に戻す
-- ============================================================================

-- 【DOWNGRADE】一般社員ロールにする（検証したい時だけコメントを外して実行）
-- update employee_roles set role = 'employee'
--   where employee_id = (select id from employees where email = 'a.kurihara@green-carbon.inc')
--     and role = 'hr_admin';

-- 【RESTORE】hr_admin に戻す（検証が終わったら必ず実行）
-- update employee_roles set role = 'hr_admin'
--   where employee_id = (select id from employees where email = 'a.kurihara@green-carbon.inc')
--     and role = 'employee';


-- ============================================================================
-- クリーンアップ: デモが終わったら TEST- データを完全削除（必要時に実行）
-- ============================================================================
-- delete from action_items
--   where member_id  in (select id from employees where employee_code like 'TEST-MEM-%')
--      or assignee_id in (select id from employees where employee_code like 'TEST-MEM-%');
-- delete from oneonones
--   where member_id in (select id from employees where employee_code like 'TEST-MEM-%');
-- delete from employees where employee_code like 'TEST-MEM-%';
