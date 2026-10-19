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

describe("buildPrompt with preferences (issue #90)", () => {
  test("a trip without preferences (made before #90) says no preference for every question", () => {
    const prompt = buildPrompt(formData());
    expect(prompt).toContain("- Budget: no preference — choose sensible mid-range options");
    expect(prompt).toContain("- Interests: no preference");
    expect(prompt).toContain("Set every spot's estimatedCost to null");
    expect(prompt.match(/no preference —/g).length).toBeGreaterThan(15);
  });

  test("answers are spelled out", () => {
    const preferences = {
      planDetail: "detailed",
      arrivalTime: { value: "15:30", noPreference: false },
      budget: { value: { min: 100, max: 250, per: "day", currency: "EUR" }, noPreference: false },
      interests: { value: { food: 3, history: 1 }, noPreference: false },
      avoid: { value: "crowds", noPreference: false },
      pets: true,
      output: { costs: true, rainyDay: true },
    };
    const prompt = buildPrompt({ ...formData(), preferences });
    expect(prompt).toContain("- Arrival time on day 1: 15:30 local time");
    expect(prompt).toContain("- Budget: 100–250 EUR per day");
    expect(prompt).toContain("- Interests: food & drink (must), history & museums (some)");
    expect(prompt).toContain('- Avoid: "crowds"');
    expect(prompt).toContain("Traveling with a pet");
    expect(prompt).toContain("Give each spot an estimatedCost");
    expect(prompt).toContain("Give each day a rainyDayBackup");
  });

  test("a Quick plan ignores detailed answers", () => {
    const preferences = { planDetail: "quick", budget: { value: { min: 1, max: 2 }, noPreference: false }, output: { costs: true } };
    const prompt = buildPrompt({ ...formData(), preferences });
    expect(prompt).toContain("- Budget: no preference");
    expect(prompt).toContain("Set every spot's estimatedCost to null");
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
  const spot = (key, extra = {}) => ({ key, title: key, address: `${key} street`, city: "Tokyo", lat: 35.7, lon: 139.8, estimatedCost: null, ...extra });
  const day = (extra = {}) => ({ city: "Tokyo", title: "Arrive", stops: [], notes: [], rainyDayBackup: null, ...extra });
  const VALID = {
    days: [day({ stops: ["senso_ji", "skytree"], notes: ["Rest"] })],
    spots: [spot("senso_ji", { title: "Senso-ji" }), spot("skytree")],
    homebases: [{ city: "Tokyo", lat: 35.67, lon: 139.76 }],
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
    expect(itinerary.homebaseEstimates).toEqual({ Tokyo: [35.67, 139.76] });
  });

  test("drops stops that name a missing spot, repeats, and days beyond the trip", () => {
    const body = {
      days: [
        day({ title: "One", stops: ["senso_ji", "ghost", "senso_ji"] }),
        day({ title: "Extra" }),
      ],
      spots: [spot("senso_ji"), spot("senso_ji", { title: "Duplicate" })],
      homebases: [],
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
      { name: "Tokyo", homebaseType: "hotel", hotel: { name: "Hotel Sakura", address: "1-1 Ginza" } },
      { name: "Kyoto", homebaseType: "custom", customAddress: "Friend's flat" },
      { name: "Osaka", homebaseType: "none" },
    ],
  });
  const itinerary = (homebaseEstimates = {}) => ({
    days: ["Tokyo", "Kyoto", "Osaka", "Nara"].map((city, i) => ({ key: `d${i + 1}`, city, hotel: null })),
    homebaseEstimates,
  });

  test("each day gets its city's hotel or homebase, pinned where it was located", () => {
    const { days: [tokyo, kyoto, osaka, nara] } = withHotels(itinerary(), trip(), { Tokyo: { coords: [35.67, 139.76] }, Kyoto: { coords: [35.0, 135.7] } });
    expect(tokyo.hotel).toEqual({ key: "homebase_tokyo", name: "Hotel Sakura", address: "1-1 Ginza", coords: [35.67, 139.76], location: "verified" });
    expect(kyoto.hotel).toMatchObject({ name: "Your homebase", address: "Friend's flat", coords: [35.0, 135.7], location: "verified" });
    expect(osaka.hotel).toBeNull();
    expect(nara.hotel).toBeNull();
  });

  test("falls back to Claude's estimate, marked as such, and doesn't store the estimates", () => {
    const result = withHotels(itinerary({ Tokyo: [35.66, 139.75], Osaka: [34.69, 135.5] }), trip(), { Tokyo: null });
    expect(result.days[0].hotel).toMatchObject({ coords: [35.66, 139.75], location: "estimated" });
    // Kyoto: not located and no estimate; Osaka has no homebase, so its estimate is ignored
    expect(result.days[1].hotel).toMatchObject({ coords: null, location: null });
    expect(result.days[2].hotel).toBeNull();
    expect(result.homebaseEstimates).toBeUndefined();
  });

  test("a located homebase wins over Claude's estimate", () => {
    const { days: [tokyo] } = withHotels(itinerary({ Tokyo: [1, 1] }), trip(), { Tokyo: { coords: [35.68, 139.77] } });
    expect(tokyo.hotel).toMatchObject({ coords: [35.68, 139.77], location: "verified" });
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
