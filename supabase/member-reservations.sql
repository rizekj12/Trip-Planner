-- Travel partners' own reservations: flights and hotels (with confirmation codes) that a
-- member or guest adds for themselves on a trip they've joined.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
-- Needs supabase/travel-crew.sql first (it creates trip_members).
--
-- Privacy: each row belongs to one person on the trip (their trip_members row). Only the
-- server (service role) reads or writes this table, and it only ever returns a person their
-- own rows: not the organizer, not other travelers. Row-level security is on with no
-- policies, so the browser can't query it directly, and it isn't added to Realtime.
-- Leaving or being removed from a trip deletes that person's reservations (on delete cascade).

do $$
declare trip_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into trip_id_type
  from pg_attribute a
  where a.attrelid = 'public.trips'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.member_reservations (
      id uuid primary key default gen_random_uuid(),
      trip_id %1$s not null references public.trips(id) on delete cascade,
      member_id uuid not null references public.trip_members(id) on delete cascade,
      kind text not null check (kind in ('flight', 'hotel')),
      details jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )$f$, trip_id_type);
end $$;

create index if not exists member_reservations_member_idx on public.member_reservations (member_id);

-- No policies: only the server (service role) can read or write
alter table public.member_reservations enable row level security;
revoke all on public.member_reservations from anon, authenticated;
