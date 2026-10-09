// Geoapify geocoding helpers (https://apidocs.geoapify.com/docs/geocoding/)
const GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";

// Only pin a place when the match is an actual venue or building, not a street or district
const PLACE_RESULT_TYPES = new Set(["amenity", "building"]);
const MIN_CONFIDENCE = 0.5;
const SEARCH_RADIUS_M = 30000;
// Free tier allows 5 requests/second, so start at most one request every 250ms (4/sec).
// Requests overlap; only their start times are spaced, and the spacing is shared by every caller.
const REQUEST_GAP_MS = 250;
let nextSlot = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function rateLimitedFetch(url) {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + REQUEST_GAP_MS;
  if (wait) await sleep(wait);
  return fetch(url);
}

async function rateLimitedFetchJson(url) {
  return (await rateLimitedFetch(url)).json();
}

// Center of a city as { lat, lon }, or null if Geoapify can't find it
export async function geocodeCity(city, country, apiKey) {
  const text = [city, country].filter(Boolean).join(", ");
  const url = `${GEOCODE_URL}?text=${encodeURIComponent(text)}&type=city&format=json&apiKey=${apiKey}`;
  const data = await rateLimitedFetchJson(url);
  const result = data.results?.[0];
  return result ? { lat: result.lat, lon: result.lon } : null;
}

async function geocodePlace(text, center, apiKey) {
  const near = `${center.lon},${center.lat}`;
  const url =
    `${GEOCODE_URL}?text=${encodeURIComponent(text)}&format=json&limit=1` +
    `&filter=circle:${near},${SEARCH_RADIUS_M}&bias=proximity:${near}&apiKey=${apiKey}`;
  const data = await rateLimitedFetchJson(url);
  const result = data.results?.[0];
  const confident =
    result && PLACE_RESULT_TYPES.has(result.result_type) && (result.rank?.confidence ?? 0) >= MIN_CONFIDENCE;
  return confident ? { coords: [result.lat, result.lon], address: result.formatted } : null;
}

// Adds `coords` ([lat, lon], or null when there's no confident match) and `address` to each
// spot that hasn't been looked up yet. Spots that already have a `coords` key are left alone.
export async function locatePlaces(spots, { city, country }, apiKey) {
  const todo = spots.filter((s) => !("coords" in s));
  if (!apiKey || !todo.length) return spots;

  const center = await geocodeCity(city, country, apiKey).catch(() => null);
  if (!center) return spots;

  const located = new Map();
  await Promise.all(
    todo.map(async (spot) => {
      const text = [spot.name, spot.neighborhood, city, country].filter(Boolean).join(", ");
      // A failed request (undefined) is retried next time; "no confident match" (null) is final
      const match = await geocodePlace(text, center, apiKey).catch(() => undefined);
      if (match !== undefined) located.set(spot, match || { coords: null });
    })
  );

  return spots.map((s) => (located.has(s) ? { ...s, ...located.get(s) } : s));
}

// Coordinates of the traveler's hotel or custom address in one city, as { type, name, coords },
// or null when they skipped it or the address can't be pinned. Throws on a network error.
export async function locateHomebase(cityForm, apiKey) {
  const { homebaseType, hotel, customAddress } = cityForm || {};
  const address =
    homebaseType === "hotel" ? hotel?.address : homebaseType === "custom" ? customAddress : null;
  if (!address || !apiKey) return null;

  const url = `${GEOCODE_URL}?text=${encodeURIComponent(address)}&format=json&limit=1&apiKey=${apiKey}`;
  const result = (await rateLimitedFetchJson(url)).results?.[0];
  // Same bar as address validation: precise enough to pin, not just a country or state
  const precise =
    result && !["country", "state"].includes(result.result_type) && (result.rank?.confidence ?? 0) >= 0.4;
  if (!precise) return null;

  return {
    type: homebaseType,
    name: homebaseType === "hotel" ? hotel.name || "Your hotel" : "Your homebase",
    coords: [result.lat, result.lon],
  };
}

// locateHomebase for every city in a trip: { [city]: homebase | null }. Never throws; a city
// whose lookup failed is left out so it can be retried later.
export async function homebasesForTrip(formData, apiKey) {
  const entries = await Promise.all(
    (formData.cities || [])
      .filter((c) => c.name)
      .map(async (c) => [c.name, await locateHomebase(c, apiKey).catch(() => undefined)])
  );
  return Object.fromEntries(entries.filter(([, homebase]) => homebase !== undefined));
}

// Static map image (JPEG Buffer) that zooms to fit its markers, or null on failure.
// markers: [{ coords: [lat, lon], label?: "1", hotel?: true }]
// https://apidocs.geoapify.com/docs/maps/static/
export async function staticMapImage(markers, apiKey, { width = 800, height = 420 } = {}) {
  const valid = markers.filter((m) => Array.isArray(m.coords) && m.coords.every(Number.isFinite));
  if (!apiKey || !valid.length) return null;

  const marker = valid
    .map((m) =>
      [
        `lonlat:${m.coords[1]},${m.coords[0]}`,
        "type:awesome",
        `color:${encodeURIComponent(m.hotel ? "#111827" : "#7c3aed")}`,
        m.hotel ? "icon:hotel" : `text:${m.label}`,
        "size:large",
      ].join(";")
    )
    .join("|");

  const url =
    `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${width}&height=${height}` +
    `&scaleFactor=2&marker=${marker}&apiKey=${apiKey}`;
  try {
    const response = await rateLimitedFetch(url);
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
