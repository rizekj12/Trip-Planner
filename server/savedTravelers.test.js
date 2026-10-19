// Saved travelers and their accounts (issue #57): "on Trip Planner" comes only from trips the
// two people share, so the list can't be used to probe whether an email is registered
import { describe, test, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db } from "./test/fakeSupabase.js";
import { OWNER, MEMBER, STRANGER, USERS, TOKENS, TRIP_ID, auth, readyTrip, members } from "./test/fixtures.js";

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
const { registerSavedTravelerRoutes, companionsOf, statusFor } = await import("./savedTravelers.js");

const app = express();
app.use(express.json());
registerSavedTravelerRoutes(app, { supabaseUrl: "http://fake", serviceKey: "service" });

const MEMBER_WITH_PHOTO = { ...MEMBER, user_metadata: { ...MEMBER.user_metadata, avatar_url: "https://photo/max.jpg" } };
const saved = (owner_id, email, extra = {}) => ({ id: crypto.randomUUID(), owner_id, name: email, email, relation: "Friend", linked_user_id: null, ...extra });
const status = (token) => request(app).get("/api/saved-travelers/status").set(auth(token));

beforeEach(() => {
  db.reset(
    { trips: [readyTrip()], trip_members: members(), saved_travelers: [] },
    { users: [OWNER, MEMBER_WITH_PHOTO, ...USERS.filter((u) => u.id !== OWNER.id && u.id !== MEMBER.id)], tokens: TOKENS }
  );
});

describe("GET /api/saved-travelers/status", () => {
  test("people you share a trip with: account, trips together and their photo", async () => {
    const max = saved(OWNER.id, "member@example.com");
    const gail = saved(OWNER.id, "guest@example.com");
    db.rows("saved_travelers").push(max, gail);
    const res = await status("token-owner");
    expect(res.status).toBe(200);
    expect(res.body.travelers[max.id]).toEqual({ onTripPlanner: true, tripsTogether: 1, avatarUrl: "https://photo/max.jpg" });
    // Gail joined as a guest (no account)
    expect(res.body.travelers[gail.id]).toEqual({ onTripPlanner: false, tripsTogether: 1 });
  });

  test("works from the member's side too: the organizer of a trip they joined", async () => {
    const olivia = saved(MEMBER.id, "OWNER@example.com");
    db.rows("saved_travelers").push(olivia);
    expect((await status("token-member")).body.travelers[olivia.id]).toMatchObject({ onTripPlanner: true, tripsTogether: 1 });
  });

  test("an account you've never shared a trip with looks the same as an unregistered email", async () => {
    const sam = saved(OWNER.id, STRANGER.email); // has an account, no trip together
    const nobody = saved(OWNER.id, "nobody@example.com");
    db.rows("saved_travelers").push(sam, nobody);
    const { travelers } = (await status("token-owner")).body;
    expect(travelers[sam.id]).toEqual({ onTripPlanner: false, tripsTogether: 0 });
    expect(travelers[nobody.id]).toEqual(travelers[sam.id]);
  });

  test("pending requests and other people's saved travelers don't count", async () => {
    const pat = saved(OWNER.id, "pending@example.com");
    db.rows("saved_travelers").push(pat, saved(MEMBER.id, "member@example.com"));
    const { travelers } = (await status("token-owner")).body;
    expect(Object.keys(travelers)).toEqual([pat.id]);
    expect(travelers[pat.id].onTripPlanner).toBe(false);
  });

  test("a linked account is matched even after their email changed, but a link to a stranger reveals nothing", async () => {
    const max = saved(OWNER.id, "old-address@example.com", { linked_user_id: MEMBER.id });
    const forged = saved(OWNER.id, "x@example.com", { linked_user_id: STRANGER.id });
    db.rows("saved_travelers").push(max, forged);
    const { travelers } = (await status("token-owner")).body;
    expect(travelers[max.id]).toMatchObject({ onTripPlanner: true, tripsTogether: 1 });
    expect(travelers[forged.id]).toEqual({ onTripPlanner: false, tripsTogether: 0 });
  });

  test("requires sign-in", async () => {
    expect((await request(app).get("/api/saved-travelers/status")).status).toBe(401);
  });
});

describe("POST /api/trips/:tripId/crew/:memberId/save", () => {
  const save = (token, memberId, body = {}) => request(app).post(`/api/trips/${TRIP_ID}/crew/${memberId}/save`).set(auth(token)).send(body);
  const MAX = "00000000-0000-4000-8000-00000000000a";
  const GAIL = "00000000-0000-4000-8000-00000000000b";
  const PAT = "00000000-0000-4000-8000-00000000000c";
  beforeEach(() => {
    const ids = { "m-approved": MAX, "m-guest": GAIL, "m-pending": PAT };
    db.rows("trip_members").forEach((m) => { if (ids[m.id]) m.id = ids[m.id]; });
  });

  test("the organizer saves a member linked to their account, with their current name", async () => {
    const res = await save("token-owner", MAX, { relation: "Family" });
    expect(res.status).toBe(201);
    expect(db.rows("saved_travelers")).toMatchObject([{ owner_id: OWNER.id, name: "Max Member", email: MEMBER.email, relation: "Family", linked_user_id: MEMBER.id }]);
  });

  test("a guest is saved without a link", async () => {
    await save("token-owner", GAIL);
    expect(db.rows("saved_travelers")[0]).toMatchObject({ email: "guest@example.com", linked_user_id: null, relation: "Friend" });
  });

  test("someone already saved by email gets linked instead of duplicated", async () => {
    const existing = saved(OWNER.id, MEMBER.email, { name: "Maxie", relation: "Partner" });
    db.rows("saved_travelers").push(existing);
    expect((await save("token-owner", MAX)).status).toBe(200);
    expect(db.rows("saved_travelers")).toEqual([{ ...existing, linked_user_id: MEMBER.id }]);
  });

  test("only the organizer, only approved people on this trip", async () => {
    expect((await save("token-member", GAIL)).status).toBe(403);
    expect((await save("token-stranger", MAX)).status).toBe(403);
    expect((await save("token-owner", PAT)).status).toBe(404);
    expect((await save("token-owner", "not-a-uuid")).status).toBe(404);
    expect(db.rows("saved_travelers")).toHaveLength(0);
  });
});

test("companionsOf: an account wins over a guest entry with the same email", () => {
  const together = companionsOf(
    "me",
    [{ id: "t1", user_id: "me" }, { id: "t2", user_id: "me" }],
    [
      { trip_id: "t1", user_id: null, email: "ann@example.com" },
      { trip_id: "t2", user_id: "ann", email: "Ann@example.com" },
    ]
  );
  expect(statusFor({ email: "ann@example.com" }, together)).toMatchObject({ onTripPlanner: true, tripsTogether: 1 });
});
