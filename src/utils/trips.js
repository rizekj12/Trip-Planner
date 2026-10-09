import { supabase } from "./supabase";

function calcDuration(formData) {
  const cities = formData?.cities || [];
  if (!cities.length) return null;
  const first = cities[0].checkIn;
  const last = cities[cities.length - 1].checkOut;
  if (!first || !last) return null;
  return Math.ceil((new Date(last) - new Date(first)) / (1000 * 60 * 60 * 24));
}

// Inserts a new trip row, or updates it when `id` is given
async function upsertTrip(id, formData, extra) {
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    user_id: user.id,
    cities: (formData.cities || []).map(c => c.name).filter(Boolean),
    duration: calcDuration(formData),
    travel_style: formData.travelStyle || null,
    vacation_type: formData.vacationType || null,
    ...extra,
  };

  const query = id
    ? supabase.from("trips").update(payload).eq("id", id)
    : supabase.from("trips").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

// A pending trip older than this is treated as failed (e.g. the server restarted mid-generation)
const PENDING_TIMEOUT_MS = 10 * 60 * 1000;

// "draft" | "pending" | "ready" | "failed" — stored inside itinerary_data so no schema change is needed.
// Rows saved before statuses existed have no _status and count as ready.
export function tripStatus(trip) {
  const data = trip?.itinerary_data || {};
  if (data._draft) return "draft";
  if (data._status === "failed") return "failed";
  if (data._status === "pending") {
    const age = Date.now() - new Date(data._started_at).getTime();
    return age > PENDING_TIMEOUT_MS ? "failed" : "pending";
  }
  return "ready";
}

export function saveTrip({ id, country, formData, itinerary }) {
  return upsertTrip(id, formData, {
    destination: country,
    // store form_data nested so we can read dates back on the dashboard
    itinerary_data: { ...itinerary, _form_data: formData, _status: "ready" },
  });
}

export function saveFailed({ id, formData, error }) {
  return upsertTrip(id, formData, {
    destination: formData.country || null,
    itinerary_data: { _form_data: formData, _status: "failed", _error: error },
  });
}

// Marks a trip as generating; the server (or mock mode) fills in the itinerary later.
export function savePending({ id, formData }) {
  return upsertTrip(id, formData, {
    destination: formData.country || null,
    itinerary_data: { _form_data: formData, _status: "pending", _started_at: new Date().toISOString() },
  });
}

// Saves an in-progress questionnaire so the user can pick it back up later.
// Pass `id` to update an existing draft instead of creating a new row.
export function saveDraft({ id, formData }) {
  return upsertTrip(id, formData, {
    destination: formData.country || null,
    itinerary_data: { _form_data: formData, _draft: true },
  });
}

export async function fetchTrips() {
  const { data, error } = await supabase
    .from("trips")
    .select("id, destination, cities, duration, itinerary_data, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchTrip(id) {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrip(id) {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}

// Applies `update(formData) => newFormData` to a trip's saved questionnaire answers (where
// reservations live). Re-reads the row first so it builds on the latest saved version.
export async function updateTripFormData(id, update) {
  const trip = await fetchTrip(id);
  const data = trip.itinerary_data || {};
  const itinerary_data = { ...data, _form_data: update(data._form_data || {}) };
  const { data: row, error } = await supabase
    .from("trips")
    .update({ itinerary_data })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row;
}
