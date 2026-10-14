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
    pdfTrips: [],
  };
});

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
vi.mock("./generationJobs.js", () => ({ createGenerationJobs: () => mocks.jobs }));
vi.mock("./foodSpots.js", () => ({ addFoodSpots: (...args) => mocks.addFoodSpots(...args), foodSpotsForTrip: async () => ({}) }));
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
