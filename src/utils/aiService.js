import { days as mockDays } from "../data/days";
import { spots as mockSpots } from "../data/spots";
import { HOTELS } from "../data/hotels";
import { sampleEvents } from "../data/events";
import { supabase } from "./supabase";
import { savePending, saveTrip, saveFailed } from "./trips";
import { usesMiles } from "./helpers";

// Mock itinerary generator
async function generateMockItinerary(_formData) {
  // Mock mode: sample data instead of calling the API. Don't log formData: it holds reservations.

  // Simulate API delay (long enough to see the loading screen)
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Return your existing Japan trip data with events
  const mockItinerary = {
    days: mockDays,
    spots: mockSpots,
    events: sampleEvents,
    hotels: {
      tokyo_akiba: HOTELS.tokyo_akiba,
      kyoto_rokujo: HOTELS.kyoto_rokujo,
      tokyo_tamachi: HOTELS.tokyo_tamachi,
    },
  };

  return mockItinerary;
}

// Saves the trip as pending and kicks off generation without waiting for it.
// The server builds the prompt, calls Claude and writes the itinerary back to the
// trip row, so it finishes even if the user leaves the page. Returns the saved row —
// pending, or failed (with _error) if generation couldn't be started.
export async function startGeneration({ id, formData }) {
  const row = await savePending({ id, formData });

  if (import.meta.env.VITE_USE_MOCK_DATA === "true") {
    generateMockItinerary(formData)
      .then((itinerary) => saveTrip({ id: row.id, country: formData.country, formData, itinerary }))
      .catch(console.error);
    return row;
  }

  try {
    await requestGeneration(row.id);
    return row;
  } catch (err) {
    console.error("Couldn't start generation:", err);
    // Don't leave the trip stuck on pending
    return saveFailed({ id: row.id, formData, error: err.message }).catch(() => row);
  }
}

function requestGeneration(tripId) {
  return postToServer("/api/generate-itinerary", { tripId });
}

// Returns { spots, homebase } for a city on this trip. spots is the full list: the first
// call generates 12, each later call adds 10 more. homebase is the hotel/address location
// ({ type, name, coords }) or null. homebaseOnly skips new spots and just fills in the
// homebase. The server saves both on the trip.
export function loadMoreFoodSpots({ tripId, city, homebaseOnly = false }) {
  return postToServer("/api/food-spots", { tripId, city, homebaseOnly });
}

// Downloads an offline PDF of a ready trip (day maps, stops, events, food spots)
export async function downloadTripPdf({ tripId, filename }) {
  const response = await authedPost("/api/trip-pdf", { tripId, miles: usesMiles() });
  const blob = await response.blob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// POSTs JSON to our Express API and returns the parsed JSON reply
async function postToServer(path, body) {
  const response = await authedPost(path, body);
  return response.json().catch(() => ({}));
}

const authedPost = (path, body) => apiRequest("POST", path, body, { auth: true });

// ---- Travel Crew (server/crew.js) ----

export const getCrew = (tripId) => apiJson("GET", `/api/trips/${tripId}/crew`, null, { auth: true });
// Gets the invite link and settings: { token, expiresAt, requireApproval, travelers, maxTravelers }.
// `options` can reset the link ({ reset: true }) or change { requireApproval }.
export const getInviteToken = (tripId, options = {}) =>
  apiJson("POST", `/api/trips/${tripId}/invite`, options, { auth: true });
export const removeCrewMember = (tripId, memberId) =>
  apiJson("DELETE", `/api/trips/${tripId}/crew/${memberId}`, null, { auth: true });
// Owner answers a join request; `decision` is "approve" or "deny"
export const answerJoinRequest = (tripId, memberId, decision) =>
  apiJson("POST", `/api/trips/${tripId}/crew/${memberId}/${decision}`, null, { auth: true });
// These work without signing in (the invite page and a guest's trip link)
export const getInvite = (token) => apiJson("GET", `/api/invites/${token}`);
export const joinTrip = (token, guest) => apiJson("POST", `/api/invites/${token}/join`, guest || {}, { auth: !guest });
export const getGuestTrip = (guestToken) => apiJson("GET", `/api/guest/${guestToken}`);

// Signed-in GET to our API (hotel search, address checks), parsed as JSON
export const apiGet = (path) => apiJson("GET", path, null, { auth: true });

async function apiJson(method, path, body, options) {
  const response = await apiRequest(method, path, body, options);
  return response.json().catch(() => ({}));
}

// Calls our Express API, with the user's login token when `auth` is set. Returns the
// Response if it succeeded; otherwise throws with the server's error message.
async function apiRequest(method, path, body, { auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  }
  const backendUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

  let response;
  try {
    response = await fetch(`${backendUrl}${path}`, {
      method,
      headers,
      body: body && method !== "GET" ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Couldn't reach the server. Is the backend running?");
  }

  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}));
    throw Object.assign(new Error(error || `Request failed (${response.status})`), { status: response.status });
  }
  return response;
}
