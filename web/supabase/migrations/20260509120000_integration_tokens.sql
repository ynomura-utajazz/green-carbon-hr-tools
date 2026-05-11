-- ──────────────────────────────────────────────────────────────────
-- 連携サービスのアクセストークン保管テーブル（Phase 3）
--
-- scope = 'workspace'  → owner_id は外部サービスのテナントID
--                       （Slack なら team_id、freee なら company_id）
-- scope = 'user'       → owner_id は auth.users.id
--
-- 永続化対象：
--   - Slack Bot トークン（xoxb-...）  scope=workspace
--   - Google ユーザートークン         scope=user（refresh_token 込）
--   - freee 管理者トークン            scope=user（refresh_token 込）
-- ──────────────────────────────────────────────────────────────────

create table if not exists integration_tokens (
  service        text        not null,    -- 'slack' | 'google_calendar' | 'freee'
  scope          text        not null,    -- 'workspace' | 'user'
  owner_id       text        not null,
  access_token   text        not null,
  refresh_token  text,
  expires_at     timestamptz,
  metadata       jsonb       not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (service, scope, owner_id)
);

create index if not exists integration_tokens_service_idx
  on integration_tokens (service, scope);

-- updated_at 自動更新トリガ
create or replace function bump_integration_tokens_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_integration_tokens_updated_at on integration_tokens;
create trigger trg_integration_tokens_updated_at
  before update on integration_tokens
  for each row execute function bump_integration_tokens_updated_at();

-- RLS：HR管理者のみ select/update。
-- 書き込みはサーバサイド（service_role）が行うので、has_role の制約は select のみで OK。
alter table integration_tokens enable row level security;

create policy integration_tokens_admin_select on integration_tokens
  for select using (has_role('hr_admin'));

-- service_role からのアクセスは RLS バイパスされるため、
-- callback route など server-side コードはそのまま書き込める。

comment on table integration_tokens is
  'OAuth トークン保管（Slack Bot, Google, freee）。RLS は HR 管理者のみ閲覧可。';
