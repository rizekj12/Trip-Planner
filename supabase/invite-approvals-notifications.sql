-- Invite approvals, link expiry and notifications (issue #28).
-- Run once in Supabase → SQL Editor → New query → paste → Run, after travel-crew.sql.
-- Safe to run again.

-- ---- Travel Crew: pending join requests -------------------------------------------------
-- New travelers can wait for the organizer's approval. Existing members stay approved.
alter table public.trip_members
  add column if not exists status text not null default 'approved';

alter table public.trip_members drop constraint if exists trip_members_status_check;
alter table public.trip_members
  add constraint trip_members_status_check check (status in ('pending', 'approved'));

-- Only approved members can view a shared trip (a pending request sees nothing yet). The
-- server checks that in GET /api/trips/:id/shared; members don't read `trips` directly any
-- more (issue #62), so the old "Members can view shared trips" policy is removed here too.
drop policy if exists "Members can view shared trips" on public.trips;

-- ---- Invite links: expiry and the "approve new travelers" setting ------------------------
alter table public.trip_invites
  add column if not exists expires_at timestamptz,
  add column if not exists require_approval boolean not null default true;

-- ---- Notifications ------------------------------------------------------------------------
-- Written by the server (service role). Each user can read their own and mark them read.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,            -- join_request, member_joined, join_approved, itinerary_ready, itinerary_failed
  trip_id text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
