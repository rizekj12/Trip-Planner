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

export function saveTrip({ id, country, formData, itinerary }) {
  return upsertTrip(id, formData, {
    destination: country,
    // store form_data nested so we can read dates back on the dashboard
    itinerary_data: { ...itinerary, _form_data: formData },
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
