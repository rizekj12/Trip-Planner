-- Travel partners read shared trips only through the server (issue #62).
-- Run once in Supabase → SQL Editor → New query → paste → Run, after deploying the app
-- version that uses GET /api/trips/:id/shared. Safe to run again.
--
-- The "Members can view shared trips" policy let a travel partner SELECT the whole trips row,
-- including the organizer's reservations and confirmation codes (inside itinerary_data), and
-- receive it over Realtime. Partners now get the trip from the server, which leaves those out,
-- so the policy is removed: `trips` is readable only by its owner again.

drop policy if exists "Members can view shared trips" on public.trips;
