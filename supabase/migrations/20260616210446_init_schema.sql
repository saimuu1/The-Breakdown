-- ============================================================================
-- Sports Predict — initial schema, RLS, and seed data.
--
-- Design notes for the interview:
--   * Sport-agnostic schema: one set of tables serves UFC, soccer, and NBA.
--     Sport-specific inputs live in JSONB (features.data, matches.result/
--     market_odds), so adding a sport needs no schema change.
--   * Multi-tenancy + tier gating are enforced in Postgres via RLS, so a bug in
--     the frontend can't hand a free user the paid predictions.
--   * predictions.tier is DENORMALIZED from sports.tier so the RLS read policy
--     is a cheap check, not a 3-table join on every page load.
--   * The backend writes with the service_role key (bypasses RLS). The frontend
--     reads with the anon/authenticated key (RLS applies).
-- ============================================================================

create type outcome_type as enum ('binary', 'three_way');

-- ---------------------------------------------------------------------------
-- Reference / domain tables
-- ---------------------------------------------------------------------------
create table sports (
  id text primary key,                 -- 'soccer', 'ufc', 'nba'
  name text not null,
  outcome_kind outcome_type not null,
  tier text not null default 'pro'     -- 'free' | 'pro'  (soccer = free)
);

create table leagues (
  id uuid primary key default gen_random_uuid(),
  sport_id text not null references sports(id),
  name text not null
);

create table competitors (             -- fighters OR teams
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id),
  name text not null
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id),
  home_id uuid not null references competitors(id),
  away_id uuid not null references competitors(id),
  external_id text,                     -- source id, for idempotent upserts
  starts_at timestamptz not null,
  status text not null default 'scheduled',
  result jsonb,
  market_odds jsonb,                    -- de-vigged closing probs, for backtest
  unique (league_id, external_id)
);

create table features (
  match_id uuid primary key references matches(id) on delete cascade,
  data jsonb not null                  -- sport-specific inputs live here
);

create table predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  tier text not null,                  -- denormalized from sport, so RLS needs no joins
  model_version text not null,
  probs jsonb not null,                -- {"home":0.62,"away":0.38} or 3-way
  analysis text,                       -- the LLM persona write-up (cached)
  analysis_version text,               -- which persona version produced it
  created_at timestamptz not null default now(),
  unique (match_id, model_version)     -- one prediction per model per match
);

-- ---------------------------------------------------------------------------
-- Per-user tables
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free'    -- 'free' | 'pro'
);

create table favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  primary key (user_id, match_id)
);

-- ---------------------------------------------------------------------------
-- Indexes for the common read paths
-- ---------------------------------------------------------------------------
create index on leagues (sport_id);
create index on competitors (league_id);
create index on matches (league_id);
create index on matches (starts_at);
create index on predictions (match_id);
create index on predictions (created_at desc);
create index on favorites (user_id);

-- ---------------------------------------------------------------------------
-- Auto-provision a profile row when a new auth user signs up.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table sports      enable row level security;
alter table leagues     enable row level security;
alter table competitors enable row level security;
alter table matches     enable row level security;
alter table features    enable row level security;
alter table predictions enable row level security;
alter table profiles    enable row level security;
alter table favorites   enable row level security;

-- Reference data is public to read. Match metadata being visible (e.g. that a
-- UFC fight is scheduled) is fine — the gated asset is the PREDICTION.
create policy "public read sports"      on sports      for select using (true);
create policy "public read leagues"     on leagues     for select using (true);
create policy "public read competitors" on competitors for select using (true);
create policy "public read matches"     on matches     for select using (true);
create policy "public read features"    on features    for select using (true);

-- Per-user isolation.
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own favorites" on favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The centerpiece: free predictions are visible to everyone (incl. anon, where
-- auth.uid() is null); pro predictions only to users on the pro plan. The
-- `exists` subquery is uncorrelated, so Postgres evaluates it once per query,
-- not once per row.
create policy "tiered read predictions" on predictions
  for select using (
    tier = 'free'
    or exists (select 1 from profiles where id = auth.uid() and plan = 'pro')
  );

-- ============================================================================
-- Seed: which sports exist and their tier.
-- ============================================================================
insert into sports (id, name, outcome_kind, tier) values
  ('soccer', 'Soccer', 'three_way', 'free'),
  ('ufc',    'UFC',    'binary',    'pro'),
  ('nba',    'NBA',    'binary',    'pro');
