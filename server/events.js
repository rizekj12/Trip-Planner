// Local events from a real events API (issue #36). Events used to be written by Claude
// alongside the itinerary, so dates, prices and ticket links could be invented. Now:
//   1. For each city, search Ticketmaster's Discovery API around the city for the dates of
//      that stay (TICKETMASTER_API_KEY; free key at developer.ticketmaster.com).
//   2. Claude picks the ones that best fit the trip and writes a sentence about each, using
//      only the listing's own details. It can only choose from the list: an id it makes up
//      is dropped, and every date, time, venue, price and link comes from Ticketmaster.
//   3. Without Claude (no key, or it fails) the soonest events are used instead.
// eventsForTrip never throws: a trip without events is better than a failed trip.
import Anthropic from "@anthropic-ai/sdk";
import { geocodeCity } from "./geoapify.js";
import { logger } from "./logger.js";

const TICKETMASTER_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const RADIUS_KM = 40;
const RESULTS_PER_CITY = 60;
const MAX_CANDIDATES = 40; // sent to Claude to choose from
export const MAX_EVENTS = 8;
// Ticketmaster allows 5 requests a second
const REQUEST_GAP_MS = 250;

// ---- Ticketmaster ----------------------------------------------------------------------------

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
// Geohash of a point (Ticketmaster's geoPoint; its latlong parameter is deprecated)
export function geohash(lat, lon, precision = 9) {
  const range = { lat: [-90, 90], lon: [-180, 180] };
  let hash = "";
  let bits = 0;
  let value = 0;
  let evenBit = true;
  while (hash.length < precision) {
    const [axis, coord] = evenBit ? ["lon", lon] : ["lat", lat];
    const mid = (range[axis][0] + range[axis][1]) / 2;
    if (coord >= mid) {
      value = (value << 1) | 1;
      range[axis][0] = mid;
    } else {
      value <<= 1;
      range[axis][1] = mid;
    }
    evenBit = !evenBit;
    if (++bits === 5) {
      hash += BASE32[value];
      bits = 0;
      value = 0;
    }
  }
  return hash;
}

// Ticketmaster's segment/genre -> the app's event categories (src/components/EventImage.jsx)
export function categoryOf(classifications = []) {
  const c = classifications.find((x) => x.primary) || classifications[0] || {};
  const segment = c.segment?.name || "";
  const genre = c.genre?.name || "";
  if (/festival|fair/i.test(genre)) return "Festival";
  if (/food|drink|wine|beer/i.test(genre)) return "Food & Drink";
  if (/music/i.test(segment)) return "Music & Dance";
  if (/sport/i.test(segment)) return "Sports & Recreation";
  if (/arts|theatre|film/i.test(segment)) return "Arts & Culture";
  return "Other";
}

// "$25 – $80", "From $25", or null
export function priceOf(priceRanges = []) {
  const p = priceRanges.find((r) => r.min != null) || null;
  if (!p) return null;
  const money = (n) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency || "USD", maximumFractionDigits: 0 }).format(n);
    } catch {
      return String(Math.round(n));
    }
  };
  if (p.max != null && p.max > p.min) return `${money(p.min)} – ${money(p.max)}`;
  return `From ${money(p.min)}`;
}

const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const prettyTime = (hhmmss) => {
  if (!hhmmss) return "Time TBA";
  const [h, m] = hhmmss.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// A Ticketmaster event in the shape the app already uses for events (EventsPanel, EventModal,
// the PDF), or null if it isn't usable (no date, cancelled, postponed)
export function toEvent(e) {
  const isoDate = e?.dates?.start?.localDate;
  const status = e?.dates?.status?.code;
  if (!e?.id || !e.name || !isoDate || ["cancelled", "canceled", "postponed"].includes(status)) return null;
  const venue = e._embedded?.venues?.[0] || {};
  const image = (e.images || [])
    .filter((i) => i.ratio === "16_9" && !i.fallback)
    .sort((a, b) => Math.abs(a.width - 1024) - Math.abs(b.width - 1024))[0];
  const genre = e.classifications?.find((x) => x.primary)?.genre?.name;
  return {
    id: `tm_${e.id}`,
    title: e.name,
    isoDate,
    date: prettyDate(isoDate),
    time: prettyTime(e.dates.start.localTime),
    location: venue.name || null,
    address: [venue.address?.line1, venue.city?.name].filter(Boolean).join(", ") || null,
    city: venue.city?.name || null,
    category: categoryOf(e.classifications),
    genre: genre && genre !== "Undefined" ? genre : null,
    price: priceOf(e.priceRanges),
    ticketLink: e.url || null,
    website: null,
    image: image?.url || null,
    description: null,
    source: "ticketmaster",
  };
}

let nextSlot = 0;
async function throttledFetch(url, signal) {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + REQUEST_GAP_MS;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  return fetch(url, { signal });
}

// Events within RADIUS_KM of a point between two dates (inclusive), soonest first
export async function searchEvents({ lat, lon, from, to, apiKey, signal }) {
  const params = new URLSearchParams({
    apikey: apiKey,
    geoPoint: geohash(lat, lon),
    radius: String(RADIUS_KM),
    unit: "km",
    startDateTime: `${from}T00:00:00Z`,
    endDateTime: `${to}T23:59:59Z`,
    size: String(RESULTS_PER_CITY),
    sort: "date,asc",
    locale: "*",
  });
  const res = await throttledFetch(`${TICKETMASTER_URL}?${params}`, signal);
  if (!res.ok) throw new Error(`Ticketmaster returned ${res.status}`);
  const data = await res.json();
  return (data._embedded?.events || [])
    .map(toEvent)
    .filter(Boolean)
    // Times are searched in UTC; keep only events whose local date is in the stay
    .filter((ev) => ev.isoDate >= from && ev.isoDate <= to);
}

// One listing per show: Ticketmaster often lists the same show several times (dates, packages)
export function dedupe(events) {
  const seen = new Set();
  return events.filter((ev) => {
    const key = ev.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---- Choosing ----------------------------------------------------------------------------------

// Keeps only picks that are real candidates (by id), in date order, each with its description
export function applyPicks(candidates, picks = []) {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const chosen = [];
  for (const p of picks) {
    const ev = byId.get(p?.id);
    if (!ev || chosen.some((c) => c.id === ev.id)) continue;
    const description = typeof p.description === "string" ? p.description.trim().slice(0, 300) : "";
    chosen.push({ ...ev, description: description || null });
    if (chosen.length === MAX_EVENTS) break;
  }
  return chosen.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

// Without Claude: the soonest events, a few from each city, with a plain description
export function fallbackPicks(candidates) {
  return candidates.slice(0, MAX_EVENTS).map((ev) => ({
    id: ev.id,
    description: [ev.genre || ev.category, ev.location && `at ${ev.location}`].filter(Boolean).join(" "),
  }));
}

function pickPrompt(candidates, formData) {
  const list = candidates
    .map((c) => `${c.id} | ${c.title} | ${c.date} ${c.time} | ${[c.genre, c.category].filter(Boolean).join(", ")} | ${c.location || ""}, ${c.city || ""}`)
    .join("\n");
  return `A traveler is visiting ${formData.country} (${(formData.cities || []).map((c) => c.name).join(", ")}).
Vacation type: ${formData.vacationType || "balanced"}. Travel style: ${formData.travelStyle || "flexible"}.

These are real events from a ticketing service during their stay (id | name | date | type | venue):
${list}

Pick up to ${MAX_EVENTS} that best fit this trip, with some variety. For each, write ONE short sentence
saying what it is and why it suits the trip. Use only the information given: don't add prices,
times, performers or details that aren't in the list. Only use ids from the list.

Respond with ONLY valid JSON (no markdown):
{"picks": [{"id": "tm_...", "description": "..."}]}`;
}

const PICK_MODEL = "claude-sonnet-5";

async function pickWithClaude(candidates, formData, { anthropicKey, signal, usage }) {
  const client = new Anthropic({ apiKey: anthropicKey });
  const message = await client.messages.create(
    {
      model: PICK_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: pickPrompt(candidates, formData) }],
    },
    { signal }
  );
  usage?.add(PICK_MODEL, message.usage);
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const picks = JSON.parse(json).picks;
  if (!Array.isArray(picks)) throw new Error("No picks in reply");
  return picks;
}

// ---- The trip ----------------------------------------------------------------------------------

// { events, source, checkedAt } for a trip. source: "ticketmaster" (searched; events may be
// empty if nothing was on) or "unavailable" (no key, or every search failed). Never throws.
// `usage` (server/usage.js) collects the token usage of the Claude call that picks events.
export async function eventsForTrip(formData, { ticketmasterKey, geoapifyKey, anthropicKey, signal, usage } = {}) {
  const checkedAt = new Date().toISOString();
  if (!ticketmasterKey) {
    logger.warn("TICKETMASTER_API_KEY not set; skipping local events");
    return { events: [], source: "unavailable", checkedAt };
  }

  const stays = (formData.cities || []).filter((c) => c?.name && c.checkIn && c.checkOut);
  let searched = 0;
  const found = [];
  for (const stay of stays) {
    try {
      const point = geoapifyKey ? await geocodeCity(stay.name, formData.country, geoapifyKey) : null;
      if (!point) continue;
      found.push(...(await searchEvents({ lat: point.lat, lon: point.lon, from: stay.checkIn, to: stay.checkOut, apiKey: ticketmasterKey, signal })));
      searched++;
    } catch (err) {
      if (signal?.aborted) break;
      logger.warn({ err: err.message, city: stay.name }, "Event search failed for a city");
    }
  }
  if (!searched) return { events: [], source: "unavailable", checkedAt };

  const candidates = dedupe(found.sort((a, b) => a.isoDate.localeCompare(b.isoDate))).slice(0, MAX_CANDIDATES);
  if (!candidates.length) return { events: [], source: "ticketmaster", checkedAt };

  let picks;
  if (anthropicKey) {
    try {
      picks = await pickWithClaude(candidates, formData, { anthropicKey, signal, usage });
    } catch (err) {
      logger.warn({ err: err.message }, "Couldn't pick events with Claude; using the soonest");
    }
  }
  let events = applyPicks(candidates, picks || fallbackPicks(candidates));
  if (!events.length) events = applyPicks(candidates, fallbackPicks(candidates));
  return { events, source: "ticketmaster", checkedAt };
}
