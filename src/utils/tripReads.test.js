// How the browser reads trips (issue #62): the user's own trips straight from Supabase, and
// trips shared with them only through the server's shared view, which has no confirmation codes.
import { describe, test, expect, vi, beforeEach } from "vitest";

const ME = "user-me";

// A tiny stand-in for the Supabase query builder: records each query's table and filters, and
// answers from `tables`, applying the filters like the real one would (no RLS here, on purpose:
// the client must filter by owner itself)
const queries = [];
let tables = {};
function from(table) {
  const q = { table, filters: [], action: "select" };
  queries.push(q);
  const rows = () => (tables[table] || []).filter((r) => q.filters.every(([k, v]) => String(r[k]) === String(v)));
  const builder = {
    select: () => builder,
    update: (patch) => ((q.action = "update"), (q.patch = patch), builder),
    eq: (k, v) => (q.filters.push([k, v]), builder),
    order: () => builder,
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    single: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (resolve) => resolve({ data: rows(), error: null }),
  };
  return builder;
}
vi.mock("./supabase", () => ({
  supabase: {
    from: (table) => from(table),
    auth: { getSession: async () => ({ data: { session: { user: { id: ME } } } }) },
  },
}));

const apiJson = vi.fn();
vi.mock("./api", () => ({ apiJson: (...args) => apiJson(...args) }));

const { fetchTrip, fetchTrips, updateTripFormData } = await import("./trips");

const ownTrip = { id: "own", user_id: ME, created_at: "2026-02-01", itinerary_data: { _form_data: { reservations: { flights: [{ confirmationCode: "MINE" }] } } } };
const sharedRow = { id: "shared", user_id: "organizer", created_at: "2026-03-01", itinerary_data: { _form_data: { reservations: { flights: [{ confirmationCode: "THEIRS" }] } } } };
// What the server's shared view returns for that trip (no reservations)
const sharedView = { id: "shared", user_id: "organizer", created_at: "2026-03-01", itinerary_data: { _form_data: { cities: [] } } };

beforeEach(() => {
  queries.length = 0;
  apiJson.mockReset();
  apiJson.mockImplementation(async (method, path) => {
    if (path === "/api/trips/shared/shared") return sharedView;
    throw Object.assign(new Error("Trip not found"), { status: 404 });
  });
  tables = {
    // The database holds both full rows; the client must only ever take its own from here
    trips: [ownTrip, sharedRow],
    trip_members: [
      { trip_id: "shared", user_id: ME, status: "approved" },
      { trip_id: "gone", user_id: ME, status: "approved" },
      { trip_id: "asked", user_id: ME, status: "pending" },
    ],
  };
});

const tripSelects = () => queries.filter((q) => q.table === "trips" && q.action === "select");

describe("fetchTrip", () => {
  test("the user's own trip comes from Supabase, in full", async () => {
    expect(await fetchTrip("own")).toEqual(ownTrip);
    expect(apiJson).not.toHaveBeenCalled();
  });

  test("a shared trip comes only from the server's shared view, never the raw row", async () => {
    const trip = await fetchTrip("shared");
    expect(trip).toEqual(sharedView);
    expect(JSON.stringify(trip)).not.toContain("THEIRS");
    expect(apiJson).toHaveBeenCalledWith("GET", "/api/trips/shared/shared", null, { auth: true });
    // Every direct read of `trips` was limited to the user's own rows
    expect(tripSelects().every((q) => q.filters.some(([k, v]) => k === "user_id" && v === ME))).toBe(true);
  });
});

describe("fetchTrips", () => {
  test("own trips from Supabase plus approved shared trips from the server, newest first", async () => {
    const trips = await fetchTrips();
    expect(trips.map((t) => t.id)).toEqual(["shared", "own"]);
    expect(JSON.stringify(trips)).not.toContain("THEIRS");
    // Only approved memberships are fetched; one that fails ("gone") is skipped
    expect(apiJson.mock.calls.map((c) => c[1]).sort()).toEqual(["/api/trips/gone/shared", "/api/trips/shared/shared"]);
    expect(tripSelects().every((q) => q.filters.some(([k, v]) => k === "user_id" && v === ME))).toBe(true);
  });
});

describe("changing a trip", () => {
  test("is refused for a shared trip, so the shared view is never written back", async () => {
    await expect(updateTripFormData("shared", (f) => f)).rejects.toThrow("Only the trip's organizer");
    expect(queries.some((q) => q.action === "update")).toBe(false);
  });
});
