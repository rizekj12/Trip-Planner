// "Regenerate this day" (issue #37): asks Claude for a new plan for one day, with an optional
// note from the traveler ("more food, less museums"). Only that day is sent, plus the names
// of the other days' stops so they aren't repeated, which keeps it about a day's worth of
// output instead of a whole trip's.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { addDays } from "../shared/tripLength.js";
import { needsForPrompt } from "../shared/accessibility.js";
import { normalizePreferences, preferenceLines } from "../shared/tripPreferences.js";
import { searchLinks, spotKeyFor } from "../shared/itineraryEdits.js";
import { verifyStops } from "./verifyStops.js";
import { logger } from "./logger.js";
import { UserFacingError } from "./errors.js";

const MODEL = "claude-sonnet-5";
const EFFORT = "medium";
export const MAX_NOTE = 300;

// The reply: the same shape as one day of a full itinerary (server/itinerary.js), written out
// as JSON schema for the API and as zod for checking it
function dayJsonSchema(city) {
  const object = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
  const optionalText = (description) => ({ anyOf: [{ type: "string" }, { type: "null" }], description });
  return object({
    title: { type: "string", description: "A short description of the day" },
    stops: { type: "array", items: { type: "string" }, description: "Keys of the spots visited, in visiting order" },
    notes: { type: "array", items: { type: "string" }, description: "Practical tips for the day" },
    rainyDayBackup: optionalText("An indoor alternative if it rains; null unless rainy-day backups were requested"),
    spots: {
      type: "array",
      items: object({
        key: { type: "string", description: "Short unique id, lowercase letters, digits and underscores" },
        title: { type: "string", description: "The place's name" },
        address: { type: "string", description: "Street address" },
        city: { type: "string", enum: [city], description: "The city" },
        lat: { type: "number", description: "Latitude" },
        lon: { type: "number", description: "Longitude" },
        estimatedCost: optionalText("Estimated cost per person in local currency; null unless costs were requested"),
      }),
    },
  });
}

const daySchema = (city) =>
  z.object({
    title: z.string(),
    stops: z.array(z.string()),
    notes: z.array(z.string()),
    rainyDayBackup: z.string().nullable(),
    spots: z.array(
      z.object({
        key: z.string(),
        title: z.string(),
        address: z.string(),
        city: z.literal(city),
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        estimatedCost: z.string().nullable(),
      })
    ),
  });

export function buildDayPrompt({ formData, itinerary, dayIndex, note, traveler }) {
  const day = itinerary.days[dayIndex];
  const start = (formData.cities || []).map((c) => c.checkIn).filter(Boolean).sort()[0];
  const date = start ? addDays(start, dayIndex) : null;
  const city = (formData.cities || []).find((c) => c.name === day.city);
  const homebase =
    city?.homebaseType === "hotel" ? `Staying at ${city.hotel?.name}, ${city.hotel?.address}` :
    city?.homebaseType === "custom" ? `Staying at ${city.customAddress}` : "";
  const elsewhere = itinerary.days
    .filter((_, i) => i !== dayIndex)
    .flatMap((d) => (d.markers || []).map((k) => itinerary.spots?.[k]?.title))
    .filter(Boolean);
  const current = (day.markers || []).map((k) => itinerary.spots?.[k]?.title).filter(Boolean);
  const needs = needsForPrompt(traveler);
  const { output } = normalizePreferences(formData.preferences);

  return `Re-plan one day of a ${itinerary.days.length}-day trip to ${formData.country}.

THE DAY: day ${dayIndex + 1} of ${itinerary.days.length}${date ? `, ${date}` : ""}, in ${day.city}${homebase ? `. ${homebase}` : ""}
Its current plan: ${current.join(", ") || "nothing yet"}
${note ? `\nWHAT THE TRAVELER WANTS CHANGED: "${note}"\n` : ""}
OTHER DAYS ALREADY COVER (don't repeat these): ${elsewhere.join(", ") || "nothing"}

PREFERENCES:
${preferenceLines(formData.preferences).join("\n")}
${needs ? `\nTRAVELER NEEDS (plan around these):\n${needs}\n` : ""}
REQUIREMENTS:
- 3-5 stops, in a sensible visiting order, all real places in or near ${day.city}
- List each stop under "spots" with its street address and actual latitude and longitude, and refer to it from "stops" by its key
${dayIndex === 0 ? "- It's the arrival day: keep it light\n" : ""}${dayIndex === itinerary.days.length - 1 ? "- It's the last day: leave time to get to the airport or station\n" : ""}- ${output.costs ? "Give each spot an estimatedCost" : "Set every spot's estimatedCost to null"}
- ${output.rainyDay ? "Give the day a rainyDayBackup" : "Set rainyDayBackup to null"}`;
}

// A new plan for one day: { title, notes, rainyDayBackup, markers, spots }, where spots are
// new, keyed so they don't clash with the trip's other spots, and checked against the map.
export async function regenerateDay({ formData, itinerary, dayIndex, note, traveler }, { anthropicKey, geoapifyKey, tripId, usage, signal } = {}) {
  const day = itinerary.days[dayIndex];
  const client = new Anthropic({ apiKey: anthropicKey });
  const message = await client.messages
    .stream(
      {
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: EFFORT, format: { type: "json_schema", schema: dayJsonSchema(day.city) } },
        messages: [{ role: "user", content: buildDayPrompt({ formData, itinerary, dayIndex, note, traveler }) }],
      },
      { signal }
    )
    .finalMessage();
  usage?.add(MODEL, message.usage);
  logger.info({ tripId, day: dayIndex + 1, stopReason: message.stop_reason, usage: message.usage }, "Day regenerated");

  if (message.stop_reason === "refusal") throw new UserFacingError("The AI declined to re-plan this day.");
  if (message.stop_reason === "max_tokens") throw new UserFacingError("The new plan got cut off. Please try again.");
  let parsed;
  try {
    const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    parsed = daySchema(day.city).parse(JSON.parse(text));
  } catch (err) {
    logger.error({ err, tripId }, "Couldn't parse regenerated day");
    throw new UserFacingError("Couldn't read the new plan. Please try again.", { cause: err });
  }

  const { output } = normalizePreferences(formData.preferences);
  // New keys that don't clash with the trip's other spots (the day's own are being replaced)
  const taken = Object.fromEntries(
    Object.entries(itinerary.spots || {}).filter(([k]) => itinerary.days.some((d, i) => i !== dayIndex && d.markers?.includes(k)))
  );
  const spots = {};
  const rename = new Map();
  for (const s of parsed.spots) {
    if (rename.has(s.key)) continue;
    const key = spotKeyFor(s.title, { ...taken, ...spots });
    rename.set(s.key, key);
    spots[key] = {
      title: s.title,
      address: s.address,
      city: s.city,
      coords: [s.lat, s.lon],
      img: null,
      links: searchLinks(s.title, s.city, { booking: output.bookingLinks }),
      ...(output.costs && s.estimatedCost && { estimatedCost: s.estimatedCost }),
    };
  }
  const markers = [...new Set(parsed.stops.map((k) => rename.get(k)).filter(Boolean))];
  if (!markers.length) throw new UserFacingError("The new plan had no stops. Please try again.");
  // Places listed but not visited aren't kept
  for (const key of Object.keys(spots)) if (!markers.includes(key)) delete spots[key];

  await verifyStops({ spots }, formData, geoapifyKey, { tripId });
  return {
    title: parsed.title,
    notes: parsed.notes,
    rainyDayBackup: output.rainyDay ? parsed.rainyDayBackup : null,
    markers,
    spots,
  };
}
