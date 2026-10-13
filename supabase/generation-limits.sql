-- Itinerary generation log, used for the per-account daily cap (issue #27).
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
--
-- Only the server writes here (with the service role key), so users can't reset their own
-- count by editing or deleting trips. Later this can also back free vs. paid tiers.

create table if not exists public.trip_generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id text,
  created_at timestamptz not null default now()
);

create index if not exists trip_generations_user_created_idx
  on public.trip_generations (user_id, created_at);

-- No policies: browsers can't read or write this table, only the server
alter table public.trip_generations enable row level security;
