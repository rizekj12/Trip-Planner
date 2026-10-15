-- Finishes issue #31: removes the old keys from itinerary_data.
-- Run once in Supabase → SQL Editor, AFTER the app version that reads trips.status and
-- trip_food_spots is deployed (and after split-trip-data.sql). Safe to run again.
--
-- From here on only `revision` is maintained by the trigger; nothing copies old keys anymore.

-- The trigger from split-trip-data.sql already copied everything the old version wrote
update public.trips
set itinerary_data = itinerary_data - '_status' - '_error' - '_started_at' - '_draft' - '_pdf_downloaded_at' - '_food_spots' - '_homebases'
where itinerary_data ?| array['_status', '_error', '_started_at', '_draft', '_pdf_downloaded_at', '_food_spots', '_homebases'];

create or replace function public.trips_before_write()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    new.revision := coalesce(old.revision, 0) + 1;
  end if;
  return new;
end $$;

drop function if exists public.copy_legacy_food_spots(anyelement, jsonb);
