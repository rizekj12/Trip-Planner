-- Drops three tables left over from the Japan-only version of the app (issue #30).
--
-- members, catalog_spots and day_selections each had an "Allow all public access" policy
-- (USING (true) WITH CHECK (true), every role), so anyone with the public anon key could
-- read, change or delete their rows. Nothing in the app reads them; the only use left was
-- AuthGate upserting a members row on sign-in, removed in the same change.
-- catalog_spots and day_selections have policies that read members, so they go first.

drop table if exists public.day_selections;
drop table if exists public.catalog_spots;
drop table if exists public.members;
