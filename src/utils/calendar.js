// Date helpers for the trips calendar. Days are handled as "YYYY-MM-DD" strings, which
// compare correctly as plain strings and avoid time-zone surprises.

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");

// Local-date ISO string for a Date
export const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayIso = () => toIso(new Date());

// A month is { year, month } with month 0-11
export const monthOf = (iso) => ({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 });
export const addMonths = ({ year, month }, n) => {
  const d = new Date(year, month + n, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};
export const monthIndex = ({ year, month }) => year * 12 + month;
export const monthLabel = ({ year, month }) =>
  new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

// The month's weeks (Sunday first), as arrays of 7 ISO dates; days outside the month
// are included so every week is full
export function monthWeeks({ year, month }) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const last = new Date(year, month + 1, 0);
  const weeks = [];
  for (let d = new Date(start); d <= last; ) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(toIso(d));
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// First check-in to last check-out across a trip's cities, or null without dates
export function tripRange(trip) {
  const cities = trip.itinerary_data?._form_data?.cities || [];
  const checkIns = cities.map((c) => c.checkIn).filter(Boolean).sort();
  const checkOuts = cities.map((c) => c.checkOut).filter(Boolean).sort();
  if (!checkIns.length) return null;
  return { start: checkIns[0], end: checkOuts[checkOuts.length - 1] || checkIns[0] };
}

// Bars to draw in one week: each trip overlapping it, with its first/last column (0-6) and
// a lane (row) so overlapping trips stack instead of colliding
export function weekSegments(week, trips) {
  const weekStart = week[0];
  const weekEnd = week[6];
  const segments = trips
    .filter((t) => t.start <= weekEnd && t.end >= weekStart)
    .map((t) => ({
      trip: t,
      startCol: t.start < weekStart ? 0 : week.indexOf(t.start),
      endCol: t.end > weekEnd ? 6 : week.indexOf(t.end),
      continuesBefore: t.start < weekStart,
      continuesAfter: t.end > weekEnd,
    }))
    .sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol);

  const laneEnds = []; // last column used in each lane
  for (const seg of segments) {
    let lane = laneEnds.findIndex((end) => end < seg.startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = seg.endCol;
    seg.lane = lane;
  }
  return segments;
}

export function formatRange({ start, end }) {
  const fmt = (iso, opts) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", opts);
  if (start === end) return fmt(start, { month: "short", day: "numeric" });
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" })}`;
}
