// Food spots shared across trips to the same city (server/foodSpotCache.js)
import { describe, test, expect, beforeEach, vi } from "vitest";
import { db } from "./test/fakeSupabase.js";

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
// Claude: one reply per call, counted
const claude = vi.hoisted(() => ({ calls: 0, spots: [] }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async () => {
        claude.calls++;
        return { stop_reason: "end_turn", usage: {}, content: [{ type: "text", text: JSON.stringify({ spots: claude.spots }) }] };
      },
    };
  },
}));
// Geoapify: every place found at the same spot
vi.mock("./geoapify.js", () => ({ locatePlaces: async (spots) => spots.map((s) => ("coords" in s ? s : { ...s, coords: [35, 135] })) }));

const { createFoodSpotCache, dietaryKey, CACHE_DAYS } = await import("./foodSpotCache.js");
const { addFoodSpots } = await import("./foodSpots.js");

const names = (n, prefix = "Place") => Array.from({ length: n }, (_, i) => ({ name: `${prefix} ${i + 1}` }));
const cache = createFoodSpotCache({ supabaseUrl: "http://fake", serviceKey: "service" });
const kyoto = (extra = {}) => addFoodSpots({ city: "Kyoto", country: "Japan", anthropicKey: "k", geoapifyKey: "g", cache, ...extra });

beforeEach(() => {
  db.reset({ food_spot_cache: [] });
  claude.calls = 0;
  claude.spots = names(12);
});

describe("addFoodSpots with the shared cache", () => {
  test("the second trip to a city reuses the first one's list, pins included", async () => {
    const first = await kyoto();
    expect(claude.calls).toBe(1);
    expect(db.rows("food_spot_cache")).toMatchObject([{ country: "japan", city: "kyoto", dietary: "" }]);

    const second = await kyoto();
    expect(claude.calls).toBe(1);
    expect(second).toEqual(first);
    expect(second[0].coords).toEqual([35, 135]);
  });

  test("different dietary needs get their own list", async () => {
    await kyoto();
    await kyoto({ traveler: { needs: ["Vegan", "Limited walking"] } });
    expect(claude.calls).toBe(2);
    expect(db.rows("food_spot_cache").map((r) => r.dietary).sort()).toEqual(["", "vegan"]);
  });

  test("city names match regardless of case and spaces", async () => {
    await kyoto();
    await addFoodSpots({ city: " kyoto ", country: "JAPAN", anthropicKey: "k", cache });
    expect(claude.calls).toBe(1);
  });

  test(`lists older than ${CACHE_DAYS} days are made again`, async () => {
    await kyoto();
    db.rows("food_spot_cache")[0].created_at = new Date(Date.now() - (CACHE_DAYS + 1) * 86400000).toISOString();
    await kyoto();
    expect(claude.calls).toBe(2);
  });

  test("load more always asks Claude, and isn't shared", async () => {
    const first = await kyoto();
    claude.spots = names(10, "More");
    const more = await kyoto({ existing: first });
    expect(claude.calls).toBe(2);
    expect(more).toHaveLength(22);
    expect(db.rows("food_spot_cache")[0].spots).toHaveLength(12);
  });

  test("short lists aren't shared", async () => {
    claude.spots = names(3);
    await kyoto();
    expect(db.rows("food_spot_cache")).toHaveLength(0);
  });

  test("without the cache (or with it broken) food spots still work", async () => {
    expect(await kyoto({ cache: undefined })).toHaveLength(12);
    const broken = { get: async () => { throw new Error("db down"); }, put: async () => { throw new Error("db down"); } };
    expect(await kyoto({ cache: broken })).toHaveLength(12);
  });
});

test("dietaryKey uses only dietary needs, sorted", () => {
  expect(dietaryKey({ needs: ["Vegan", "Wheelchair user", "Gluten-free"] })).toBe("gluten-free,vegan");
  expect(dietaryKey(undefined)).toBe("");
});
