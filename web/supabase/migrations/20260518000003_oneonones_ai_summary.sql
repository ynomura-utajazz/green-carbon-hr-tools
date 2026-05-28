-- ──────────────────────────────────────────────────────────────────
-- oneonones.ai_summary カラム追加
--
-- AI 抽出機能で生成されたサマリを notes と分離して保存。
-- これまでは notes の先頭に AI サマリを結合していたため、UI 上で
-- 元メモと冗長表示されていた。
-- ──────────────────────────────────────────────────────────────────

alter table oneonones add column if not exists ai_summary text;

comment on column oneonones.ai_summary is
  'AI 抽出機能で生成された 1 行サマリ。UI ではメモとは別に強調表示する。';
