// Longest trip we generate. Keep in sync with MAX_TRIP_DAYS in server/itinerary.js,
// which enforces it (this copy only drives the questionnaire UI).
export const MAX_TRIP_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtc = (iso) => Date.parse(`${iso}T00:00:00Z`);

// Days from the earliest check-in to the latest check-out across all cities,
// or null until there's at least one of each
export function tripLengthDays(cities = []) {
  const checkIns = cities.map((c) => c.checkIn).filter(Boolean).map(toUtc);
  const checkOuts = cities.map((c) => c.checkOut).filter(Boolean).map(toUtc);
  if (!checkIns.length || !checkOuts.length) return null;
  return Math.round((Math.max(...checkOuts) - Math.min(...checkIns)) / DAY_MS);
}

// "2026-11-03" + 14 days -> "2026-11-17"
export function addDays(iso, days) {
  return new Date(toUtc(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

// The latest check-out allowed, given the earliest check-in so far (null if none yet)
export function latestCheckOut(cities = []) {
  const checkIns = cities.map((c) => c.checkIn).filter(Boolean).sort();
  return checkIns.length ? addDays(checkIns[0], MAX_TRIP_DAYS) : null;
}
