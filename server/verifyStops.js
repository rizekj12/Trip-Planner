// Checks the coordinates Claude gives each stop of an itinerary against Geoapify (issue #35),
// since a wrong pin puts a stop in the wrong place on the day map and in the PDF.
//
// For each stop, a confident venue match near its city (server/geoapify.js geocodePlace):
//   - more than CORRECT_AFTER_KM from Claude's pin: the pin moves to the match ("corrected")
//   - otherwise Claude's pin stays ("verified")
// No match: Claude's pin stays ("unverified"), unless it's also more than FAR_KM from the
// stop's city. Then it's most likely wrong, so the stop keeps its place in the plan but loses
// its pin ("far"). Real day trips that far out (e.g. Tokyo to Hakone) usually match, so they
// keep theirs. The result is recorded on each spot as `location`.
import { geocodeCity, geocodePlace } from "./geoapify.js";
import { logger } from "./logger.js";

export const CORRECT_AFTER_KM = 1;
export const FAR_KM = 50;

// Great-circle distance between two [lat, lon] points, in km
export function distanceKm([lat1, lon1], [lat2, lon2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Where a stop ends up: { coords, location }. `match` is the geocoder's result (or null),
// `center` the city's [lat, lon] (or null if unknown).
export function checkStop(coords, match, center) {
  if (match) {
    const moved = !coords || distanceKm(coords, match.coords) > CORRECT_AFTER_KM;
    return { coords: moved ? match.coords : coords, location: moved ? "corrected" : "verified" };
  }
  if (coords && center && distanceKm(coords, center) > FAR_KM) return { coords: null, location: "far" };
  return { coords, location: "unverified" };
}

// Updates `itinerary.spots` in place. Never throws: without a key, or if a lookup fails,
// Claude's pins are kept as they are.
export async function verifyStops(itinerary, { country }, apiKey, { tripId } = {}) {
  const spots = Object.values(itinerary.spots || {});
  if (!apiKey || !spots.length) return itinerary;

  const cities = [...new Set(spots.map((s) => s.city).filter(Boolean))];
  const centers = new Map(
    await Promise.all(
      cities.map(async (city) => {
        const c = await geocodeCity(city, country, apiKey).catch(() => null);
        return [city, c ? [c.lat, c.lon] : null];
      })
    )
  );

  await Promise.all(
    spots.map(async (spot) => {
      const center = centers.get(spot.city);
      // Without the city's center there's nothing to search around or compare with
      if (!center) return;
      // Name and city only: adding Claude's street address makes matches much less confident
      const text = [spot.title, spot.city, country].filter(Boolean).join(", ");
      const match = await geocodePlace(text, { lat: center[0], lon: center[1] }, apiKey).catch(() => undefined);
      if (match === undefined) return; // the lookup itself failed; keep Claude's pin
      Object.assign(spot, checkStop(spot.coords, match, center));
    })
  );

  const counts = spots.reduce((acc, s) => ({ ...acc, [s.location || "unchecked"]: (acc[s.location || "unchecked"] || 0) + 1 }), {});
  logger.info({ tripId, ...counts }, "Itinerary stops checked");
  return itinerary;
}
