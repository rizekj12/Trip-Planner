// Travel partners' own reservations: each traveler sees and changes only their own, and the
// organizer never sees theirs (and vice versa).
import { describe, test, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { db } from "./test/fakeSupabase.js";
import {
  USERS, TOKENS, TRIP_ID, GUEST_TOKEN, PENDING_GUEST_TOKEN, MEMBER,
  auth, readyTrip, members, leaksSecrets,
} from "./test/fixtures.js";

const mocks = vi.hoisted(() => {
  process.env.ANTHROPIC_API_KEY = "test-anthropic";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service";
  return { pdfTrips: [] };
});
vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
vi.mock("./generationJobs.js", () => ({ createGenerationJobs: () => ({ startSweeper() {}, isRunning: async () => false, start: async () => {} }) }));
vi.mock("./pdf.js", () => ({
  buildTripPdf: async (trip) => {
    mocks.pdfTrips.push(trip);
    return { pipe: (res) => res.end("%PDF-fake"), end: () => {} };
  },
}));

const { cleanReservation, groupReservations, MAX_RESERVATIONS_PER_TRAVELER } = await import("./memberReservations.js");
const { default: app } = await import("./index.js");

const MEMBER_FLIGHT = { airline: "Delta", flightNumber: "DL 9", confirmationCode: "MEMBER-CODE-9", from: "ATL", to: "HND", date: "2030-03-31", time: "08:00" };
const GUEST_HOTEL = { name: "Capsule Inn", address: "Shinjuku", confirmationCode: "GUEST-CODE-7", checkIn: "2030-04-01", checkOut: "2030-04-03" };

const mine = (token) => request(app).get(`/api/trips/${TRIP_ID}/my-reservations`).set(auth(token));
const addMine = (token, kind, details) =>
  request(app).post(`/api/trips/${TRIP_ID}/my-reservations`).set(auth(token)).send({ kind, details });
const guestPath = (token = GUEST_TOKEN) => `/api/guest/${token}/reservations`;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.pdfTrips.length = 0;
  db.reset({ trips: [readyTrip()], trip_members: members(), member_reservations: [], trip_invites: [], profiles: [] }, { users: USERS, tokens: TOKENS });
});

describe("cleanReservation", () => {
  test("keeps only known fields, trimmed and length-limited", () => {
    const { details } = cleanReservation("flight", { ...MEMBER_FLIGHT, airline: "  Delta  ", user_id: "someone-else", notes: "x".repeat(5000) });
    expect(details.airline).toBe("Delta");
    expect(details.user_id).toBeUndefined();
    expect(details.notes).toHaveLength(1000);
  });

  test("rejects unknown kinds, empty entries, nameless hotels and odd values", () => {
    expect(cleanReservation("car", {}).error).toBeTruthy();
    expect(cleanReservation("flight", {}).error).toBeTruthy();
    expect(cleanReservation("flight", null).error).toBeTruthy();
    expect(cleanReservation("hotel", { confirmationCode: "X" }).error).toMatch(/name/);
    expect(cleanReservation("flight", { airline: { $ne: 1 } }).error).toBeTruthy();
  });

  test("groups and sorts like the organizer's tab", () => {
    const grouped = groupReservations([
      { id: "b", kind: "flight", details: { date: "2030-04-05" } },
      { id: "a", kind: "flight", details: { date: "2030-03-31" } },
      { id: "h", kind: "hotel", details: { name: "H" } },
    ]);
    expect(grouped.flights.map((f) => f.id)).toEqual(["a", "b"]);
    expect(grouped.hotels).toEqual([{ id: "h", kind: "hotel", name: "H" }]);
  });
});

describe("a signed-in travel partner", () => {
  test("starts with no reservations, and never sees the organizer's", async () => {
    const res = await mine("token-member");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ flights: [], hotels: [] });
    expect(leaksSecrets(res.body)).toEqual([]);
  });

  test("can add, edit and delete their own flight", async () => {
    const added = await addMine("token-member", "flight", MEMBER_FLIGHT);
    expect(added.status).toBe(201);
    const [flight] = added.body.flights;
    expect(flight).toMatchObject({ confirmationCode: "MEMBER-CODE-9", kind: "flight" });

    const edited = await request(app)
      .put(`/api/trips/${TRIP_ID}/my-reservations/${flight.id}`)
      .set(auth("token-member"))
      .send({ details: { ...MEMBER_FLIGHT, confirmationCode: "NEW-CODE" } });
    expect(edited.body.flights[0].confirmationCode).toBe("NEW-CODE");

    const removed = await request(app).delete(`/api/trips/${TRIP_ID}/my-reservations/${flight.id}`).set(auth("token-member"));
    expect(removed.body.flights).toEqual([]);
  });

  test("pending members, strangers and signed-out callers can't use it", async () => {
    expect((await mine("token-pending")).status).toBe(403);
    expect((await mine("token-stranger")).status).toBe(403);
    expect((await request(app).get(`/api/trips/${TRIP_ID}/my-reservations`)).status).toBe(401);
    expect((await addMine("token-stranger", "flight", MEMBER_FLIGHT)).status).toBe(403);
    expect(db.rows("member_reservations")).toHaveLength(0);
  });

  test("the organizer is pointed to their own Reservations tab instead", async () => {
    expect((await mine("token-owner")).status).toBe(409);
  });

  test(`is limited to ${MAX_RESERVATIONS_PER_TRAVELER} reservations per trip`, async () => {
    db.rows("member_reservations").push(
      ...Array.from({ length: MAX_RESERVATIONS_PER_TRAVELER }, (_, i) => ({
        id: `r-${i}`, trip_id: TRIP_ID, member_id: "m-approved", kind: "flight", details: { airline: "X" }, created_at: "2030-01-01",
      }))
    );
    expect((await addMine("token-member", "flight", MEMBER_FLIGHT)).status).toBe(409);
  });
});

describe("a guest (no account)", () => {
  test("can add and list their own hotel by their personal link", async () => {
    const added = await request(app).post(guestPath()).send({ kind: "hotel", details: GUEST_HOTEL });
    expect(added.status).toBe(201);
    expect(added.body.hotels[0].confirmationCode).toBe("GUEST-CODE-7");
    const listed = await request(app).get(guestPath());
    expect(listed.body.hotels).toHaveLength(1);
    expect(leaksSecrets(listed.body)).toEqual([]);
  });

  test("a pending guest or a bad link can't", async () => {
    expect((await request(app).get(guestPath(PENDING_GUEST_TOKEN))).status).toBe(403);
    expect((await request(app).get(guestPath("not-a-token"))).status).toBe(404);
    expect((await request(app).get(guestPath("44444444-4444-4444-8444-444444444444"))).status).toBe(404);
  });
});

describe("privacy between travelers", () => {
  beforeEach(async () => {
    await addMine("token-member", "flight", MEMBER_FLIGHT);
    await request(app).post(guestPath()).send({ kind: "hotel", details: GUEST_HOTEL });
  });

  const everyResponse = async () => {
    const owner = auth("token-owner");
    return [
      await mine("token-member"),
      await request(app).get(guestPath()),
      await request(app).get(`/api/trips/${TRIP_ID}/crew`).set(owner),
      await request(app).get(`/api/trips/${TRIP_ID}/crew`).set(auth("token-member")),
      await request(app).get(`/api/guest/${GUEST_TOKEN}`),
    ];
  };

  test("each traveler only gets their own codes back", async () => {
    const [member, guest] = await everyResponse();
    expect(JSON.stringify(member.body)).toContain("MEMBER-CODE-9");
    expect(JSON.stringify(member.body)).not.toContain("GUEST-CODE-7");
    expect(JSON.stringify(guest.body)).toContain("GUEST-CODE-7");
    expect(JSON.stringify(guest.body)).not.toContain("MEMBER-CODE-9");
  });

  test("partners' codes never appear in the crew list or guest view, even for the organizer", async () => {
    const [, , ownerCrew, memberCrew, guestView] = await everyResponse();
    for (const res of [ownerCrew, memberCrew, guestView]) {
      expect(JSON.stringify(res.body)).not.toContain("MEMBER-CODE-9");
      expect(JSON.stringify(res.body)).not.toContain("GUEST-CODE-7");
    }
  });

  test("nobody can edit or delete someone else's reservation by its id", async () => {
    const memberRow = db.rows("member_reservations").find((r) => r.member_id === "m-approved");
    const hijack = await request(app).put(`${guestPath()}/${memberRow.id}`).send({ details: { airline: "Hijacked" } });
    expect(hijack.status).toBe(404);
    const del = await request(app).delete(`/api/trips/${TRIP_ID}/my-reservations/${memberRow.id}`).set(auth("token-owner"));
    expect(del.status).toBe(409);
    expect(db.rows("member_reservations").find((r) => r.id === memberRow.id).details.airline).toBe("Delta");
  });

  test("leaving the trip takes your reservations with you", async () => {
    // The database does this with on delete cascade; here we check the server stops serving them
    db.rows("trip_members").splice(db.rows("trip_members").findIndex((m) => m.id === "m-approved"), 1);
    expect((await mine("token-member")).status).toBe(403);
  });
});

describe("PDF", () => {
  test("a partner's PDF has their own reservations and none of the organizer's or other travelers'", async () => {
    await addMine("token-member", "flight", MEMBER_FLIGHT);
    await request(app).post(guestPath()).send({ kind: "hotel", details: GUEST_HOTEL });
    const res = await request(app).post("/api/trip-pdf").set(auth("token-member")).send({ tripId: TRIP_ID });
    expect(res.status).toBe(200);
    const pdfData = mocks.pdfTrips[0].itinerary_data;
    expect(pdfData._form_data.reservations.flights[0].confirmationCode).toBe("MEMBER-CODE-9");
    expect(leaksSecrets(pdfData)).toEqual([]);
    expect(JSON.stringify(pdfData)).not.toContain("GUEST-CODE-7");
  });

  test("the organizer's PDF doesn't include partners' reservations", async () => {
    await addMine("token-member", "flight", MEMBER_FLIGHT);
    db.rows("trip_food_spots").push({ trip_id: TRIP_ID, city: "Tokyo", spots: [{ name: "Saved" }], homebase: null, homebase_checked_at: "2030-01-01T00:00:00Z" });
    await request(app).post("/api/trip-pdf").set(auth("token-owner")).send({ tripId: TRIP_ID });
    expect(JSON.stringify(mocks.pdfTrips[0])).not.toContain("MEMBER-CODE-9");
  });
});

test("fixtures sanity: the member is approved", () => {
  expect(members().find((m) => m.user_id === MEMBER.id).status).toBe("approved");
});
