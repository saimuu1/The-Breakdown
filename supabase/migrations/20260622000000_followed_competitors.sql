-- Users follow specific competitors (teams / fighters / national teams).
-- This is separate from the match-level `favorites` bookmark; following a
-- competitor generates the curated feed on /favorites.

create table if not exists followed_competitors (
  user_id       uuid not null references auth.users(id) on delete cascade,
  competitor_id uuid not null references competitors(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, competitor_id)
);

alter table followed_competitors enable row level security;

create policy "users manage own follows" on followed_competitors
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
