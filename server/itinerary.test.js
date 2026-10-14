// Prompt building and AI response parsing (issue #34). The prompt must never carry
// confirmation codes, flight numbers or notes; parsing must cope with how Claude replies.
import { describe, test, expect, vi } from "vitest";
import { buildPrompt, buildFlightsBlock, parseItineraryResponse } from "./itinerary.js";
import { parseSpots } from "./foodSpots.js";
import { formData, SECRETS } from "./test/fixtures.js";

const reply = (text, stop_reason = "end_turn") => ({ content: [{ type: "text", text }], stop_reason });
const VALID = { days: [{ key: "d1", date: "Day 1", title: "Arrive" }], spots: { s1: { title: "Park", coords: [1, 2] } } };

describe("buildPrompt", () => {
  test("never includes confirmation codes, flight numbers or notes", () => {
    const prompt = buildPrompt(formData());
    for (const secret of SECRETS) expect(prompt).not.toContain(secret);
  });

  test("includes the details Claude needs: route, dates, hotel, length", () => {
    const prompt = buildPrompt(formData());
    expect(prompt).toContain("Create a 4-day travel itinerary for Japan");
    expect(prompt).toContain("Hotel Sakura, 1-1 Ginza, Tokyo");
    expect(prompt).toContain("MCO to HND, departing 2030-03-31 at 10:00");
  });

  test("custom addresses and no homebase are described", () => {
    const data = formData();
    data.cities.push({ name: "Kyoto", checkIn: "2030-04-05", checkOut: "2030-04-07", homebaseType: "custom", customAddress: "Friend's flat, Kyoto" });
    data.cities.push({ name: "Osaka", checkIn: "2030-04-07", checkOut: "2030-04-08", homebaseType: "none" });
    const prompt = buildPrompt(data);
    expect(prompt).toContain("Homebase (not a hotel): Friend's flat, Kyoto");
    expect(prompt).toContain("Homebase: none provided");
  });
});

describe("buildFlightsBlock", () => {
  test("is empty without dated flights", () => {
    expect(buildFlightsBlock({})).toBe("");
    expect(buildFlightsBlock({ reservations: { flights: [{ from: "MCO", to: "HND" }] } })).toBe("");
  });

  test("lists flights in date and time order", () => {
    const block = buildFlightsBlock({
      reservations: {
        flights: [
          { from: "HND", to: "MCO", date: "2030-04-05", time: "18:00" },
          { from: "MCO", to: "HND", date: "2030-03-31", time: "10:00" },
        ],
      },
    });
    expect(block.indexOf("MCO to HND")).toBeLessThan(block.indexOf("HND to MCO"));
  });
});

describe("parseItineraryResponse", () => {
  // Parsing failures are logged; keep test output quiet
  vi.spyOn(console, "error").mockImplementation(() => {});

  test("plain JSON", () => {
    const itinerary = parseItineraryResponse(reply(JSON.stringify(VALID)));
    expect(itinerary.days).toHaveLength(1);
  });

  test("JSON inside ``` fences with prose around it", () => {
    const text = "Here is your trip!\n```json\n" + JSON.stringify(VALID) + "\n```\nEnjoy.";
    expect(parseItineraryResponse(reply(text)).spots.s1.title).toBe("Park");
  });

  test("text split across blocks, with thinking blocks skipped", () => {
    const json = JSON.stringify(VALID);
    const message = {
      content: [
        { type: "thinking", thinking: "{ not json" },
        { type: "text", text: json.slice(0, 20) },
        { type: "text", text: json.slice(20) },
      ],
    };
    expect(parseItineraryResponse(message).days[0].key).toBe("d1");
  });

  test("drops events the model adds anyway (they come from Ticketmaster now)", () => {
    const withEvents = { ...VALID, events: [{ id: "e1", title: "Made-up festival", ticketLink: "https://fake" }] };
    expect(parseItineraryResponse(reply(JSON.stringify(withEvents))).events).toEqual([]);
  });

  test("fills in optional fields", () => {
    const itinerary = parseItineraryResponse(reply(JSON.stringify(VALID)));
    expect(itinerary.events).toEqual([]);
    expect(itinerary.days[0]).toMatchObject({ markers: [], notes: [], hotel: null });
  });

  test.each([
    ["no JSON at all", "Sorry, I can't help with that."],
    ["missing days", JSON.stringify({ spots: {} })],
    ["missing spots", JSON.stringify({ days: [] })],
    ["truncated JSON", JSON.stringify(VALID).slice(0, -10)],
  ])("rejects %s with a friendly message", (_label, text) => {
    expect(() => parseItineraryResponse(reply(text))).toThrow("Failed to parse AI response. Please try again.");
  });
});

describe("parseSpots", () => {
  test("keeps spots with names and drops empty ones", () => {
    const text = "```json\n" + JSON.stringify({ spots: [{ name: "Ichiran" }, {}, null, { name: "Afuri" }] }) + "\n```";
    expect(parseSpots(reply(text)).map((s) => s.name)).toEqual(["Ichiran", "Afuri"]);
  });

  test("rejects replies without a spots list", () => {
    expect(() => parseSpots(reply("no json"))).toThrow();
    expect(() => parseSpots(reply(JSON.stringify({ places: [] })))).toThrow("missing the spots list");
  });
});
