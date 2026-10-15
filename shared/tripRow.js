// How a trip is stored (issue #31), shared by the app and the server:
//   trips.status, error, started_at, pdf_downloaded_at  real columns
//   trips.revision                                      bumped on every update (optimistic concurrency)
//   trips.itinerary_data                                the itinerary (days, spots, events) + _form_data
//   trip_food_spots                                     one row per city: spots + homebase
// See supabase/split-trip-data.sql.

// Keys that used to live in itinerary_data. Never written anymore; removed when read (and by
// supabase/split-trip-data-cleanup.sql) so a stale copy can't be written back.
export const LEGACY_KEYS = ["_status", "_error", "_started_at", "_draft", "_pdf_downloaded_at", "_food_spots", "_homebases"];

export function withoutLegacyKeys(data) {
  const clean = { ...(data || {}) };
  for (const key of LEGACY_KEYS) delete clean[key];
  return clean;
}

// The trip columns the app reads (besides itinerary_data)
export const TRIP_STATUS_COLUMNS = ["status", "error", "started_at", "pdf_downloaded_at"];

// trip_food_spots rows -> { foodSpots: { city: spots }, homebases: { city: homebase } }.
// A city is in homebases only once its homebase was looked up (null = nothing to pin).
export function foodSpotMaps(rows = []) {
  const foodSpots = {};
  const homebases = {};
  for (const row of rows) {
    if (row.spots?.length) foodSpots[row.city] = row.spots;
    if (row.homebase_checked_at) homebases[row.city] = row.homebase ?? null;
  }
  return { foodSpots, homebases };
}

// A trips row (plus its trip_food_spots rows, when loaded) as the app uses it
export function toTrip(row, foodSpotRows) {
  if (!row) return row;
  const trip = { ...row, itinerary_data: withoutLegacyKeys(row.itinerary_data) };
  if (foodSpotRows) Object.assign(trip, foodSpotMaps(foodSpotRows));
  return trip;
}

// What to write to trip_food_spots for one city. Leave `homebase` undefined to keep the
// stored one (e.g. its lookup failed and should be tried again later).
export function foodSpotRow(tripId, city, { spots, homebase } = {}) {
  const row = { trip_id: tripId, city, updated_at: new Date().toISOString() };
  if (spots !== undefined) row.spots = spots;
  if (homebase !== undefined) {
    row.homebase = homebase;
    row.homebase_checked_at = new Date().toISOString();
  }
  return row;
}
