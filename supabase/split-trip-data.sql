-- Split trips.itinerary_data into real columns and tables (issue #31).
-- Run once in Supabase → SQL Editor → New query → paste → Run, BEFORE deploying the app
-- version that reads these columns. Safe to run again. After that version is live, run
-- split-trip-data-cleanup.sql.
--
-- Before: everything lived in the itinerary_data JSON — _status, _error, _started_at, _draft,
-- _pdf_downloaded_at, _food_spots and _homebases next to the itinerary and _form_data.
-- After:
--   trips.status             'draft' | 'pending' | 'ready' | 'failed' (indexed)
--   trips.error              why generation failed, shown to the traveler
--   trips.started_at         when generation was requested
--   trips.pdf_downloaded_at  the "Before you go" checklist mark
--   trips.revision           bumped on every update; JSON writes check it so two writers
--                            can't silently overwrite each other (optimistic concurrency)
--   trip_food_spots          one row per trip and city: its food spots and homebase location
-- itinerary_data keeps the itinerary itself (days, spots, events) and _form_data.
--
-- Rollout without downtime: this file copies the old keys into the new places and adds a
-- trigger that keeps copying them whenever the CURRENT app writes them, so the old version
-- keeps working until the new one is deployed. The new version never writes the old keys.

-- ---- New columns on trips ----
alter table public.trips
  add column if not exists status text not null default 'ready',
  add column if not exists error text,
  add column if not exists started_at timestamptz,
  add column if not exists pdf_downloaded_at timestamptz,
  add column if not exists revision bigint not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_status_check') then
    alter table public.trips add constraint trips_status_check check (status in ('draft', 'pending', 'ready', 'failed'));
  end if;
end $$;

create index if not exists trips_status_idx on public.trips (status) where status in ('pending', 'failed');

-- ---- Food spots, one row per trip and city ----
do $$
declare trip_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into trip_id_type
  from pg_attribute a
  where a.attrelid = 'public.trips'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.trip_food_spots (
      trip_id %1$s not null references public.trips(id) on delete cascade,
      city text not null,
      spots jsonb not null default '[]'::jsonb,
      -- The city's hotel/address on the map. homebase_checked_at null = not looked up yet;
      -- set with homebase null = looked up, nothing to pin.
      homebase jsonb,
      homebase_checked_at timestamptz,
      updated_at timestamptz not null default now(),
      primary key (trip_id, city)
    )$f$, trip_id_type);
end $$;

-- The organizer reads and writes their trips' food spots (the server does it as them).
-- Travel partners get them through the server's shared view, like the rest of the trip.
alter table public.trip_food_spots enable row level security;
drop policy if exists "Owners manage their trips' food spots" on public.trip_food_spots;
create policy "Owners manage their trips' food spots" on public.trip_food_spots
  for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
grant select, insert, update, delete on public.trip_food_spots to authenticated;

-- ---- Copying the old keys (now, and from the old app version until it's replaced) ----

-- Food spots and homebases in `data` (old shape) into trip_food_spots
create or replace function public.copy_legacy_food_spots(p_trip_id anyelement, data jsonb)
returns void language plpgsql as $$
begin
  if jsonb_typeof(data->'_food_spots') = 'object' then
    insert into public.trip_food_spots as f (trip_id, city, spots)
    select p_trip_id, e.key, coalesce(e.value, '[]'::jsonb)
    from jsonb_each(data->'_food_spots') e
    where jsonb_typeof(e.value) = 'array'
    on conflict (trip_id, city) do update set spots = excluded.spots, updated_at = now();
  end if;
  if jsonb_typeof(data->'_homebases') = 'object' then
    insert into public.trip_food_spots as f (trip_id, city, homebase, homebase_checked_at)
    select p_trip_id, e.key, nullif(e.value, 'null'::jsonb), now()
    from jsonb_each(data->'_homebases') e
    on conflict (trip_id, city) do update
      set homebase = excluded.homebase, homebase_checked_at = excluded.homebase_checked_at, updated_at = now();
  end if;
end $$;

-- Bumps `revision` on every update, and when a write carries the old keys (only the old app
-- version writes them) copies them into the columns and table. The new version strips them
-- from itinerary_data when it writes it, and its column-only updates don't touch
-- itinerary_data, so stale keys left in the JSON never overwrite newer column values.
create or replace function public.trips_before_write()
returns trigger language plpgsql as $$
declare d jsonb := coalesce(new.itinerary_data, '{}'::jsonb);
begin
  if tg_op = 'UPDATE' then
    new.revision := coalesce(old.revision, 0) + 1;
    if new.itinerary_data is not distinct from old.itinerary_data then
      return new;
    end if;
  end if;
  if not (d ?| array['_status', '_error', '_started_at', '_draft', '_pdf_downloaded_at', '_food_spots', '_homebases']) then
    return new;
  end if;

  if coalesce(d->>'_draft', '') = 'true' then
    new.status := 'draft';
  elsif d->>'_status' in ('pending', 'ready', 'failed') then
    new.status := d->>'_status';
  end if;
  if d ? '_error' then new.error := d->>'_error'; end if;
  if d ? '_started_at' then new.started_at := (d->>'_started_at')::timestamptz; end if;
  if d ? '_pdf_downloaded_at' then new.pdf_downloaded_at := (d->>'_pdf_downloaded_at')::timestamptz; end if;
  -- The trip row must already exist for its food spots (it does on update; new trips never
  -- start with food spots)
  if tg_op = 'UPDATE' then
    perform public.copy_legacy_food_spots(new.id, d);
  end if;
  return new;
end $$;

drop trigger if exists trips_before_write on public.trips;
create trigger trips_before_write
  before insert or update on public.trips
  for each row execute function public.trips_before_write();

-- ---- Copy what's there now ----
-- Rows saved before statuses existed have no _status and count as ready (the column default)
update public.trips t set
  status = case
    when coalesce(t.itinerary_data->>'_draft', '') = 'true' then 'draft'
    when t.itinerary_data->>'_status' in ('pending', 'ready', 'failed') then t.itinerary_data->>'_status'
    else t.status
  end,
  error = coalesce(t.itinerary_data->>'_error', t.error),
  started_at = coalesce((t.itinerary_data->>'_started_at')::timestamptz, t.started_at),
  pdf_downloaded_at = coalesce((t.itinerary_data->>'_pdf_downloaded_at')::timestamptz, t.pdf_downloaded_at)
where t.itinerary_data ?| array['_status', '_error', '_started_at', '_draft', '_pdf_downloaded_at'];

select public.copy_legacy_food_spots(t.id, t.itinerary_data)
from public.trips t
where t.itinerary_data ?| array['_food_spots', '_homebases'];
