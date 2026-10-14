// Travel Crew privacy and permissions (issue #34): who can see what, and who can change what.
// Uses an in-memory Supabase (server/test/fakeSupabase.js), so these test the server's own
// checks; row-level security itself isn't simulated.
import { describe, test, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db } from "./test/fakeSupabase.js";
import {
  OWNER, MEMBER, USERS, TOKENS, TRIP_ID, GUEST_TOKEN, PENDING_GUEST_TOKEN, INVITE_TOKEN,
  auth, readyTrip, members, leaksSecrets,
} from "./test/fixtures.js";

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
const { registerCrewRoutes, withoutPrivateDetails, MAX_TRAVELERS } = await import("./crew.js");

const notifier = { notify: vi.fn(), resolveJoinRequest: vi.fn() };
const app = express();
app.use(express.json());
registerCrewRoutes(app, { supabaseUrl: "http://fake", serviceKey: "service", notifier });

const inFuture = (days) => new Date(Date.now() + days * 86400000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.reset(
    {
      trips: [readyTrip()],
      trip_members: members(),
      trip_invites: [{ trip_id: TRIP_ID, token: INVITE_TOKEN, expires_at: inFuture(10), require_approval: false }],
      profiles: [],
    },
    { users: USERS, tokens: TOKENS }
  );
});

describe("withoutPrivateDetails", () => {
  test("removes reservations, hotel codes and notes, and the PDF timestamp", () => {
    const shared = withoutPrivateDetails(readyTrip().itinerary_data);
    expect(leaksSecrets(shared)).toEqual([]);
    expect(shared._form_data.reservations).toBeUndefined();
    expect(shared._pdf_downloaded_at).toBeUndefined();
  });

  test("keeps what partners need: the itinerary, cities, hotel name and address", () => {
    const shared = withoutPrivateDetails(readyTrip().itinerary_data);
    expect(shared.days).toHaveLength(1);
    expect(shared._form_data.cities[0].hotel).toEqual({ name: "Hotel Sakura", address: "1-1 Ginza, Tokyo" });
    expect(shared._form_data.cities[0].checkIn).toBe("2030-04-01");
  });

  test("does not modify the original data", () => {
    const original = readyTrip().itinerary_data;
    withoutPrivateDetails(original);
    expect(original._form_data.reservations.flights).toHaveLength(1);
  });

  test("handles trips without form data or hotels", () => {
    expect(() => withoutPrivateDetails()).not.toThrow();
    const shared = withoutPrivateDetails({ _form_data: { cities: [{ name: "Lima", hotel: null }] } });
    expect(shared._form_data.cities[0].hotel).toBeNull();
  });
});

describe("GET /api/trips/:tripId/crew", () => {
  const crew = (token) => request(app).get(`/api/trips/${TRIP_ID}/crew`).set(token ? auth(token) : {});

  test("requires sign-in", async () => {
    expect((await crew()).status).toBe(401);
  });

  test("strangers and pending members can't see the crew", async () => {
    expect((await crew("token-stranger")).status).toBe(403);
    expect((await crew("token-pending")).status).toBe(403);
  });

  test("the owner sees emails and pending requests", async () => {
    const res = await crew("token-owner");
    expect(res.status).toBe(200);
    expect(res.body.isOwner).toBe(true);
    expect(res.body.people.map((p) => p.email)).toContain(MEMBER.email);
    expect(res.body.people.some((p) => p.status === "pending")).toBe(true);
  });

  test("an approved member sees names but no emails and no pending requests", async () => {
    const res = await crew("token-member");
    expect(res.status).toBe(200);
    expect(res.body.isOwner).toBe(false);
    expect(res.body.people.every((p) => p.email === undefined)).toBe(true);
    expect(res.body.people.some((p) => p.status === "pending")).toBe(false);
    expect(res.body.people.find((p) => p.isYou).name).toBe("Max Member");
  });
});

describe("POST /api/trips/:tripId/invite", () => {
  test("only the owner can get or change the invite link", async () => {
    for (const token of ["token-member", "token-stranger"]) {
      const res = await request(app).post(`/api/trips/${TRIP_ID}/invite`).set(auth(token)).send({ reset: true });
      expect(res.status).toBe(403);
    }
    expect(db.rows("trip_invites")[0].token).toBe(INVITE_TOKEN);
  });

  test("the owner gets the existing link, and reset replaces it", async () => {
    const same = await request(app).post(`/api/trips/${TRIP_ID}/invite`).set(auth("token-owner")).send({});
    expect(same.body.token).toBe(INVITE_TOKEN);
    const reset = await request(app).post(`/api/trips/${TRIP_ID}/invite`).set(auth("token-owner")).send({ reset: true });
    expect(reset.body.token).not.toBe(INVITE_TOKEN);
  });
});

describe("joining with an invite link", () => {
  const join = (body, token) =>
    request(app).post(`/api/invites/${INVITE_TOKEN}/join`).set(token ? auth(token) : {}).send(body);

  test("the invite preview doesn't reveal private trip details", async () => {
    const res = await request(app).get(`/api/invites/${INVITE_TOKEN}`);
    expect(res.status).toBe(200);
    expect(leaksSecrets(res.body)).toEqual([]);
    expect(res.body.ownerName).toBe("Olivia Owner");
  });

  test("guests need a name and a valid email", async () => {
    expect((await join({ name: "", email: "a@b.co" })).status).toBe(400);
    expect((await join({ name: "Ann", email: "not-an-email" })).status).toBe(400);
  });

  test("a new guest gets a personal link and the owner is notified", async () => {
    const res = await join({ name: "Ann", email: "Ann@Example.com" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
    expect(res.body.guestToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(db.rows("trip_members").find((m) => m.email === "ann@example.com")).toBeTruthy();
    expect(notifier.notify).toHaveBeenCalledWith(OWNER.id, "member_joined", expect.anything());
  });

  test("with approval on, new travelers wait as pending", async () => {
    db.rows("trip_invites")[0].require_approval = true;
    const res = await join({}, "token-stranger");
    expect(res.body.status).toBe("pending");
    expect(notifier.notify).toHaveBeenCalledWith(OWNER.id, "join_request", expect.anything());
  });

  test("an expired link is refused", async () => {
    db.rows("trip_invites")[0].expires_at = inFuture(-1);
    expect((await join({}, "token-stranger")).status).toBe(410);
  });

  test("a stale sign-in isn't treated as a guest", async () => {
    expect((await join({ name: "Ann", email: "ann@example.com" }, "token-revoked")).status).toBe(401);
  });

  test(`a full trip (${MAX_TRAVELERS} travelers) can't be joined`, async () => {
    const extra = Array.from({ length: MAX_TRAVELERS }, (_, i) => ({
      id: `full-${i}`, trip_id: TRIP_ID, user_id: `u-${i}`, role: "member", status: "approved", name: "x", joined_at: "2029-01-01T00:00:00Z",
    }));
    db.rows("trip_members").push(...extra);
    expect((await join({}, "token-stranger")).status).toBe(409);
  });
});

describe("GET /api/guest/:guestToken", () => {
  test("an approved guest sees the trip without any private details or emails", async () => {
    const res = await request(app).get(`/api/guest/${GUEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.trip.itinerary_data.days).toHaveLength(1);
    expect(leaksSecrets(res.body)).toEqual([]);
    expect(res.body.crew.people.every((p) => p.email === undefined)).toBe(true);
  });

  test("a pending guest sees no trip at all", async () => {
    const res = await request(app).get(`/api/guest/${PENDING_GUEST_TOKEN}`);
    expect(res.body.status).toBe("pending");
    expect(res.body.trip).toBeUndefined();
  });

  test("unknown or malformed links are refused", async () => {
    expect((await request(app).get("/api/guest/not-a-uuid")).status).toBe(404);
    expect((await request(app).get("/api/guest/44444444-4444-4444-8444-444444444444")).status).toBe(404);
  });
});

describe("approving and removing travelers", () => {
  test("only the owner can approve or decline requests", async () => {
    const approve = (token) => request(app).post(`/api/trips/${TRIP_ID}/crew/m-pending/approve`).set(auth(token));
    expect((await approve("token-member")).status).toBe(403);
    expect(db.rows("trip_members").find((m) => m.id === "m-pending").status).toBe("pending");
    expect((await approve("token-owner")).status).toBe(200);
    expect(db.rows("trip_members").find((m) => m.id === "m-pending").status).toBe("approved");
  });

  test("a member can leave but can't remove anyone else", async () => {
    const remove = (id, token) => request(app).delete(`/api/trips/${TRIP_ID}/crew/${id}`).set(auth(token));
    expect((await remove("m-guest", "token-member")).status).toBe(403);
    expect(db.rows("trip_members").some((m) => m.id === "m-guest")).toBe(true);
    expect((await remove("m-approved", "token-member")).status).toBe(200);
    expect(db.rows("trip_members").some((m) => m.id === "m-approved")).toBe(false);
  });

  test("the owner can remove anyone", async () => {
    const res = await request(app).delete(`/api/trips/${TRIP_ID}/crew/m-guest`).set(auth("token-owner"));
    expect(res.status).toBe(200);
  });
});
