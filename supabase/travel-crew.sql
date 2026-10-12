-- Travel Crew: friends and guests invited to a trip.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
--
-- The server (with the service role key) creates invites and adds/removes members.
-- Signed-in members can VIEW trips they've joined (never edit or delete them).

-- Both tables point at trips.id, using whatever type that column already has
do $$
declare trip_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into trip_id_type
  from pg_attribute a
  where a.attrelid = 'public.trips'::regclass and a.attname = 'id';

  -- One row per person on a trip (besides its owner). Guests have no account: user_id is
  -- null and guest_token is the secret in their personal view-only link.
  execute format($f$
    create table if not exists public.trip_members (
      id uuid primary key default gen_random_uuid(),
      trip_id %1$s not null references public.trips(id) on delete cascade,
      user_id uuid references auth.users(id) on delete cascade,
      role text not null default 'member' check (role in ('member', 'guest')),
      name text not null,
      email text,
      avatar_url text,
      guest_token uuid unique,
      joined_at timestamptz not null default now(),
      unique (trip_id, user_id)
    )$f$, trip_id_type);

  -- One shareable invite link per trip; resetting it replaces the token
  execute format($f$
    create table if not exists public.trip_invites (
      trip_id %1$s primary key references public.trips(id) on delete cascade,
      token uuid not null unique default gen_random_uuid(),
      created_at timestamptz not null default now()
    )$f$, trip_id_type);
end $$;

create index if not exists trip_members_user_id_idx on public.trip_members (user_id);

-- Row-level security: only the server (service role) touches invites; a signed-in member can
-- see their own membership rows, which is what lets the policy below find shared trips.
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

drop policy if exists "Members can see their own memberships" on public.trip_members;
create policy "Members can see their own memberships" on public.trip_members
  for select using (user_id = auth.uid());

drop policy if exists "Members can view shared trips" on public.trips;
create policy "Members can view shared trips" on public.trips
  for select using (
    exists (select 1 from public.trip_members m where m.trip_id = trips.id and m.user_id = auth.uid())
  );
