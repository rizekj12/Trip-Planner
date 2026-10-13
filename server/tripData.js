// Saving into a trip's itinerary_data, shared by the API routes and the generation worker

// Merges `patch` into the trip's itinerary_data, re-reading the row right before writing so
// changes made while we were working (e.g. the user editing reservations, which live in
// _form_data) aren't overwritten. Returns the merged data; throws if it couldn't save.
export async function patchItineraryData(supabase, tripId, patch) {
  const { data: row, error: readError } = await supabase
    .from("trips")
    .select("itinerary_data")
    .eq("id", tripId)
    .single();
  if (readError) {
    throw new Error(`Couldn't read trip ${tripId}: ${readError.message}`);
  }
  const merged = { ...row.itinerary_data, ...patch };
  // An update blocked by row-level security returns no error, just no rows, so check both
  const { data: updated, error } = await supabase
    .from("trips")
    .update({ itinerary_data: merged })
    .eq("id", tripId)
    .select("id");
  if (error) {
    throw new Error(`Couldn't save trip ${tripId}: ${error.message}`);
  }
  if (!updated?.length) {
    throw new Error(`Couldn't save trip ${tripId}: no row was updated`);
  }
  return merged;
}
