// Cost- and privacy-critical API routes (issue #34): only the organizer can spend Claude
// calls on a trip (#26), and a travel partner's PDF never includes the organizer's codes.
import { describe, test, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { db } from "./test/fakeSupabase.js";
import { OWNER, USERS, TOKENS, TRIP_ID, auth, readyTrip, members, leaksSecrets } from "./test/fixtures.js";

const mocks = vi.hoisted(() => {
  process.env.ANTHROPIC_API_KEY = "test-anthropic";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service";
  process.env.GEOAPIFY_API_KEY = "test-geoapify";
  return {
    jobs: { startSweeper: () => {}, isRunning: async () => false, start: async () => {} },
    addFoodSpots: async () => [{ name: "New spot" }],
    eventsForTrip: async () => ({ events: [], source: "ticketmaster", checkedAt: "now" }),
    pdfTrips: [],
  };
});

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
vi.mock("./generationJobs.js", () => ({ createGenerationJobs: () => mocks.jobs }));
vi.mock("./foodSpots.js", () => ({ addFoodSpots: (...args) => mocks.addFoodSpots(...args), foodSpotsForTrip: async () => ({}) }));
vi.mock("./events.js", () => ({ eventsForTrip: (...args) => mocks.eventsForTrip(...args) }));
vi.mock("./geoapify.js", () => ({ geocodeCity: async () => null, locateHomebase: async () => null, homebasesForTrip: async () => ({}) }));
vi.mock("./pdf.js", () => ({
  buildTripPdf: async (trip) => {
    mocks.pdfTrips.push(trip);
    return { pipe: (res) => res.end("%PDF-fake"), end: () => {} };
  },
}));

const { default: app } = await import("./index.js");

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.jobs.start = vi.fn(async () => {});
  mocks.addFoodSpots = vi.fn(async () => [{ name: "New spot" }]);
  mocks.pdfTrips.length = 0;
  db.reset({ trips: [readyTrip()], trip_members: members(), trip_generations: [], profiles: [] }, { users: USERS, tokens: TOKENS });
});

const pendingTrip = () => {
  db.rows("trips")[0].itinerary_data._status = "pending";
};

describe("POST /api/generate-itinerary", () => {
  const generate = (token) => request(app).post("/api/generate-itinerary").set(token ? auth(token) : {}).send({ tripId: TRIP_ID });

  test("a travel partner can't start a generation on the organizer's trip", async () => {
    pendingTrip();
    const res = await generate("token-member");
    expect(res.status).toBe(403);
    expect(mocks.jobs.start).not.toHaveBeenCalled();
    expect(db.rows("trip_generations")).toHaveLength(0);
  });

  test("strangers and signed-out callers are refused", async () => {
    pendingTrip();
    expect((await generate("token-stranger")).status).toBe(403);
    expect((await generate()).status).toBe(400);
    expect(mocks.jobs.start).not.toHaveBeenCalled();
  });

  test("a ready trip can't be regenerated, even by its owner", async () => {
    const res = await generate("token-owner");
    expect(res.status).toBe(409);
    expect(mocks.jobs.start).not.toHaveBeenCalled();
  });

  test("the owner can generate a pending trip, which uses one of their daily generations", async () => {
    pendingTrip();
    const res = await generate("token-owner");
    expect(res.status).toBe(202);
    expect(mocks.jobs.start).toHaveBeenCalledWith(expect.objectContaining({ tripId: TRIP_ID, userId: OWNER.id }));
    expect(db.rows("trip_generations")).toHaveLength(1);
  });

  test("the daily cap stops the owner too", async () => {
    pendingTrip();
    const recent = new Date().toISOString();
    db.rows("trip_generations").push(...Array.from({ length: 4 }, (_, i) => ({ id: `g${i}`, user_id: OWNER.id, created_at: recent })));
    const res = await generate("token-owner");
    expect(res.status).toBe(429);
    expect(mocks.jobs.start).not.toHaveBeenCalled();
  });

  test("trips over the length limit are refused before any AI work", async () => {
    pendingTrip();
    db.rows("trips")[0].itinerary_data._form_data.cities[0].checkOut = "2030-05-30";
    expect((await generate("token-owner")).status).toBe(400);
    expect(mocks.jobs.start).not.toHaveBeenCalled();
  });
});

describe("POST /api/food-spots", () => {
  const more = (token, city = "Tokyo") =>
    request(app).post("/api/food-spots").set(auth(token)).send({ tripId: TRIP_ID, city });

  test("a travel partner can't trigger a Claude call", async () => {
    const res = await more("token-member");
    expect(res.status).toBe(403);
    expect(mocks.addFoodSpots).not.toHaveBeenCalled();
  });

  test("only cities on the trip are allowed, so it can't be used for arbitrary prompts", async () => {
    const res = await more("token-owner", "Paris");
    expect(res.status).toBe(400);
    expect(mocks.addFoodSpots).not.toHaveBeenCalled();
  });

  test("the owner gets more spots, saved on the trip", async () => {
    const res = await more("token-owner");
    expect(res.status).toBe(200);
    expect(mocks.addFoodSpots).toHaveBeenCalledTimes(1);
    expect(db.rows("trips")[0].itinerary_data._food_spots.Tokyo).toEqual([{ name: "New spot" }]);
  });
});

describe("POST /api/trips/:tripId/events", () => {
  const refresh = (token) => request(app).post(`/api/trips/${TRIP_ID}/events`).set(token ? auth(token) : {});
  const EVENT = { id: "tm_1", title: "Real show", source: "ticketmaster" };

  test("only the organizer can spend a refresh", async () => {
    mocks.eventsForTrip = vi.fn();
    expect((await refresh("token-member")).status).toBe(403);
    expect((await refresh()).status).toBe(401);
    expect(mocks.eventsForTrip).not.toHaveBeenCalled();
  });

  test("replaces the trip's events with real listings and records where they came from", async () => {
    mocks.eventsForTrip = vi.fn(async () => ({ events: [EVENT], source: "ticketmaster", checkedAt: "2030-01-01T00:00:00Z" }));
    const res = await refresh("token-owner");
    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([EVENT]);
    expect(db.rows("trips")[0].itinerary_data).toMatchObject({ events: [EVENT], _events_source: "ticketmaster" });
    // Searched with the trip's own answers
    expect(mocks.eventsForTrip.mock.calls[0][0].country).toBe("Japan");
  });

  test("listings unavailable: an error, and the trip is left alone", async () => {
    db.rows("trips")[0].itinerary_data.events = [{ id: "old" }];
    mocks.eventsForTrip = vi.fn(async () => ({ events: [], source: "unavailable", checkedAt: "now" }));
    expect((await refresh("token-owner")).status).toBe(503);
    expect(db.rows("trips")[0].itinerary_data.events).toEqual([{ id: "old" }]);
  });

  test("checked in the last few minutes: returns what's there without searching again", async () => {
    Object.assign(db.rows("trips")[0].itinerary_data, { events: [EVENT], _events_source: "ticketmaster", _events_checked_at: new Date().toISOString() });
    mocks.eventsForTrip = vi.fn();
    const res = await refresh("token-owner");
    expect(res.body.events).toEqual([EVENT]);
    expect(mocks.eventsForTrip).not.toHaveBeenCalled();
  });
});

describe("POST /api/trip-pdf", () => {
  const pdf = (token) => request(app).post("/api/trip-pdf").set(auth(token)).send({ tripId: TRIP_ID });

  test("a travel partner's PDF leaves out the organizer's reservations and codes", async () => {
    const res = await pdf("token-member");
    expect(res.status).toBe(200);
    expect(mocks.pdfTrips).toHaveLength(1);
    expect(leaksSecrets(mocks.pdfTrips[0])).toEqual([]);
  });

  test("a partner's PDF never triggers Claude calls for missing food spots", async () => {
    await pdf("token-member");
    expect(mocks.addFoodSpots).not.toHaveBeenCalled();
  });

  test("the organizer's own PDF keeps their codes", async () => {
    db.rows("trips")[0].itinerary_data._food_spots = { Tokyo: [{ name: "Saved" }] };
    db.rows("trips")[0].itinerary_data._homebases = { Tokyo: null };
    await pdf("token-owner");
    expect(leaksSecrets(mocks.pdfTrips[0])).not.toEqual([]);
  });
});
