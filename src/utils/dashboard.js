// Everything the dashboard derives from the user's trips
import { tripStatus } from "./trips";
import { tripRange, todayIso, daysBetween } from "./calendar";
import { getHotels } from "./reservations";

// Splits trips into upcoming (not over yet: drafts and undated trips included), soonest
// first, and past, most recent first. `next` is the soonest dated, non-draft upcoming trip.
export function describeTrips(trips, today = todayIso()) {
  const all = trips.map((trip) => {
    const range = tripRange(trip);
    return { trip, range, status: tripStatus(trip), isPast: !!range && range.end < today };
  });
  const upcoming = all
    .filter((t) => !t.isPast)
    .sort((a, b) => (a.range?.start ?? "9999").localeCompare(b.range?.start ?? "9999"));
  const past = all.filter((t) => t.isPast).sort((a, b) => b.range.end.localeCompare(a.range.end));
  const next = upcoming.find((t) => t.range && t.status !== "draft") || null;
  return { upcoming, past, next };
}

// Countdown for a trip: { mode: "before", days } or { mode: "during", day, of }
export function countdown(range, today = todayIso()) {
  if (range.start > today) return { mode: "before", days: daysBetween(today, range.start) };
  return {
    mode: "during",
    day: daysBetween(range.start, today) + 1,
    of: Math.max(1, daysBetween(range.start, range.end)),
  };
}

// How far along the wait is, 0-1: from when the trip was created to when it starts
export function waitProgress(trip, range, today = todayIso()) {
  const created = (trip.created_at || "").slice(0, 10) || today;
  const total = daysBetween(created, range.start);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, daysBetween(created, today) / total));
}

// Pill shown on an upcoming trip: { label, tone }
export function tripBadge({ status, range }, today = todayIso()) {
  if (status === "draft") return { label: "Draft", tone: "slate" };
  if (status === "pending") return { label: "Generating…", tone: "amber" };
  if (status === "failed") return { label: "Failed", tone: "red" };
  if (!range) return { label: "Ready", tone: "green" };
  if (range.start <= today) return { label: "Happening now", tone: "green" };
  const days = daysBetween(today, range.start);
  return { label: days === 1 ? "Tomorrow" : `In ${days} days`, tone: "violet" };
}

// "Before you go" checklist for the next trip, from what the app actually knows.
// Each item links somewhere (`to`) or triggers the PDF download (`action: "pdf"`).
export function beforeYouGo({ trip, status }) {
  const data = trip.itinerary_data || {};
  const form = data._form_data || {};
  const flights = form.reservations?.flights?.length || 0;
  const hotelCode = getHotels(form).some((h) => h.confirmationCode);
  const reservations = `/trip/${trip.id}?section=reservations`;
  return [
    {
      key: "itinerary",
      done: status === "ready",
      label: status === "ready" ? "Itinerary ready" : status === "pending" ? "Itinerary being created…" : "Itinerary needs another try",
      to: `/trip/${trip.id}`,
    },
    { key: "flights", done: flights > 0, label: flights ? `Flights added (${flights})` : "Add your flights", to: reservations },
    { key: "hotel", done: hotelCode, label: hotelCode ? "Hotel confirmation saved" : "Add your hotel confirmation", to: reservations },
    {
      key: "pdf",
      done: !!data._pdf_downloaded_at,
      label: data._pdf_downloaded_at ? "Offline PDF downloaded" : "Download your offline PDF",
      action: status === "ready" ? "pdf" : null,
    },
  ];
}

// Totals across trips that have already happened
export function travelStats(past) {
  const taken = past.filter((t) => t.status !== "draft");
  return {
    trips: taken.length,
    countries: new Set(taken.map((t) => t.trip.destination).filter(Boolean)).size,
    days: taken.reduce((sum, t) => sum + Math.max(0, daysBetween(t.range.start, t.range.end)), 0),
  };
}

export function firstName(user) {
  const full = (user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim();
  return full.split(/\s+/)[0] || "";
}
