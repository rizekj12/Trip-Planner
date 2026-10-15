// Travel partners' own reservations: a member (signed in) or guest (personal link) adds the
// flights and hotels they booked for a trip, with their confirmation codes.
//
// Privacy rule: everyone sees ONLY their own reservations.
//   - The organizer's reservations stay in the trip's form data (src/utils/reservations.js)
//     and are never shown to members or guests.
//   - A member's or guest's reservations live in member_reservations
//     (supabase/migrations), keyed by their trip_members row, and are only ever
//     returned to that same person: never to the organizer or other travelers.
// The table has row-level security with no policies, so only this server (service role)
// can read it; every route below works out who is asking and filters by their member row.
//
// Routes
//   Signed-in member:  GET|POST /api/trips/:tripId/my-reservations
//                      PUT|DELETE /api/trips/:tripId/my-reservations/:id
//   Guest (no account): the same under /api/guest/:guestToken/reservations
import { createClient } from "@supabase/supabase-js";
import { guestLinkExpired } from "./crew.js";
import { logger } from "./logger.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_RESERVATIONS_PER_TRAVELER = 30;

// The fields kept for each kind (same as BLANK_FLIGHT / BLANK_HOTEL in src/utils/reservations.js).
// Anything else sent by the browser is dropped.
const FIELDS = {
  flight: ["airline", "flightNumber", "confirmationCode", "from", "to", "date", "time", "notes"],
  hotel: ["name", "address", "checkIn", "checkOut", "confirmationCode", "notes"],
};
const MAX_LENGTH = { notes: 1000 };
const DEFAULT_MAX_LENGTH = 200;

// A clean copy of `details` for `kind`, or { error } if it isn't acceptable
export function cleanReservation(kind, details) {
  if (!FIELDS[kind]) return { error: "Reservations are flights or hotels" };
  if (!details || typeof details !== "object" || Array.isArray(details)) return { error: "Missing reservation details" };
  const clean = {};
  for (const field of FIELDS[kind]) {
    const value = details[field];
    if (value == null || value === "") continue;
    if (typeof value !== "string" && typeof value !== "number") return { error: `Invalid ${field}` };
    clean[field] = String(value).trim().slice(0, MAX_LENGTH[field] || DEFAULT_MAX_LENGTH);
  }
  if (kind === "hotel" && !clean.name) return { error: "A hotel needs a name" };
  if (!Object.values(clean).some(Boolean)) return { error: "Add at least one detail" };
  return { details: clean };
}

// A stored row as the browser sees it: { id, kind, ...details }
const toReservation = (row) => ({ ...row.details, id: row.id, kind: row.kind });

// { flights, hotels } in the same order as the organizer's Reservations tab
export function groupReservations(rows) {
  const items = rows.map(toReservation);
  const flights = items
    .filter((r) => r.kind === "flight")
    .sort((a, b) => `${a.date || "9999"} ${a.time || ""}`.localeCompare(`${b.date || "9999"} ${b.time || ""}`));
  const hotels = items
    .filter((r) => r.kind === "hotel")
    .sort((a, b) => (a.checkIn || "9999").localeCompare(b.checkIn || "9999"));
  return { flights, hotels };
}

export function registerMemberReservationRoutes(app, { supabaseUrl, serviceKey }) {
  const admin = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  const ready = (res) => {
    if (admin) return true;
    res.status(500).json({ error: "Reservations for travel partners aren't set up on the server (SUPABASE_SERVICE_ROLE_KEY missing)" });
    return false;
  };

  // The approved trip_members row of whoever is asking, or sends an error and returns null.
  // Members are found by their sign-in; guests by their personal link.
  async function signedInTraveler(req, res) {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const { data } = token ? await admin.auth.getUser(token) : { data: null };
    const user = data?.user;
    if (!user) return res.status(401).json({ error: "Please sign in" }), null;

    const { data: trip } = await admin.from("trips").select("id, user_id").eq("id", req.params.tripId).maybeSingle();
    if (!trip) return res.status(404).json({ error: "Trip not found" }), null;
    if (trip.user_id === user.id) {
      // The organizer's own codes are kept with the trip (the Reservations tab), not here
      return res.status(409).json({ error: "As the organizer, your reservations are saved with the trip" }), null;
    }
    const { data: member } = await admin
      .from("trip_members")
      .select("id, trip_id, status")
      .eq("trip_id", trip.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (member?.status !== "approved") return res.status(403).json({ error: "You're not on this trip" }), null;
    return member;
  }

  async function guestTraveler(req, res) {
    if (!UUID_RE.test(req.params.guestToken)) return res.status(404).json({ error: "This link is no longer valid" }), null;
    const { data: member } = await admin
      .from("trip_members")
      .select("id, trip_id, status")
      .eq("guest_token", req.params.guestToken)
      .maybeSingle();
    if (!member) return res.status(404).json({ error: "This link is no longer valid" }), null;
    if (member.status !== "approved") return res.status(403).json({ error: "Your request to join this trip is still waiting for approval" }), null;
    const { data: trip } = await admin.from("trips").select("id, itinerary_data").eq("id", member.trip_id).maybeSingle();
    if (!trip) return res.status(404).json({ error: "This link is no longer valid" }), null;
    if (guestLinkExpired(trip)) return res.status(410).json({ error: "This trip ended a while ago, so its guest link has expired." }), null;
    return member;
  }

  async function listFor(member) {
    const { data, error } = await admin
      .from("member_reservations")
      .select("id, kind, details")
      .eq("member_id", member.id)
      .order("created_at");
    if (error) throw error;
    return groupReservations(data || []);
  }

  // One of `member`'s own reservations by id, or null. Filtering by member_id is what stops
  // anyone from reading or changing someone else's reservation by guessing its id.
  async function ownReservation(member, id) {
    if (!UUID_RE.test(id || "")) return null;
    const { data } = await admin
      .from("member_reservations")
      .select("id, kind")
      .eq("id", id)
      .eq("member_id", member.id)
      .maybeSingle();
    return data;
  }

  // The same four handlers for members and guests; `who` finds the traveler
  const handlers = (who) => ({
    async list(req, res) {
      if (!ready(res)) return;
      const member = await who(req, res);
      if (!member) return;
      try {
        res.json(await listFor(member));
      } catch (err) {
        logger.error({ err, memberId: member.id }, "Couldn't load reservations");
        res.status(500).json({ error: "Couldn't load your reservations. Please try again." });
      }
    },

    async create(req, res) {
      if (!ready(res)) return;
      const member = await who(req, res);
      if (!member) return;
      const { kind } = req.body || {};
      const { details, error } = cleanReservation(kind, req.body?.details);
      if (error) return res.status(400).json({ error });

      const { count } = await admin
        .from("member_reservations")
        .select("id", { count: "exact", head: true })
        .eq("member_id", member.id);
      if ((count || 0) >= MAX_RESERVATIONS_PER_TRAVELER) {
        return res.status(409).json({ error: `You can save up to ${MAX_RESERVATIONS_PER_TRAVELER} reservations per trip.` });
      }

      const { error: insertError } = await admin
        .from("member_reservations")
        .insert({ trip_id: member.trip_id, member_id: member.id, kind, details });
      if (insertError) {
        logger.error({ err: insertError, memberId: member.id }, "Couldn't save reservation");
        return res.status(500).json({ error: "Couldn't save your reservation. Please try again." });
      }
      res.status(201).json(await listFor(member));
    },

    async update(req, res) {
      if (!ready(res)) return;
      const member = await who(req, res);
      if (!member) return;
      const existing = await ownReservation(member, req.params.id);
      if (!existing) return res.status(404).json({ error: "That reservation isn't yours or no longer exists" });
      const { details, error } = cleanReservation(existing.kind, req.body?.details);
      if (error) return res.status(400).json({ error });

      const { error: updateError } = await admin
        .from("member_reservations")
        .update({ details, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("member_id", member.id);
      if (updateError) {
        logger.error({ err: updateError, memberId: member.id }, "Couldn't update reservation");
        return res.status(500).json({ error: "Couldn't save your reservation. Please try again." });
      }
      res.json(await listFor(member));
    },

    async remove(req, res) {
      if (!ready(res)) return;
      const member = await who(req, res);
      if (!member) return;
      const existing = await ownReservation(member, req.params.id);
      if (!existing) return res.status(404).json({ error: "That reservation isn't yours or no longer exists" });
      await admin.from("member_reservations").delete().eq("id", existing.id).eq("member_id", member.id);
      res.json(await listFor(member));
    },
  });

  const member = handlers(signedInTraveler);
  app.get("/api/trips/:tripId/my-reservations", member.list);
  app.post("/api/trips/:tripId/my-reservations", member.create);
  app.put("/api/trips/:tripId/my-reservations/:id", member.update);
  app.delete("/api/trips/:tripId/my-reservations/:id", member.remove);

  const guest = handlers(guestTraveler);
  app.get("/api/guest/:guestToken/reservations", guest.list);
  app.post("/api/guest/:guestToken/reservations", guest.create);
  app.put("/api/guest/:guestToken/reservations/:id", guest.update);
  app.delete("/api/guest/:guestToken/reservations/:id", guest.remove);

  // For the PDF: a signed-in member's own { flights, hotels } on a trip (empty if none)
  async function forUser(tripId, userId) {
    if (!admin) return { flights: [], hotels: [] };
    const { data: member } = await admin
      .from("trip_members")
      .select("id, status")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    if (member?.status !== "approved") return { flights: [], hotels: [] };
    return listFor(member);
  }

  return { forUser };
}
