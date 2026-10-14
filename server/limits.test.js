// The daily itinerary cap (issue #27) and its local-testing override
import { describe, test, expect, beforeEach, vi } from "vitest";
import { db } from "./test/fakeSupabase.js";

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
const { createGuards, dailyGenerationLimit, DAILY_GENERATIONS } = await import("./limits.js");

describe("dailyGenerationLimit", () => {
  test("defaults to the normal cap", () => {
    expect(dailyGenerationLimit({})).toBe(DAILY_GENERATIONS);
    expect(dailyGenerationLimit({ DAILY_GENERATION_LIMIT: "" })).toBe(DAILY_GENERATIONS);
  });

  test("DAILY_GENERATION_LIMIT changes it locally", () => {
    expect(dailyGenerationLimit({ DAILY_GENERATION_LIMIT: "100" })).toBe(100);
    expect(dailyGenerationLimit({ DAILY_GENERATION_LIMIT: "1", NODE_ENV: "development" })).toBe(1);
  });

  test("is ignored in production", () => {
    expect(dailyGenerationLimit({ DAILY_GENERATION_LIMIT: "100", NODE_ENV: "production" })).toBe(DAILY_GENERATIONS);
  });

  test("bad values fall back to the normal cap", () => {
    for (const bad of ["0", "-3", "2.5", "lots"]) {
      expect(dailyGenerationLimit({ DAILY_GENERATION_LIMIT: bad })).toBe(DAILY_GENERATIONS);
    }
  });
});

describe("reserveGeneration", () => {
  const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
  const guardsWith = (dailyLimit) => createGuards({ supabaseUrl: "http://fake", anonKey: "anon", serviceKey: "service", dailyLimit });

  beforeEach(() => {
    db.reset({ trip_generations: [] });
  });

  test("allows up to the limit in 24 hours, then refuses with when the next one frees up", async () => {
    const guards = guardsWith(2);
    expect(await guards.reserveGeneration("u1", "t1")).toHaveProperty("id");
    expect(await guards.reserveGeneration("u1", "t2")).toHaveProperty("id");
    const refused = await guards.reserveGeneration("u1", "t3");
    expect(refused.status).toBe(429);
    expect(refused.error).toMatch(/limit of 2 itineraries per day.*about 24 hours/);
    // Other people aren't affected
    expect(await guards.reserveGeneration("u2", "t4")).toHaveProperty("id");
  });

  test("a higher limit lets testers keep going", async () => {
    db.reset({ trip_generations: Array.from({ length: 4 }, (_, i) => ({ id: i + 1, user_id: "u1", created_at: hoursAgo(1) })) });
    expect((await guardsWith(DAILY_GENERATIONS).reserveGeneration("u1", "t")).status).toBe(429);
    expect(await guardsWith(100).reserveGeneration("u1", "t")).toHaveProperty("id");
  });

  test("generations older than a day don't count", async () => {
    db.reset({ trip_generations: Array.from({ length: 4 }, (_, i) => ({ id: i + 1, user_id: "u1", created_at: hoursAgo(25) })) });
    expect(await guardsWith(DAILY_GENERATIONS).reserveGeneration("u1", "t")).toHaveProperty("id");
  });

  test("when over the limit, the wait is until enough old ones expire", async () => {
    // 3 used: 20h, 10h and 1h ago; limit lowered to 2 -> the 10h-ago one must expire (about 14h)
    db.reset({ trip_generations: [20, 10, 1].map((h, i) => ({ id: i + 1, user_id: "u1", created_at: hoursAgo(h) })) });
    expect((await guardsWith(2).reserveGeneration("u1", "t")).error).toMatch(/about 14 hours/);
  });
});
