// Writing trips (issue #31): itinerary_data writes check the row's revision, so two writers
// can't silently overwrite each other's changes
import { describe, test, expect, beforeEach, vi } from "vitest";
import { db } from "./test/fakeSupabase.js";
import { TRIP_ID, readyTrip } from "./test/fixtures.js";

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
const { createClient } = await import("@supabase/supabase-js");
const { updateTrip, loadFoodSpots, saveFoodSpots } = await import("./tripData.js");

const admin = createClient();
const trip = () => db.rows("trips")[0];

beforeEach(() => db.reset({ trips: [readyTrip()], trip_food_spots: [] }));

describe("updateTrip", () => {
  test("merges a patch into itinerary_data and bumps the revision", async () => {
    await updateTrip(admin, TRIP_ID, { columns: { status: "ready" }, patch: { events: [{ id: "e1" }] } });
    expect(trip().itinerary_data.events).toEqual([{ id: "e1" }]);
    expect(trip().itinerary_data.days).toHaveLength(1);
    expect(trip().revision).toBe(1);
  });

  test("someone else saved in between: their change is kept and ours is applied on top", async () => {
    let calls = 0;
    await updateTrip(admin, TRIP_ID, {
      patch: (current) => {
        calls++;
        // First attempt: the organizer edits a reservation while we're working
        if (calls === 1) {
          trip().itinerary_data = { ...trip().itinerary_data, _form_data: { ...trip().itinerary_data._form_data, country: "Japan (edited)" } };
          trip().revision = 1;
        }
        return { events: [{ id: "new" }], seen: current._form_data.country };
      },
    });
    expect(calls).toBe(2);
    expect(trip().itinerary_data._form_data.country).toBe("Japan (edited)");
    expect(trip().itinerary_data.events).toEqual([{ id: "new" }]);
    expect(trip().itinerary_data.seen).toBe("Japan (edited)");
  });

  test("gives up if the trip keeps changing", async () => {
    const patch = () => {
      trip().revision += 1;
      return { events: [] };
    };
    await expect(updateTrip(admin, TRIP_ID, { patch })).rejects.toThrow("kept changing");
  });

  test("never writes keys from before issue #31 back", async () => {
    trip().itinerary_data._status = "pending";
    trip().itinerary_data._food_spots = { Tokyo: [] };
    await updateTrip(admin, TRIP_ID, { patch: { events: [] } });
    expect(trip().itinerary_data._status).toBeUndefined();
    expect(trip().itinerary_data._food_spots).toBeUndefined();
  });

  test("column-only writes don't touch itinerary_data", async () => {
    const before = structuredClone(trip().itinerary_data);
    await updateTrip(admin, TRIP_ID, { columns: { status: "failed", error: "Nope" } });
    expect(trip()).toMatchObject({ status: "failed", error: "Nope" });
    expect(trip().itinerary_data).toEqual(before);
  });

  test("a missing trip is an error", async () => {
    await expect(updateTrip(admin, "nope", { columns: { status: "failed" } })).rejects.toThrow("no row was updated");
    await expect(updateTrip(admin, "nope", { patch: {} })).rejects.toThrow("Couldn't read trip");
  });
});

describe("food spots", () => {
  test("one row per city; saving one city leaves the others alone", async () => {
    await saveFoodSpots(admin, TRIP_ID, "Tokyo", { spots: [{ name: "Ramen" }], homebase: { name: "Hotel" } });
    await saveFoodSpots(admin, TRIP_ID, "Kyoto", { spots: [{ name: "Tofu" }] });
    await saveFoodSpots(admin, TRIP_ID, "Tokyo", { spots: [{ name: "Ramen" }, { name: "Sushi" }] });

    const { foodSpots, homebases } = await loadFoodSpots(admin, TRIP_ID);
    expect(foodSpots).toEqual({ Tokyo: [{ name: "Ramen" }, { name: "Sushi" }], Kyoto: [{ name: "Tofu" }] });
    // Tokyo's homebase was kept; Kyoto's was never looked up
    expect(homebases).toEqual({ Tokyo: { name: "Hotel" } });
  });

  test("a homebase looked up with nothing to pin is remembered as null", async () => {
    await saveFoodSpots(admin, TRIP_ID, "Tokyo", { homebase: null });
    expect((await loadFoodSpots(admin, TRIP_ID)).homebases).toEqual({ Tokyo: null });
  });
});
