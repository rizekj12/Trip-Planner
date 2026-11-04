// "Regenerate this day" (issue #37): only that day is sent, and the new stops get keys that
// don't clash with the trip's other spots. The Anthropic client and the map check are mocked.
import { test, expect, vi, beforeEach } from "vitest";
import { formData } from "./test/fixtures.js";

const sdk = vi.hoisted(() => ({ requests: [], reply: null }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { stream: (body) => (sdk.requests.push(body), { finalMessage: async () => sdk.reply }) };
  },
}));
vi.mock("./verifyStops.js", () => ({ verifyStops: vi.fn(async (it) => it) }));
const { regenerateDay, buildDayPrompt } = await import("./regenerateDay.js");

const itinerary = () => ({
  days: [
    { key: "d1", city: "Tokyo", title: "One", markers: ["senso_ji", "skytree"], notes: [] },
    { key: "d2", city: "Tokyo", title: "Two", markers: ["meiji"], notes: [] },
  ],
  spots: { senso_ji: { title: "Senso-ji" }, skytree: { title: "Skytree" }, meiji: { title: "Meiji Shrine" } },
});
const spot = (key, title) => ({ key, title, address: "x", city: "Tokyo", lat: 35.7, lon: 139.8, estimatedCost: "¥500" });
const reply = (body) => ({ stop_reason: "end_turn", usage: {}, content: [{ type: "text", text: JSON.stringify(body) }] });

beforeEach(() => {
  sdk.requests.length = 0;
  sdk.reply = reply({
    title: "Food day",
    stops: ["meiji", "ramen", "ramen"],
    notes: ["Go early"],
    rainyDayBackup: "Depachika",
    spots: [spot("meiji", "Meiji Jingu Market"), spot("ramen", "Afuri Ramen"), spot("unused", "Not visited")],
  });
});

test("returns the new day, with keys that don't clash with other days' spots", async () => {
  const plan = await regenerateDay({ formData: formData(), itinerary: itinerary(), dayIndex: 0, note: "more food" }, { anthropicKey: "k" });
  expect(plan.title).toBe("Food day");
  // "meiji" is day 2's spot, so the new place gets its own key; the unvisited one is dropped
  expect(plan.markers).toEqual(["meiji_jingu_market", "afuri_ramen"]);
  expect(Object.keys(plan.spots)).toEqual(["meiji_jingu_market", "afuri_ramen"]);
  expect(plan.spots.afuri_ramen).toMatchObject({ coords: [35.7, 139.8], links: { maps: expect.stringContaining("Afuri") } });
  // Extras only when the traveler asked for them
  expect(plan.spots.afuri_ramen.estimatedCost).toBeUndefined();
  expect(plan.rainyDayBackup).toBeNull();
});

test("sends only that day, the note, and the other days' stops to avoid", () => {
  const prompt = buildDayPrompt({ formData: formData(), itinerary: itinerary(), dayIndex: 0, note: "more food, less museums" });
  expect(prompt).toContain("day 1 of 2, 2030-04-01, in Tokyo");
  expect(prompt).toContain('WHAT THE TRAVELER WANTS CHANGED: "more food, less museums"');
  expect(prompt).toContain("OTHER DAYS ALREADY COVER (don't repeat these): Meiji Shrine");
  expect(prompt).toContain("Its current plan: Senso-ji, Skytree");
  expect(prompt).toContain("arrival day");
});

test("a reply with no stops, or a refusal, is an error for the traveler", async () => {
  sdk.reply = reply({ title: "x", stops: [], notes: [], rainyDayBackup: null, spots: [] });
  await expect(regenerateDay({ formData: formData(), itinerary: itinerary(), dayIndex: 1 }, { anthropicKey: "k" })).rejects.toThrow("no stops");
  sdk.reply = { stop_reason: "refusal", usage: {}, content: [] };
  await expect(regenerateDay({ formData: formData(), itinerary: itinerary(), dayIndex: 1 }, { anthropicKey: "k" })).rejects.toThrow("declined");
});
