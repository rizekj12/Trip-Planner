// Asks Claude for the best places to eat in a city, skipping ones already listed.
import Anthropic from "@anthropic-ai/sdk";
import { locatePlaces } from "./geoapify.js";

function buildPrompt({ city, country, count, exclude }) {
  const excludeBlock = exclude.length
    ? `\nThese are already on the list, so do NOT include them again:\n${exclude.map((n) => `- ${n}`).join("\n")}\n`
    : "";

  return `List the ${count} best places to eat in ${city}${country ? `, ${country}` : ""} that a visitor shouldn't miss.
Mix famous institutions with local favorites, across cuisines and price ranges.
Only include places you're confident are real and still operating.
${excludeBlock}
Respond with ONLY valid JSON (no markdown):

{
  "spots": [
    {
      "name": "Place name",
      "cuisine": "Cuisine or type, e.g. Ramen, Street food, Bakery",
      "price": "$ | $$ | $$$ | $$$$",
      "neighborhood": "Neighborhood or area",
      "description": "One sentence on why it's worth going and what to order."
    }
  ]
}`;
}

function parseSpots(message) {
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in AI response");

  const { spots } = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(spots)) throw new Error("AI response is missing the spots list");
  return spots.filter((s) => s?.name);
}

async function generateFoodSpots({ city, country, count, exclude, apiKey }) {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 16000,
    // Recalling well-known restaurants doesn't need deep reasoning; low effort keeps it fast
    output_config: { effort: "low" },
    messages: [{ role: "user", content: buildPrompt({ city, country, count, exclude }) }],
  });

  console.log("Food spots response:", message.stop_reason, message.usage);
  if (message.stop_reason === "max_tokens") throw new Error("The list got cut off. Please try again.");
  if (message.stop_reason === "refusal") throw new Error("The AI declined to list places for this city.");

  // Belt and braces: drop anything already listed even if the model repeated it
  const seen = new Set(exclude.map((n) => n.toLowerCase()));
  return parseSpots(message).filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Next batch for one city (12 the first time, then 10 more), with map coordinates from
// Geoapify for any spot not looked up yet. Returns the city's full list.
export async function addFoodSpots({ city, country, existing = [], anthropicKey, geoapifyKey }) {
  const spots = await generateFoodSpots({
    city,
    country,
    count: existing.length ? 10 : 12,
    exclude: existing.map((s) => s.name),
    apiKey: anthropicKey,
  });
  return locatePlaces([...existing, ...spots], { city, country }, geoapifyKey);
}

// First batch for every city in a trip, run in parallel. Never throws: a city that fails
// is left out, and the Food Spots tab fetches it on demand instead.
export async function foodSpotsForTrip(formData, keys) {
  const cities = [...new Set((formData.cities || []).map((c) => c.name).filter(Boolean))];
  const results = await Promise.all(
    cities.map((city) =>
      addFoodSpots({ city, country: formData.country, ...keys }).catch((err) => {
        console.error(`Food spots for ${city} failed:`, err.message);
        return null;
      })
    )
  );
  return Object.fromEntries(cities.map((city, i) => [city, results[i]]).filter(([, spots]) => spots));
}
