import { supabase } from "./supabase";
import { tripLengthDays } from "../../shared/tripLength.js";
import { apiJson } from "./api";
import { emptyTripAlbum } from "./photos";
import { toTrip, withoutLegacyKeys, TRIP_STATUS_COLUMNS } from "../../shared/tripRow.js";

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
  return toTrip(data, []);
}

// A pending trip older than this is shown as failed. Only a last resort: the server itself
// retries generation after a restart and marks the trip failed in the database (issue #29),
// well within this time (10 minutes per attempt, two attempts).
const PENDING_TIMEOUT_MS = 30 * 60 * 1000;

// "draft" | "pending" | "ready" | "failed", from the trip's status column (issue #31)
export function tripStatus(trip) {
  const status = trip?.status || "ready";
  if (status === "pending") {
    const age = Date.now() - new Date(trip.started_at).getTime();
    return age > PENDING_TIMEOUT_MS ? "failed" : "pending";
  }
  return status;
}

export function saveTrip({ id, country, formData, itinerary }) {
  return upsertTrip(id, formData, {
    destination: country,
    status: "ready",
    error: null,
    // store form_data nested so we can read dates back on the dashboard
    itinerary_data: { ...itinerary, _form_data: formData },
  });
}

export function saveFailed({ id, formData, error }) {
  return upsertTrip(id, formData, {
    destination: formData.country || null,
    status: "failed",
    error,
    itinerary_data: { _form_data: formData },
  });
}

// Marks a trip as generating; the server (or mock mode) fills in the itinerary later.
export function savePending({ id, formData }) {
  return upsertTrip(id, formData, {
    destination: formData.country || null,
    status: "pending",
    error: null,
    started_at: new Date().toISOString(),
    itinerary_data: { _form_data: formData },
  });
}

// Saves an in-progress questionnaire so the user can pick it back up later.
// Pass `id` to update an existing draft instead of creating a new row.
export function saveDraft({ id, formData }) {
  return upsertTrip(id, formData, {
    destination: formData.country || null,
    status: "draft",
    itinerary_data: { _form_data: formData },
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
      .select(["id", "user_id", "destination", "cities", "duration", "itinerary_data", "created_at", ...TRIP_STATUS_COLUMNS].join(", "))
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    fetchSharedTrips(userId),
  ]);
  if (own.error) throw own.error;
  return [...own.data.map((row) => toTrip(row)), ...shared].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
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

// One of the user's own trips, in full with its food spots, or null if it isn't theirs
async function fetchOwnTrip(id) {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const food = await supabase.from("trip_food_spots").select("city, spots, homebase, homebase_checked_at").eq("trip_id", id);
  if (food.error) throw food.error;
  return toTrip(data, food.data);
}

// A trip the user owns (in full) or has joined (shared view, without private details)
export async function fetchTrip(id) {
  return (await fetchOwnTrip(id)) || fetchSharedTrip(id);
}

export async function deleteTrip(id) {
  // Photos first: deleting the trip's row removes the album's rows but can't remove the files
  // from storage. Drafts never have photos, and mock mode may have no server.
  if (import.meta.env.VITE_USE_MOCK_DATA !== "true") await emptyTripAlbum(id);
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}

// Applies `update(formData) => newFormData` to a trip's saved questionnaire answers (where
// reservations live), building on the latest saved version. Organizer only.
export async function updateTripFormData(id, update) {
  await patchTrip(id, { patch: (data) => ({ _form_data: update(data._form_data || {}) }) });
  return fetchTrip(id);
}

// Remembered so the dashboard's "Before you go" checklist can tick it off
export function markPdfDownloaded(id) {
  return patchTrip(id, { columns: { pdf_downloaded_at: new Date().toISOString() } });
}

const MAX_WRITE_ATTEMPTS = 4;

// Writes to one of the user's own trips: `columns` and/or `patch` (an object, or a function
// of the current itinerary_data) merged into itinerary_data. Same rules as the server's
// updateTrip (server/tripData.js): itinerary_data writes only land if nobody else saved the
// trip since it was read (its `revision`); otherwise it re-reads and tries again.
async function patchTrip(id, { columns = {}, patch }) {
  const userId = await currentUserId();
  if (!patch) {
    const { data, error } = await supabase.from("trips").update(columns).eq("id", id).eq("user_id", userId).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("Only the trip's organizer can change it");
    return;
  }
  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
    const { data: row, error: readError } = await supabase
      .from("trips")
      .select("itinerary_data, revision")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw readError;
    if (!row) throw new Error("Only the trip's organizer can change it");

    const current = withoutLegacyKeys(row.itinerary_data);
    const merged = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
    const revision = row.revision ?? 0;
    const { data, error } = await supabase
      .from("trips")
      .update({ ...columns, itinerary_data: merged, revision: revision + 1 })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("revision", revision)
      .select("id");
    if (error) throw error;
    if (data?.length) return;
    // Someone else saved the trip in between: go again on top of their change
  }
  throw new Error("This trip kept changing while saving. Please try again.");
}
