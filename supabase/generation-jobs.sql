-- Durable itinerary generation (issue #29).
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
--
-- One row per trip being generated. The server's worker keeps `heartbeat_at` fresh while it
-- works; if the server restarts mid-generation the heartbeat goes stale, and the sweeper
-- (server/generationJobs.js) retries the job or marks the trip failed.

create table if not exists public.generation_jobs (
  trip_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  attempts int not null default 1,
  worker text,                  -- which server process is working on it
  started_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  last_error text,
  reservation_id bigint,        -- its trip_generations row, given back if it fails
  updated_at timestamptz not null default now()
);

create index if not exists generation_jobs_running_idx
  on public.generation_jobs (heartbeat_at) where status = 'running';

-- No policies: only the server (service role) reads and writes jobs
alter table public.generation_jobs enable row level security;

-- Push trip changes to the browser (Supabase Realtime), so a finished itinerary shows up
-- right away instead of on the next poll. Row-level security still decides who gets what.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;
end $$;
