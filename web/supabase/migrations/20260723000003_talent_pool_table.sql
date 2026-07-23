-- ──────────────────────────────────────────────────────────────────
-- talent_pool テーブル（ドラフト・要レビュー・自動実行しない）
--
-- 背景:
--   /talent-pool ページ（人材プール/再アクティベーションCRM: アルムナイ・
--   銀メダル・カジュアル面談・過去応募者）の実データ化には専用テーブルが必要。
--   既存 candidates は ATS パイプライン（applied→hired）で別ドメインのため流用不可。
--   本マイグレは lib/demo/talent-pool.ts の TalentPoolEntry 型に対応する表を定義する。
--
-- ⚠️ 要レビュー:
--   - kind/status/open_signal/original_source の語彙は運用に合わせて調整可。
--   - RLS は candidates と同様「hr_admin のみ」を既定にした（候補者情報は機微）。
--   - 本番の実スキーマ（positions/employees/organizations の存在）確認後に適用する。
-- ──────────────────────────────────────────────────────────────────

create table if not exists talent_pool (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  full_name text not null,
  display_name_en text,
  email text,
  kind text not null default 'past_applicant'
    check (kind in ('past_applicant','alumni','casual','silver_medal')),
  status text not null default 'cold'
    check (status in ('cold','warm','engaged','re_open','parked')),
  original_source text
    check (original_source is null or original_source in
      ('referral','linkedin','wantedly','indeed','agent','direct','alumni','contractor_conversion')),
  last_position_id uuid references positions(id) on delete set null,
  last_stage text,
  current_role text,
  current_company text,
  years_of_experience int check (years_of_experience is null or (years_of_experience >= 0 and years_of_experience <= 60)),
  skills text[] not null default '{}',
  location text,
  country_code text,
  last_event_at timestamptz,
  last_event_summary text,
  last_contacted_at timestamptz,
  owner_employee_id uuid references employees(id) on delete set null,
  notes text,
  open_signal text not null default 'unknown'
    check (open_signal in ('open','passive','not_looking','unknown')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists talent_pool_org_idx on talent_pool (organization_id);
create index if not exists talent_pool_kind_idx on talent_pool (kind);
create index if not exists talent_pool_status_idx on talent_pool (status);
create index if not exists talent_pool_owner_idx on talent_pool (owner_employee_id);

-- RLS: 候補者情報同様、hr_admin のみ閲覧可（機微データ）。
alter table talent_pool enable row level security;

drop policy if exists talent_pool_select on talent_pool;
create policy talent_pool_select on talent_pool for select using (
  has_role('hr_admin')
);

-- 書き込みも hr_admin のみ（本人性の概念が無いマスタデータ）。
drop policy if exists talent_pool_write on talent_pool;
create policy talent_pool_write on talent_pool for all using (
  has_role('hr_admin')
) with check (
  has_role('hr_admin')
);
