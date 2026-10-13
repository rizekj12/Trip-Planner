// Trip length, shared by the browser (questionnaire, saved `duration`) and the server (the
// limit it enforces and the day count in the prompt), so they can never disagree (issue #32).
//
// Dates are "YYYY-MM-DD" strings, read as UTC midnight: a calendar date means the same day
// everywhere, and UTC has no daylight-saving jumps, so every day is exactly 24 hours.

// Longest trip we generate: keeps Claude requests (and their cost) bounded
export const MAX_TRIP_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// UTC midnight of a "YYYY-MM-DD" date, or NaN if it isn't one
const toUtc = (iso) => (ISO_DATE.test(iso || "") ? Date.parse(`${iso}T00:00:00Z`) : NaN);

// Days (nights) from the earliest check-in to the latest check-out across all cities, in any
// order. null until there's at least one valid check-in and check-out. Negative if every
// check-out is before the earliest check-in.
export function tripLengthDays(cities = []) {
  const valid = (dates) => dates.map(toUtc).filter(Number.isFinite);
  const checkIns = valid((cities || []).map((c) => c?.checkIn));
  const checkOuts = valid((cities || []).map((c) => c?.checkOut));
  if (!checkIns.length || !checkOuts.length) return null;
  return Math.round((Math.max(...checkOuts) - Math.min(...checkIns)) / DAY_MS);
}

// Whether a trip of this length can be generated (has dates, 1 to MAX_TRIP_DAYS days)
export const isAllowedTripLength = (days) => Number.isInteger(days) && days >= 1 && days <= MAX_TRIP_DAYS;

// "2026-11-03" + 14 days -> "2026-11-17"
export function addDays(iso, days) {
  return new Date(toUtc(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

// The latest check-out allowed, given the earliest check-in so far (null if none yet)
export function latestCheckOut(cities = []) {
  const checkIns = (cities || []).map((c) => c?.checkIn).filter((d) => Number.isFinite(toUtc(d))).sort();
  return checkIns.length ? addDays(checkIns[0], MAX_TRIP_DAYS) : null;
}
