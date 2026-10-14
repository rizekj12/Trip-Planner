// Builds the itinerary prompt, calls Claude, and parses the JSON reply.
// Runs on the server so generation keeps going even if the user closes the page.
import Anthropic from "@anthropic-ai/sdk";

import { tripLengthDays } from "../shared/tripLength.js";
import { needsForPrompt } from "../shared/accessibility.js";
import { logger } from "./logger.js";
import { UserFacingError } from "./errors.js";

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
Respond with ONLY valid JSON (no markdown):

{
  "days": [
    {
      "key": "d1",
      "date": "Day 1 (City)",
      "title": "Day description",
      "hotel": {
        "name": "Hotel name",
        "address": "Hotel address",
        "coords": [lat, lon],
        "key": "hotel_key"
      },
      "markers": ["spot1", "spot2"],
      "notes": ["Tip 1", "Tip 2"]
    }
  ],
  "spots": {
    "spot1": {
      "title": "Place Name",
      "coords": [lat, lon],
      "img": null,
      "address": "Address",
      "links": {
        "youtube": "https://youtube.com/search?q=Place+Name",
        "maps": "https://www.google.com/maps/search/?api=1&query=Place+Name"
      }
    }
  }
}

ITINERARY REQUIREMENTS:
- Include ${numDays} days with 3-5 activities per day
- Use real GPS coordinates
- Leave "img" as null; don't invent image URLs
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

export function parseItineraryResponse(message) {
  try {
    // Skip thinking blocks; join text in case the reply was split across blocks
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    // Ignore any prose or ``` fences around the JSON object
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error("No JSON object in AI response");
    }

    const itinerary = JSON.parse(text.slice(start, end + 1));

    if (!itinerary.days || !Array.isArray(itinerary.days)) {
      throw new Error("Invalid itinerary structure: missing days array");
    }

    if (!itinerary.spots || typeof itinerary.spots !== "object") {
      throw new Error("Invalid itinerary structure: missing spots object");
    }

    // Events come from a real events API now (server/events.js), not the model; drop any it
    // adds anyway rather than show invented dates and links
    itinerary.events = [];

    itinerary.days = itinerary.days.map((day) => ({
      ...day,
      markers: day.markers || [],
      notes: day.notes || [],
      hotel: day.hotel || null,
    }));

    return itinerary;
  } catch (error) {
    logger.error({ err: error, stopReason: message.stop_reason }, "Failed to parse itinerary");
    throw new UserFacingError("Failed to parse AI response. Please try again.", { cause: error });
  }
}

// `signal` (an AbortSignal) stops the request, e.g. when generation runs too long.
// `traveler` ({ needs, notes }) adds the organizer's accessibility and dietary needs.
export async function generateItinerary(formData, apiKey, { signal, traveler } = {}) {
  const client = new Anthropic({ apiKey });
  // Stream so a large max_tokens doesn't hit HTTP timeouts. Thinking tokens count
  // against max_tokens, so leave plenty of room for a multi-day itinerary.
  const message = await client.messages
    .stream({
      model: "claude-sonnet-5",
      max_tokens: 64000,
      messages: [{ role: "user", content: buildPrompt(formData, traveler) }],
    }, { signal })
    .finalMessage();

  logger.info({ stopReason: message.stop_reason, usage: message.usage }, "Itinerary response");

  if (message.stop_reason === "max_tokens") {
    throw new UserFacingError("The itinerary was too long and got cut off. Try a shorter trip or fewer cities.");
  }
  if (message.stop_reason === "refusal") {
    throw new UserFacingError("The AI declined to generate this itinerary.");
  }

  return parseItineraryResponse(message);
}
