-- ──────────────────────────────────────────────────────────────────
-- employees に slack_user_id / office_location 列を追加（要レビュー）
--
-- 背景:
--   アプリ(DemoEmployee 型)は employees.slack_user_id / office_location を
--   トップレベル列として参照するが、本番スキーマに列が無い。
--   特に lib/integrations/slack-handlers.ts の名簿同期
--   (team_join 照合 / slack_user_id の後追いセット / message イベント照合) が
--   すべて slack_user_id 列に依存しており、列が無いため静かに全滅していた。
--   office_location は名簿・在留・健診などの拠点表示(国旗絵文字・都市)に使用。
--
-- いずれも追加(additive)で既存データに影響なし。安全。
-- ──────────────────────────────────────────────────────────────────

alter table employees add column if not exists slack_user_id text;   -- 例: U01ABCD2EF
alter table employees add column if not exists office_location text; -- 例: JP-TYO / VN-HAN

-- slack-handlers は slack_user_id で頻繁に照合するため部分インデックスを張る。
create index if not exists employees_slack_user_id_idx
  on employees (slack_user_id)
  where slack_user_id is not null;

comment on column employees.slack_user_id is 'Slack ワークスペースのユーザーID(U...形式)。名簿同期・DMリマインドに使用。';
comment on column employees.office_location is '拠点コード(例 JP-TYO)。UIの拠点表示に使用。';
