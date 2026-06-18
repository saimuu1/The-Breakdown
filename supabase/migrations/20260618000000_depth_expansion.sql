-- ============================================================================
-- Depth expansion: logos, event/card grouping, per-match display context, and
-- account-gated predictions.
--
--   * competitors.logo_url  — team crest / fighter headshot URL (from ESPN)
--   * matches.event_name    — e.g. "UFC 324: ..." so past UFC groups by card
--   * matches.context       — per-match display extras (player leaders, headline)
--   * RLS: predictions now require an authenticated user (the product gates
--     predictions behind an account); tier logic still applies among authed users.
-- ============================================================================

alter table competitors add column if not exists logo_url text;
alter table matches      add column if not exists event_name text;
alter table matches      add column if not exists context jsonb;

-- Predictions: require login, then apply free/pro tiering. Anonymous visitors
-- see nothing (the homepage/marketing is public; the picks are not).
drop policy if exists "tiered read predictions" on predictions;
create policy "tiered read predictions" on predictions
  for select using (
    auth.uid() is not null
    and (
      tier = 'free'
      or exists (select 1 from profiles where id = auth.uid() and plan = 'pro')
    )
  );
