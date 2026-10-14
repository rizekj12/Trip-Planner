import { supabase } from "./supabase";
import { tripLengthDays } from "../../shared/tripLength.js";
import { apiJson } from "./api";
import { emptyTripAlbum } from "./photos";

// Inserts a new trip row, or updates it when `id` is given
async function upsertTrip(id, formData, extra) {
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    user_id: user.id,
    cities: (formData.cities || []).map(c => c.name).filter(Boolean),
    // Same calculation the server enforces and uses in the prompt
    duration: tripLengthDays(formData?.cities),
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

// A pending trip older than this is shown as failed. Only a last resort: the server itself
// retries generation after a restart and marks the trip failed in the database (issue #29),
// well within this time (10 minutes per attempt, two attempts).
const PENDING_TIMEOUT_MS = 30 * 60 * 1000;

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

// How trips are read (issue #62):
// - The user's own trips come straight from Supabase (row-level security: owner only).
// - Trips shared with them come from the server (GET /api/trips/:id/shared), which leaves
//   out the organizer's reservations and confirmation codes. Members can't select `trips`
//   directly, so those never reach a partner's browser.
// Both are filtered by user_id here as well, so a member never relies on the database to
// hide another person's row.

const currentUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Please sign in");
  return session.user.id;
};

// A trip shared with the user (they're an approved member), without private details
export const fetchSharedTrip = (id) => apiJson("GET", `/api/trips/${encodeURIComponent(id)}/shared`, null, { auth: true });

// Every trip the user owns or has joined, newest first. user_id tells the dashboard which
// ones are shared with (not owned by) the user.
export async function fetchTrips() {
  const userId = await currentUserId();
  const [own, shared] = await Promise.all([
    supabase
      .from("trips")
      .select("id, user_id, destination, cities, duration, itinerary_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    fetchSharedTrips(userId),
  ]);
  if (own.error) throw own.error;
  return [...own.data, ...shared].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

// The trips the user has been approved to join, through the server. One that can't be loaded
// (e.g. they were just removed) is left out rather than failing the whole list.
async function fetchSharedTrips(userId) {
  const { data: memberships, error } = await supabase
    .from("trip_members")
    .select("trip_id")
    .eq("user_id", userId)
    .eq("status", "approved");
  if (error) throw error;
  const trips = await Promise.all(
    memberships.map((m) =>
      fetchSharedTrip(m.trip_id).catch((err) => {
        console.warn("Couldn't load shared trip", m.trip_id, err.message);
        return null;
      })
    )
  );
  return trips.filter(Boolean);
}

// One of the user's own trips, in full, or null if it isn't theirs
async function fetchOwnTrip(id) {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

// A trip the user owns (in full) or has joined (shared view, without private details)
export async function fetchTrip(id) {
  return (await fetchOwnTrip(id)) || fetchSharedTrip(id);
}

// For changes: only the organizer's own trip, in full, so a shared view (with the private
// details removed) can never be written back over the real data
async function fetchTripToChange(id) {
  const trip = await fetchOwnTrip(id);
  if (!trip) throw new Error("Only the trip's organizer can change it");
  return trip;
}

export async function deleteTrip(id) {
  // Photos first: deleting the trip's row removes the album's rows but can't remove the files
  // from storage. Drafts never have photos, and mock mode may have no server.
  if (import.meta.env.VITE_USE_MOCK_DATA !== "true") await emptyTripAlbum(id);
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}

// Applies `update(formData) => newFormData` to a trip's saved questionnaire answers (where
// reservations live). Re-reads the row first so it builds on the latest saved version.
export async function updateTripFormData(id, update) {
  const trip = await fetchTripToChange(id);
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

// Merges `patch` into a trip's itinerary_data, re-reading the row first so it builds on the
// latest saved version (the server may have written food spots etc. in the meantime)
export async function patchItineraryData(id, patch) {
  const trip = await fetchTripToChange(id);
  const { data: row, error } = await supabase
    .from("trips")
    .update({ itinerary_data: { ...trip.itinerary_data, ...patch } })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row;
}

// Remembered so the dashboard's "Before you go" checklist can tick it off
export function markPdfDownloaded(id) {
  return patchItineraryData(id, { _pdf_downloaded_at: new Date().toISOString() });
}
