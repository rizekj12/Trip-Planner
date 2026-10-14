-- Shared trip photo album: the organizer and everyone on the trip (members and guests) add
-- photos, optionally tagged to a day of the itinerary.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
-- Needs supabase/travel-crew.sql first (it creates trip_members).
--
-- Only the server (service role) reads or writes the table and the bucket. It checks that the
-- person asking is on the trip, strips photo metadata (e.g. GPS location) and hands the browser
-- short-lived signed links to each photo. Row-level security is on with no policies, and the
-- bucket is private with no storage policies.
--
-- When someone leaves or is removed from a trip, the photos they added stay in the album
-- (the organizer can delete them). Deleting a trip removes its rows here; the app clears the
-- trip's files from the bucket first (DELETE /api/trips/:tripId/photos).

do $$
declare trip_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into trip_id_type
  from pg_attribute a
  where a.attrelid = 'public.trips'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.trip_photos (
      id uuid primary key default gen_random_uuid(),
      trip_id %1$s not null references public.trips(id) on delete cascade,
      -- Who added it: a signed-in person (organizer or member), or a guest's trip_members row
      uploaded_by uuid references auth.users(id) on delete set null,
      member_id uuid references public.trip_members(id) on delete set null,
      uploader_name text not null check (char_length(uploader_name) <= 100),
      uploader_avatar_url text,
      day int check (day between 1 and 60),
      caption text check (char_length(caption) <= 200),
      path text not null,        -- "<trip id>/<photo id>.jpg" in the bucket
      thumb_path text not null,  -- "<trip id>/<photo id>-thumb.jpg"
      type text not null check (type in ('image/jpeg', 'image/png')),
      size int not null check (size between 0 and 10485760),
      created_at timestamptz not null default now()
    )$f$, trip_id_type);
end $$;

create index if not exists trip_photos_trip_idx on public.trip_photos (trip_id, created_at);

-- No policies: only the server (service role) can read or write
alter table public.trip_photos enable row level security;
revoke all on public.trip_photos from anon, authenticated;

-- Private bucket for the photos and their thumbnails (up to 10 MB each)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
