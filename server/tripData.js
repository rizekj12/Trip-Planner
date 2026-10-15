// Reading and writing trips, shared by the API routes and the generation worker (issue #31).
import { foodSpotMaps, foodSpotRow, withoutLegacyKeys } from "../shared/tripRow.js";

const MAX_ATTEMPTS = 4;

// Writes to a trip: `columns` (status, error, ...) and/or `patch`, merged into itinerary_data.
// `patch` is an object, or a function of the current itinerary_data returning one, so it can
// build on the latest saved version.
//
// itinerary_data writes are checked against the row's `revision` (bumped by the database on
// every update): if someone else wrote in between, it re-reads and tries again, so neither
// change is lost. Column-only writes need no check. Returns the saved itinerary_data (or
// undefined for a column-only write); throws if it couldn't save.
export async function updateTrip(supabase, tripId, { columns = {}, patch } = {}) {
  if (!patch) {
    const { data, error } = await supabase.from("trips").update(columns).eq("id", tripId).select("id");
    if (error) throw new Error(`Couldn't save trip ${tripId}: ${error.message}`);
    // An update blocked by row-level security returns no error, just no rows
    if (!data?.length) throw new Error(`Couldn't save trip ${tripId}: no row was updated`);
    return undefined;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data: row, error: readError } = await supabase
      .from("trips")
      .select("itinerary_data, revision")
      .eq("id", tripId)
      .single();
    if (readError) throw new Error(`Couldn't read trip ${tripId}: ${readError.message}`);

    const current = withoutLegacyKeys(row.itinerary_data);
    const merged = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
    const revision = row.revision ?? 0;
    const { data: updated, error } = await supabase
      .from("trips")
      // The database sets revision itself; sending it keeps the in-memory test double honest
      .update({ ...columns, itinerary_data: merged, revision: revision + 1 })
      .eq("id", tripId)
      .eq("revision", revision)
      .select("id");
    if (error) throw new Error(`Couldn't save trip ${tripId}: ${error.message}`);
    if (updated?.length) return merged;

    // Nothing updated: someone else saved first (revision moved on), or we may not write
    const { data: now } = await supabase.from("trips").select("revision").eq("id", tripId).maybeSingle();
    if (!now || (now.revision ?? 0) === revision) throw new Error(`Couldn't save trip ${tripId}: no row was updated`);
  }
  throw new Error(`Couldn't save trip ${tripId}: it kept changing, please try again`);
}

// { foodSpots: { city: spots }, homebases: { city: homebase } } for a trip
export async function loadFoodSpots(supabase, tripId) {
  const { data, error } = await supabase
    .from("trip_food_spots")
    .select("city, spots, homebase, homebase_checked_at")
    .eq("trip_id", tripId);
  if (error) throw new Error(`Couldn't read food spots for trip ${tripId}: ${error.message}`);
  return foodSpotMaps(data || []);
}

// Saves one city's food spots and/or homebase (see foodSpotRow); throws if it couldn't
export async function saveFoodSpots(supabase, tripId, city, values) {
  const { error } = await supabase
    .from("trip_food_spots")
    .upsert(foodSpotRow(tripId, city, values), { onConflict: "trip_id,city" });
  if (error) throw new Error(`Couldn't save food spots for ${city}: ${error.message}`);
}
