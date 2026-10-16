// Builds the itinerary prompt, calls Claude with a JSON schema (structured outputs), validates
// the reply and checks each stop's coordinates (issue #35).
// Runs on the server so generation keeps going even if the user closes the page.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { tripLengthDays } from "../shared/tripLength.js";
import { needsForPrompt } from "../shared/accessibility.js";
import { logger } from "./logger.js";
import { UserFacingError } from "./errors.js";
import { verifyStops } from "./verifyStops.js";

// Helper functions

function getTravelStyleDescription(style) {
  const descriptions = {
    early_bird: "Early riser - start activities early, relax in evenings",
    night_owl: "Night owl - slow mornings, active nights",
    flexible: "Flexible - mix of early and late activities",
  };
  return descriptions[style] || style;
}

function getVacationTypeDescription(type) {
  const descriptions = {
    relaxation: "Relaxation focused - slow pace, spa, leisure",
    adventure: "Adventure focused - active exploration, lots of activities",
    constant: "Constantly moving - packed schedule, see everything",
    balanced: "Balanced - mix of relaxation and exploration",
  };
  return descriptions[type] || type;
}

// Flight timing for pacing the first and last days. Only route, date and departure time are
// sent — never confirmation codes, flight numbers or notes. Empty string if there are none.
export function buildFlightsBlock(formData) {
  const lines = (formData.reservations?.flights || [])
    .filter((f) => f.date && (f.from || f.to))
    .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`))
    .map((f) => `- ${f.from || "?"} to ${f.to || "?"}, departing ${f.date}${f.time ? ` at ${f.time}` : ""} (local time)`);
  if (!lines.length) return "";

  return `
FLIGHTS:
${lines.join("\n")}
`;
}

const MODEL = "claude-sonnet-5";

// The trip's city names, in order, without repeats
const cityNamesOf = (formData) => [...new Set((formData.cities || []).map((c) => c.name).filter(Boolean))];

// What Claude must return. Structured outputs only allow objects with fixed keys, so spots
// come back as a list (the app keeps them as a map keyed by `key`) and coordinates as lat/lon
// fields. `city` can only be one of the trip's cities. Image placeholders and search links
// aren't asked for, and hotels come from the trip's own data; Claude's guess at where each
// hotel is (`homebases`) is only used when it can't be located (see withHotels).
//
// Two forms of the same schema: the JSON schema sent to the API (written out by hand, since
// the SDK's zod converter turns `enum` into a description and the API would no longer enforce
// it), and the zod schema the reply is validated with, which also checks coordinate ranges.
const FIELDS = {
  dayCity: "The city the traveler is in (sleeps in) that day",
  dayTitle: "A short description of the day",
  stops: "Keys of the spots visited this day, in visiting order",
  notes: "Practical tips for the day",
  key: "Short unique id, lowercase letters, digits and underscores, e.g. senso_ji",
  title: "The place's name",
  address: "Street address",
  spotCity: "The trip city this place is in or visited from",
  lat: "Latitude, -90 to 90",
  lon: "Longitude, -180 to 180",
  homebases: "For each city above that lists a hotel or homebase: your best estimate of where it is. Empty if none",
};

export function itineraryJsonSchema(cityNames) {
  const object = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
  const text = (description) => ({ type: "string", description });
  const city = (description) => ({ type: "string", enum: cityNames, description });
  return object({
    days: {
      type: "array",
      items: object({
        city: city(FIELDS.dayCity),
        title: text(FIELDS.dayTitle),
        stops: { type: "array", items: { type: "string" }, description: FIELDS.stops },
        notes: { type: "array", items: { type: "string" }, description: FIELDS.notes },
      }),
    },
    spots: {
      type: "array",
      items: object({
        key: text(FIELDS.key),
        title: text(FIELDS.title),
        address: text(FIELDS.address),
        city: city(FIELDS.spotCity),
        lat: { type: "number", description: FIELDS.lat },
        lon: { type: "number", description: FIELDS.lon },
      }),
    },
    homebases: {
      type: "array",
      description: FIELDS.homebases,
      items: object({
        city: city("The city whose hotel or homebase this is"),
        lat: { type: "number", description: FIELDS.lat },
        lon: { type: "number", description: FIELDS.lon },
      }),
    },
  });
}

export function itinerarySchema(cityNames) {
  const city = z.enum(cityNames);
  return z.object({
    days: z.array(z.object({ city, title: z.string(), stops: z.array(z.string()), notes: z.array(z.string()) })),
    spots: z.array(
      z.object({
        key: z.string(),
        title: z.string(),
        address: z.string(),
        city,
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
      })
    ),
    homebases: z.array(z.object({ city, lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) })),
  });
}

// `traveler`: the organizer's accessibility and dietary needs from their profile, if any
export function buildPrompt(formData, traveler) {
  const numDays = tripLengthDays(formData.cities) ?? 0;
  const flightsBlock = buildFlightsBlock(formData);
  const needs = needsForPrompt(traveler);
  const needsBlock = needs
    ? `
TRAVELER NEEDS (plan the whole trip around these):
${needs}
`
    : "";

  const citiesInfo = formData.cities
    .map((city, i) => {
      let homebaseLine = "- Homebase: none provided, plan a general itinerary for the city";
      if (city.homebaseType === "hotel") {
        homebaseLine = `- Hotel: ${city.hotel.name}, ${city.hotel.address}`;
      } else if (city.homebaseType === "custom") {
        homebaseLine = `- Homebase (not a hotel): ${city.customAddress}`;
      }

      return `
City ${i + 1}: ${city.name}
- Dates: ${city.checkIn} to ${city.checkOut}
${homebaseLine}
`;
    })
    .join("\n");

  return `Create a ${numDays}-day travel itinerary for ${formData.country}.

TRIP DETAILS:
${citiesInfo}${flightsBlock}
PREFERENCES:
- Travel Style: ${getTravelStyleDescription(formData.travelStyle)}
- Vacation Type: ${getVacationTypeDescription(formData.vacationType)}
${needsBlock}
ITINERARY REQUIREMENTS:
- Exactly ${numDays} days, in order, with 3-5 stops per day
- List every place you use under "spots" once, and refer to it from a day's "stops" by its key
- Only use real places; give each one's street address and its actual latitude and longitude
  (they're checked against a map service)
- Match travel style: ${formData.travelStyle}${
    needs
      ? `
- Respect the traveler needs above: choose accessible venues and routes (e.g. step-free stations,
  shorter walks, rest breaks) and food stops that suit any dietary needs; mention access tips in notes`
      : ""
  }${
    flightsBlock
      ? `
- Use the flights to pace the trip: estimate when they land from the departure time and route,
  keep the arrival day light (nothing before they could reach the homebase), and on a departure
  day leave enough time to get to the airport (about 3 hours early for international flights)`
      : ""
  }`;
}

const searchLinks = (title) => ({
  youtube: `https://youtube.com/search?q=${encodeURIComponent(title)}`,
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`,
});

// Claude's validated reply in the shape the app stores: days with markers, and spots as a map
// with [lat, lon] coords. Stops that name a missing spot are dropped, as are days beyond the
// trip's length. Each spot keeps its `city` for the coordinate check (server/verifyStops.js).
export function toItinerary(parsed, numDays) {
  const spots = {};
  for (const spot of parsed.spots) {
    if (!spot.key || spots[spot.key]) continue;
    spots[spot.key] = {
      title: spot.title,
      address: spot.address,
      city: spot.city,
      coords: [spot.lat, spot.lon],
      img: null,
      links: searchLinks(spot.title),
    };
  }

  const days = (numDays ? parsed.days.slice(0, numDays) : parsed.days).map((day, i) => ({
    key: `d${i + 1}`,
    date: `Day ${i + 1} (${day.city})`,
    city: day.city,
    title: day.title,
    markers: [...new Set(day.stops)].filter((key) => spots[key]),
    notes: day.notes,
    hotel: null,
  }));

  // Claude's guesses at where each city's hotel or homebase is, for withHotels; not stored
  const homebaseEstimates = Object.fromEntries(parsed.homebases.map((h) => [h.city, [h.lat, h.lon]]));

  // Events come from a real events API (server/events.js), not the model
  return { days, spots, events: [], homebaseEstimates };
}

// Gives each day its city's hotel or homebase from the questionnaire. The pin is where the
// generation job located it (`homebases`: { city: { coords } | null }, from saved
// coordinates, the address or the hotel's name; server/geoapify.js locateHomebase), or,
// when that failed, Claude's estimate, marked `location: "estimated"`. Removes the estimates
// from the itinerary so they aren't stored.
export function withHotels(itinerary, formData, homebases = {}) {
  const byName = new Map((formData.cities || []).map((c) => [c.name, c]));
  const estimates = itinerary.homebaseEstimates || {};
  delete itinerary.homebaseEstimates;
  itinerary.days = itinerary.days.map((day) => {
    const city = byName.get(day.city);
    if (!city || !["hotel", "custom"].includes(city.homebaseType)) return { ...day, hotel: null };
    const isHotel = city.homebaseType === "hotel";
    const located = homebases[day.city]?.coords;
    const coords = located || estimates[day.city] || null;
    return {
      ...day,
      hotel: {
        key: `homebase_${String(day.city).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: isHotel ? city.hotel?.name || "Your hotel" : "Your homebase",
        address: isHotel ? city.hotel?.address || "" : city.customAddress || "",
        coords,
        location: located ? "verified" : coords ? "estimated" : null,
      },
    };
  });
  return itinerary;
}

// The structured reply, validated against `schema` (itinerarySchema), or throws a
// UserFacingError. Checks the stop reason first: a cut-off or declined reply doesn't match the
// schema, and deserves its own message.
export function parseItineraryResponse(message, schema, numDays) {
  if (message.stop_reason === "max_tokens") {
    throw new UserFacingError("The itinerary was too long and got cut off. Try a shorter trip or fewer cities.");
  }
  if (message.stop_reason === "refusal") {
    throw new UserFacingError("The AI declined to generate this itinerary.");
  }
  try {
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return toItinerary(schema.parse(JSON.parse(text)), numDays);
  } catch (error) {
    logger.error({ err: error, stopReason: message.stop_reason }, "Failed to parse itinerary");
    throw new UserFacingError("Failed to parse AI response. Please try again.", { cause: error });
  }
}

// `signal` (an AbortSignal) stops the request, e.g. when generation runs too long.
// `traveler` ({ needs, notes }) adds the organizer's accessibility and dietary needs.
// `geoapifyKey` checks each stop's coordinates; `tripId` labels the logs.
export async function generateItinerary(formData, apiKey, { signal, traveler, geoapifyKey, tripId } = {}) {
  const client = new Anthropic({ apiKey });
  const numDays = tripLengthDays(formData.cities) ?? 0;
  const cityNames = cityNamesOf(formData);
  // Stream so a large max_tokens doesn't hit HTTP timeouts. Thinking tokens count against
  // max_tokens, so leave plenty of room for a multi-day itinerary. A plain JSON schema format
  // (no parser attached) means the SDK doesn't try to parse a cut-off or declined reply before
  // parseItineraryResponse has checked why it stopped.
  const message = await client.messages
    .stream({
      model: MODEL,
      max_tokens: 64000,
      output_config: { format: { type: "json_schema", schema: itineraryJsonSchema(cityNames) } },
      messages: [{ role: "user", content: buildPrompt(formData, traveler) }],
    }, { signal })
    .finalMessage();

  // Token usage per trip, to track what generation costs
  const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = message.usage || {};
  logger.info(
    { tripId, model: message.model, stopReason: message.stop_reason, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens },
    "Itinerary response"
  );

  const itinerary = parseItineraryResponse(message, itinerarySchema(cityNames), numDays);
  if (itinerary.days.length !== numDays) {
    logger.warn({ tripId, expected: numDays, got: itinerary.days.length }, "Itinerary has a different number of days than the trip");
  }
  return verifyStops(itinerary, formData, geoapifyKey, { tripId });
}
