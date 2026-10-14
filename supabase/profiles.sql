-- Profile details, travel documents and saved travelers (the "My Profile" page).
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
--
-- Name, photo and home country stay on the login (user_metadata). Everything else is here,
-- so personal details aren't copied into every login token. Each user can only read and
-- change their own rows; the server reads a few fields with the service role key (a trip
-- organizer's view of the crew, and accessibility needs when generating an itinerary).

-- ---- Profile details ----------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text check (char_length(phone) <= 40),
  birthday date,
  gender text check (char_length(gender) <= 60),
  bio text check (char_length(bio) <= 280),
  -- null = not answered yet; an empty list = "no needs"
  accessibility_needs text[],
  accessibility_notes text check (char_length(accessibility_notes) <= 500),
  emergency_name text check (char_length(emergency_name) <= 100),
  emergency_relationship text check (char_length(emergency_relationship) <= 60),
  emergency_phone text check (char_length(emergency_phone) <= 40),
  emergency_email text check (char_length(emergency_email) <= 200),
  -- Let the organizer of a trip see the emergency contact while the trip is on
  share_emergency boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---- Travel documents ---------------------------------------------------------------------
-- Only ever visible to their owner: never shared with travel partners or put in trip PDFs.
-- Numbers are encrypted by the server and the browser goes through /api/documents (issue #56,
-- supabase/encrypt-travel-documents.sql), so there are no browser policies on this table.
create table if not exists public.travel_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'passport', 'known_traveler', 'drivers_license', 'visa', 'insurance', 'frequent_flyer', 'vaccination', 'other'
  )),
  label text check (char_length(label) <= 100),      -- e.g. issuing country, airline, insurer
  number_encrypted text,                               -- encrypted by the server, never plain text
  number_last4 text check (char_length(number_last4) <= 4),
  expires_on date,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_documents_user_idx on public.travel_documents (user_id, created_at);

alter table public.travel_documents enable row level security;

drop policy if exists "Users manage their travel documents" on public.travel_documents;
revoke all on public.travel_documents from anon, authenticated;

-- ---- Saved travelers ----------------------------------------------------------------------
-- People someone travels with, to invite to future trips. Private to the person who saved them.
create table if not exists public.saved_travelers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  email text check (char_length(email) <= 200),
  relation text check (char_length(relation) <= 40),
  created_at timestamptz not null default now()
);

create index if not exists saved_travelers_owner_idx on public.saved_travelers (owner_id, name);
-- One entry per email per person
create unique index if not exists saved_travelers_owner_email_idx
  on public.saved_travelers (owner_id, lower(email)) where email is not null;

alter table public.saved_travelers enable row level security;

drop policy if exists "Users manage their saved travelers" on public.saved_travelers;
create policy "Users manage their saved travelers" on public.saved_travelers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
