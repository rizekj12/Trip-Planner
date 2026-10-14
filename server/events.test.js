// Local events from Ticketmaster (issue #36): real listings only, Claude can choose but not invent
import { describe, test, expect, vi, afterEach } from "vitest";
import { geohash, toEvent, priceOf, categoryOf, dedupe, applyPicks, fallbackPicks, eventsForTrip, MAX_EVENTS } from "./events.js";

afterEach(() => vi.unstubAllGlobals());

const tm = (id, name, localDate, extra = {}) => ({
  id,
  name,
  url: `https://www.ticketmaster.com/event/${id}`,
  dates: { start: { localDate, localTime: "19:30:00" }, status: { code: "onsale" } },
  classifications: [{ primary: true, segment: { name: "Music" }, genre: { name: "Rock" } }],
  priceRanges: [{ type: "standard", currency: "USD", min: 25, max: 80 }],
  images: [
    { ratio: "3_2", url: "https://img/3x2.jpg", width: 640, height: 427 },
    { ratio: "16_9", url: "https://img/16x9-small.jpg", width: 205, height: 115 },
    { ratio: "16_9", url: "https://img/16x9-big.jpg", width: 1024, height: 576 },
  ],
  _embedded: { venues: [{ name: "Teatro Caupolicán", address: { line1: "San Diego 850" }, city: { name: "Santiago" } }] },
  ...extra,
});

describe("geohash", () => {
  test("matches the reference encoding", () => {
    expect(geohash(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
    expect(geohash(-33.4489, -70.6693, 5)).toBe("66j9x");
  });
});

describe("toEvent", () => {
  test("maps a listing to the app's event shape, with real details only", () => {
    expect(toEvent(tm("A1", "The Band", "2030-04-02"))).toEqual({
      id: "tm_A1",
      title: "The Band",
      isoDate: "2030-04-02",
      date: "Tue, Apr 2",
      time: "7:30 PM",
      location: "Teatro Caupolicán",
      address: "San Diego 850, Santiago",
      city: "Santiago",
      category: "Music & Dance",
      genre: "Rock",
      price: "$25 – $80",
      ticketLink: "https://www.ticketmaster.com/event/A1",
      website: null,
      image: "https://img/16x9-big.jpg",
      description: null,
      source: "ticketmaster",
    });
  });

  test("skips cancelled, postponed and undated events", () => {
    expect(toEvent(tm("A", "x", "2030-04-02", { dates: { start: { localDate: "2030-04-02" }, status: { code: "cancelled" } } }))).toBeNull();
    expect(toEvent(tm("A", "x", "2030-04-02", { dates: { start: { localDate: "2030-04-02" }, status: { code: "postponed" } } }))).toBeNull();
    expect(toEvent(tm("A", "x", undefined))).toBeNull();
  });

  test("time to be announced", () => {
    expect(toEvent(tm("A", "x", "2030-04-02", { dates: { start: { localDate: "2030-04-02" } } })).time).toBe("Time TBA");
  });
});

test("priceOf and categoryOf", () => {
  expect(priceOf([{ currency: "EUR", min: 10, max: 10 }])).toBe("From €10");
  expect(priceOf([])).toBeNull();
  expect(categoryOf([{ segment: { name: "Sports" }, genre: { name: "Soccer" } }])).toBe("Sports & Recreation");
  expect(categoryOf([{ segment: { name: "Miscellaneous" }, genre: { name: "Fairs & Festivals" } }])).toBe("Festival");
  expect(categoryOf()).toBe("Other");
});

test("dedupe keeps one listing per show", () => {
  const events = [toEvent(tm("1", "Hamilton", "2030-04-01")), toEvent(tm("2", "HAMILTON!", "2030-04-02")), toEvent(tm("3", "Other", "2030-04-02"))];
  expect(dedupe(events).map((e) => e.id)).toEqual(["tm_1", "tm_3"]);
});

describe("applyPicks", () => {
  const candidates = ["2030-04-03", "2030-04-01", "2030-04-02"].map((d, i) => toEvent(tm(`E${i}`, `Show ${i}`, d)));

  test("ids that aren't real listings are dropped, and nothing else is invented", () => {
    const picked = applyPicks(candidates, [
      { id: "tm_E0", description: "Great rock night." },
      { id: "tm_MADE_UP", description: "A fake festival" },
      { id: "tm_E1" },
    ]);
    expect(picked.map((e) => e.id)).toEqual(["tm_E1", "tm_E0"]); // date order
    expect(picked.find((e) => e.id === "tm_E0")).toMatchObject({ description: "Great rock night.", ticketLink: "https://www.ticketmaster.com/event/E0" });
    expect(picked.find((e) => e.id === "tm_E1").description).toBeNull();
  });

  test(`at most ${MAX_EVENTS}, no duplicates`, () => {
    const many = Array.from({ length: 20 }, (_, i) => toEvent(tm(`M${i}`, `Show ${i}`, "2030-04-01")));
    expect(applyPicks(many, many.map((e) => ({ id: e.id })))).toHaveLength(MAX_EVENTS);
    expect(applyPicks(many, [{ id: "tm_M1" }, { id: "tm_M1" }])).toHaveLength(1);
  });

  test("the fallback uses the soonest events", () => {
    expect(fallbackPicks(candidates)[0]).toEqual({ id: candidates[0].id, description: "Rock at Teatro Caupolicán" });
  });
});

describe("eventsForTrip", () => {
  const formData = {
    country: "Chile",
    vacationType: "culture",
    cities: [{ name: "Santiago", checkIn: "2030-04-01", checkOut: "2030-04-03" }],
  };

  const stubFetch = (ticketmaster) => {
    const calls = [];
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      calls.push(String(url));
      if (String(url).includes("geoapify")) return { ok: true, json: async () => ({ results: [{ lat: -33.4489, lon: -70.6693 }] }) };
      return ticketmaster();
    }));
    return calls;
  };

  test("without a Ticketmaster key, nothing is searched", async () => {
    const calls = stubFetch(() => ({ ok: true, json: async () => ({}) }));
    expect(await eventsForTrip(formData, {})).toMatchObject({ events: [], source: "unavailable" });
    expect(calls).toEqual([]);
  });

  test("searches around each city for its dates and returns real listings (soonest, without Claude)", async () => {
    const calls = stubFetch(() => ({
      ok: true,
      json: async () => ({ _embedded: { events: [tm("B", "Second", "2030-04-02"), tm("A", "First", "2030-04-01"), tm("Z", "Too late", "2030-04-09")] } }),
    }));
    const result = await eventsForTrip(formData, { ticketmasterKey: "tm-key", geoapifyKey: "geo-key" });
    expect(result.source).toBe("ticketmaster");
    expect(result.events.map((e) => e.title)).toEqual(["First", "Second"]);

    const search = new URL(calls.find((u) => u.includes("ticketmaster")));
    expect(Object.fromEntries(search.searchParams)).toMatchObject({
      apikey: "tm-key",
      geoPoint: geohash(-33.4489, -70.6693),
      radius: "40",
      unit: "km",
      startDateTime: "2030-04-01T00:00:00Z",
      endDateTime: "2030-04-03T23:59:59Z",
    });
  });

  test("a failing API means 'unavailable', never invented events", async () => {
    stubFetch(() => ({ ok: false, status: 500, json: async () => ({}) }));
    expect(await eventsForTrip(formData, { ticketmasterKey: "k", geoapifyKey: "g" })).toMatchObject({ events: [], source: "unavailable" });
  });

  test("nothing on: an honest empty list", async () => {
    stubFetch(() => ({ ok: true, json: async () => ({ page: { totalElements: 0 } }) }));
    expect(await eventsForTrip(formData, { ticketmasterKey: "k", geoapifyKey: "g" })).toMatchObject({ events: [], source: "ticketmaster" });
  });
});
