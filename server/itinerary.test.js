// Prompt building and AI response parsing (issues #34 and #35). The prompt must never carry
// confirmation codes, flight numbers or notes; parsing must cope with how Claude replies.
import { describe, test, expect, vi } from "vitest";
import { buildPrompt, buildFlightsBlock, parseItineraryResponse, itinerarySchema, itineraryJsonSchema, withHotels } from "./itinerary.js";
import { parseSpots } from "./foodSpots.js";
import { formData, SECRETS } from "./test/fixtures.js";

const reply = (text, stop_reason = "end_turn") => ({ content: [{ type: "text", text }], stop_reason });

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

describe("itineraryJsonSchema", () => {
  const schema = itineraryJsonSchema(["Tokyo", "Kyoto"]);
  const objects = (node, found = []) => {
    if (node && typeof node === "object") {
      if (node.type === "object") found.push(node);
      Object.values(node).forEach((v) => objects(v, found));
    }
    return found;
  };

  test("is valid for structured outputs: every object closed, every field required", () => {
    for (const obj of objects(schema)) {
      expect(obj.additionalProperties).toBe(false);
      expect(obj.required.sort()).toEqual(Object.keys(obj.properties).sort());
    }
  });

  test("only uses keywords structured outputs enforce", () => {
    expect(JSON.stringify(schema)).not.toMatch(/minimum|maximum|minLength|maxLength|pattern|\$ref/);
  });

  test("cities can only be the trip's own", () => {
    expect(schema.properties.days.items.properties.city.enum).toEqual(["Tokyo", "Kyoto"]);
    expect(schema.properties.spots.items.properties.city.enum).toEqual(["Tokyo", "Kyoto"]);
  });
});

describe("parseItineraryResponse", () => {
  // Parsing failures are logged; keep test output quiet
  vi.spyOn(console, "error").mockImplementation(() => {});
  const format = itinerarySchema(["Tokyo"]);
  const spot = (key, extra = {}) => ({ key, title: key, address: `${key} street`, city: "Tokyo", lat: 35.7, lon: 139.8, ...extra });
  const VALID = {
    days: [{ city: "Tokyo", title: "Arrive", stops: ["senso_ji", "skytree"], notes: ["Rest"] }],
    spots: [spot("senso_ji", { title: "Senso-ji" }), spot("skytree")],
  };
  const parse = (body, numDays = 1, stop_reason = "end_turn") => parseItineraryResponse(reply(JSON.stringify(body), stop_reason), format, numDays);

  test("the zod schema accepts exactly what the JSON schema describes", () => {
    const json = itineraryJsonSchema(["Tokyo"]);
    const required = (obj) => obj.required.sort();
    expect(required(json)).toEqual(Object.keys(format.shape).sort());
    expect(required(json.properties.days.items)).toEqual(Object.keys(format.shape.days.element.shape).sort());
    expect(required(json.properties.spots.items)).toEqual(Object.keys(format.shape.spots.element.shape).sort());
    expect(format.safeParse(VALID).success).toBe(true);
  });

  test("converts to the shape the app stores", () => {
    const itinerary = parse(VALID);
    expect(itinerary.days[0]).toEqual({
      key: "d1", date: "Day 1 (Tokyo)", city: "Tokyo", title: "Arrive", markers: ["senso_ji", "skytree"], notes: ["Rest"], hotel: null,
    });
    expect(itinerary.spots.senso_ji).toMatchObject({ title: "Senso-ji", coords: [35.7, 139.8], img: null, city: "Tokyo" });
    expect(itinerary.spots.senso_ji.links.maps).toContain("query=Senso-ji");
    expect(itinerary.events).toEqual([]);
  });

  test("drops stops that name a missing spot, repeats, and days beyond the trip", () => {
    const body = {
      days: [
        { city: "Tokyo", title: "One", stops: ["senso_ji", "ghost", "senso_ji"], notes: [] },
        { city: "Tokyo", title: "Extra", stops: [], notes: [] },
      ],
      spots: [spot("senso_ji"), spot("senso_ji", { title: "Duplicate" })],
    };
    const itinerary = parse(body, 1);
    expect(itinerary.days).toHaveLength(1);
    expect(itinerary.days[0].markers).toEqual(["senso_ji"]);
    expect(itinerary.spots.senso_ji.title).toBe("senso_ji");
  });

  test("a cut-off or declined reply gets its own message, not a parse error", () => {
    const cut = JSON.stringify(VALID).slice(0, 30);
    expect(() => parseItineraryResponse(reply(cut, "max_tokens"), format, 1)).toThrow("too long and got cut off");
    expect(() => parseItineraryResponse(reply("", "refusal"), format, 1)).toThrow("declined");
  });

  test.each([
    ["no JSON at all", "Sorry, I can't help with that."],
    ["truncated JSON", JSON.stringify(VALID).slice(0, -10)],
    ["a city that isn't on the trip", JSON.stringify({ ...VALID, days: [{ ...VALID.days[0], city: "Paris" }] })],
    ["coordinates out of range", JSON.stringify({ ...VALID, spots: [spot("senso_ji", { lat: 135.7 })] })],
    ["a missing field", JSON.stringify({ days: VALID.days })],
  ])("rejects %s with a friendly message", (_label, text) => {
    expect(() => parseItineraryResponse(reply(text), format, 1)).toThrow("Failed to parse AI response. Please try again.");
  });
});

describe("withHotels", () => {
  const trip = () => ({
    cities: [
      { name: "Tokyo", homebaseType: "hotel", hotel: { name: "Hotel Sakura", address: "1-1 Ginza", lat: 35.67, lon: 139.76 } },
      { name: "Kyoto", homebaseType: "custom", customAddress: "Friend's flat" },
      { name: "Osaka", homebaseType: "none" },
    ],
  });
  const days = () => ({ days: ["Tokyo", "Kyoto", "Osaka", "Nara"].map((city, i) => ({ key: `d${i + 1}`, city, hotel: null })) });

  test("each day gets its city's hotel or homebase from the questionnaire", () => {
    const { days: [tokyo, kyoto, osaka, nara] } = withHotels(days(), trip(), { Kyoto: { coords: [35.0, 135.7] } });
    expect(tokyo.hotel).toMatchObject({ name: "Hotel Sakura", address: "1-1 Ginza", coords: [35.67, 139.76], key: "homebase_tokyo" });
    expect(kyoto.hotel).toMatchObject({ name: "Your homebase", address: "Friend's flat", coords: [35.0, 135.7] });
    expect(osaka.hotel).toBeNull();
    expect(nara.hotel).toBeNull();
  });

  test("the located homebase wins over the hotel search coordinates", () => {
    const { days: [tokyo] } = withHotels(days(), trip(), { Tokyo: { coords: [35.68, 139.77] } });
    expect(tokyo.hotel.coords).toEqual([35.68, 139.77]);
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
