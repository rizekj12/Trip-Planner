// Editing a generated itinerary (issue #37), shared by the app and the server. Each edit is a
// pure function of the itinerary ({ days, spots, ... }) that returns a new one, and refers to
// stops by their spot key, not their position, so it still applies correctly when re-run on
// a newer copy of the trip (the revision check in src/utils/trips.js retries on conflict).
//
// A day's stops are `day.markers` (spot keys, in visiting order); `day.done` lists the keys
// ticked off during the trip.

// Search links for a place, built here rather than asked of Claude (model-written URLs are
// often wrong). `booking` (a search for tickets and reservations) only when asked for.
export const searchLinks = (title, city, { booking = false } = {}) => ({
  youtube: `https://youtube.com/search?q=${encodeURIComponent(title)}`,
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`,
  ...(booking && { booking: `https://www.google.com/search?q=${encodeURIComponent(`${title} ${city || ""} tickets reservations`.trim())}` }),
});

const withDay = (itinerary, dayKey, change) => ({
  ...itinerary,
  days: itinerary.days.map((d) => (d.key === dayKey ? change(d) : d)),
});

// Spots no day uses anymore are dropped, so the map of spots doesn't fill with leftovers
function pruneSpots(itinerary) {
  const used = new Set(itinerary.days.flatMap((d) => d.markers || []));
  return { ...itinerary, spots: Object.fromEntries(Object.entries(itinerary.spots || {}).filter(([k]) => used.has(k))) };
}

// Moves a stop to `toIndex` within its day (clamped to the day's length)
export function moveStop(itinerary, dayKey, spotKey, toIndex) {
  return withDay(itinerary, dayKey, (day) => {
    const markers = (day.markers || []).filter((k) => k !== spotKey);
    if (markers.length === (day.markers || []).length) return day; // not on this day
    const at = Math.max(0, Math.min(toIndex, markers.length));
    return { ...day, markers: [...markers.slice(0, at), spotKey, ...markers.slice(at)] };
  });
}

// Puts the day's stops in this order. Keys not on the day are ignored; any of the day's stops
// missing from `order` keep their place at the end.
export function reorderStops(itinerary, dayKey, order) {
  return withDay(itinerary, dayKey, (day) => {
    const markers = day.markers || [];
    const ordered = [...new Set(order)].filter((k) => markers.includes(k));
    return { ...day, markers: [...ordered, ...markers.filter((k) => !ordered.includes(k))] };
  });
}

// Moves a stop from one day to the end of another
export function moveStopToDay(itinerary, fromDayKey, spotKey, toDayKey) {
  if (fromDayKey === toDayKey) return itinerary;
  const from = itinerary.days.find((d) => d.key === fromDayKey);
  if (!from?.markers?.includes(spotKey) || !itinerary.days.some((d) => d.key === toDayKey)) return itinerary;
  const removed = withDay(itinerary, fromDayKey, (day) => ({
    ...day,
    markers: day.markers.filter((k) => k !== spotKey),
    done: (day.done || []).filter((k) => k !== spotKey),
  }));
  return withDay(removed, toDayKey, (day) => ({ ...day, markers: [...(day.markers || []).filter((k) => k !== spotKey), spotKey] }));
}

export function removeStop(itinerary, dayKey, spotKey) {
  const changed = withDay(itinerary, dayKey, (day) => ({
    ...day,
    markers: (day.markers || []).filter((k) => k !== spotKey),
    done: (day.done || []).filter((k) => k !== spotKey),
  }));
  return pruneSpots(changed);
}

// A key for a new spot that isn't taken yet: "senso_ji", "senso_ji_2", ...
export function spotKeyFor(title, spots = {}) {
  const base =
    String(title || "stop")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "stop";
  if (!spots[base]) return base;
  let n = 2;
  while (spots[`${base}_${n}`]) n++;
  return `${base}_${n}`;
}

// Adds a place (from a place search: { title, address, coords }) as the day's last stop.
// Returns { itinerary, key }.
export function addStop(itinerary, dayKey, place, { booking = false } = {}) {
  const day = itinerary.days.find((d) => d.key === dayKey);
  if (!day) return { itinerary, key: null };
  const key = spotKeyFor(place.title, itinerary.spots);
  const spot = {
    title: place.title,
    address: place.address || "",
    city: day.city || place.city || null,
    coords: place.coords || null,
    img: null,
    links: searchLinks(place.title, day.city, { booking }),
    location: "verified", // it came from the map service
    addedByTraveler: true,
  };
  const changed = withDay({ ...itinerary, spots: { ...itinerary.spots, [key]: spot } }, dayKey, (d) => ({
    ...d,
    markers: [...(d.markers || []), key],
  }));
  return { itinerary: changed, key };
}

// Ticks a stop off (or back on)
export function toggleDone(itinerary, dayKey, spotKey) {
  return withDay(itinerary, dayKey, (day) => {
    if (!(day.markers || []).includes(spotKey)) return day;
    const done = day.done || [];
    return { ...day, done: done.includes(spotKey) ? done.filter((k) => k !== spotKey) : [...done, spotKey] };
  });
}

// Swaps in a regenerated day: its title, notes, rainy-day plan and stops. `spots` are the new
// stops' details by key (keys already made unique against the trip's other spots).
export function replaceDay(itinerary, dayKey, { title, notes, rainyDayBackup, markers }, spots) {
  const changed = withDay({ ...itinerary, spots: { ...itinerary.spots, ...spots } }, dayKey, (day) => {
    const { rainyDayBackup: _old, ...rest } = day;
    return {
      ...rest,
      title,
      notes,
      markers,
      done: [],
      ...(rainyDayBackup && { rainyDayBackup }),
    };
  });
  return pruneSpots(changed);
}

// Puts a removed stop back where it was (undo): `spot` is its details, `index` its old place
export function restoreStop(itinerary, dayKey, spotKey, spot, index) {
  const withSpot = { ...itinerary, spots: { ...itinerary.spots, [spotKey]: itinerary.spots?.[spotKey] || spot } };
  return withDay(withSpot, dayKey, (day) => {
    const markers = (day.markers || []).filter((k) => k !== spotKey);
    const at = Math.max(0, Math.min(index, markers.length));
    return { ...day, markers: [...markers.slice(0, at), spotKey, ...markers.slice(at)] };
  });
}
