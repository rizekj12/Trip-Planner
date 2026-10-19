// Saved travelers and their accounts (issue #57).
//
// Privacy rule: whether a saved traveler is "on Trip Planner" is decided only from trips the
// two people actually share (the caller's own trips and trips they've joined). It never looks
// up an email against all accounts, so the list can't be used to find out whether some
// address is registered: it only tells you what your trips' crew lists already show.
//
// Routes (signed in)
//   GET  /api/saved-travelers/status                  per saved traveler: account, trips together
//   POST /api/trips/:tripId/crew/:memberId/save       organizer saves a crew member, linked to
//                                                     their account (supabase/migrations)
import { createClient } from "@supabase/supabase-js";
import { displayName } from "./crew.js";
import { logger } from "./logger.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RELATIONS = ["Partner", "Family", "Friend", "Colleague", "Other"];
const lower = (email) => (email ? String(email).trim().toLowerCase() : null);

// Everyone who has shared a trip with `userId`, from `trips` (each { id, user_id }) and the
// approved `members` of those trips (each { trip_id, user_id, email }). Returns
// { byUser: Map(userId -> person), byEmail: Map(email -> person) }, where a person is
// { userId | null, emails: Set, trips: Set }. People with an account are keyed by it; guests
// by their email. `ownerEmails` maps a trip owner's id to their account email.
export function companionsOf(userId, trips, members, ownerEmails = new Map()) {
  const byUser = new Map();
  const byEmail = new Map();
  const add = ({ userId: id, email, tripId }) => {
    if (id === userId) return;
    const key = lower(email);
    let person = id ? byUser.get(id) : key && byEmail.get(key);
    if (!person) {
      person = { userId: id || null, emails: new Set(), trips: new Set() };
      if (id) byUser.set(id, person);
    }
    if (key) {
      person.emails.add(key);
      // An account wins over a guest entry with the same email
      if (!byEmail.has(key) || (id && !byEmail.get(key).userId)) byEmail.set(key, person);
    }
    person.trips.add(String(tripId));
  };

  for (const trip of trips) add({ userId: trip.user_id, email: ownerEmails.get(trip.user_id), tripId: trip.id });
  for (const m of members) add({ userId: m.user_id, email: m.email, tripId: m.trip_id });
  return { byUser, byEmail };
}

// The status shown for one saved traveler: matched by their linked account first, then email
export function statusFor(traveler, companions) {
  const person =
    (traveler.linked_user_id && companions.byUser.get(traveler.linked_user_id)) ||
    (traveler.email && companions.byEmail.get(lower(traveler.email)));
  if (!person) return { onTripPlanner: false, tripsTogether: 0 };
  return { onTripPlanner: !!person.userId, tripsTogether: person.trips.size, userId: person.userId };
}

export function registerSavedTravelerRoutes(app, { supabaseUrl, serviceKey }) {
  const admin = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  // The signed-in user, or sends 401/500 and returns null
  async function signedIn(req, res) {
    if (!admin) {
      res.status(500).json({ error: "Saved travelers aren't set up on the server (SUPABASE_SERVICE_ROLE_KEY missing)" });
      return null;
    }
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const { data } = token ? await admin.auth.getUser(token) : { data: null };
    if (!data?.user) {
      res.status(401).json({ error: "Please sign in" });
      return null;
    }
    return data.user;
  }

  const accountOf = async (id) => (await admin.auth.admin.getUserById(id)).data?.user || null;

  // Everyone who has shared a trip with `userId` (see companionsOf)
  async function companions(userId) {
    const [{ data: own = [] }, { data: joined = [] }] = await Promise.all([
      admin.from("trips").select("id, user_id").eq("user_id", userId),
      admin.from("trip_members").select("trip_id").eq("user_id", userId).eq("status", "approved"),
    ]);
    const ownIds = new Set(own.map((t) => String(t.id)));
    const joinedIds = [...new Set(joined.map((m) => String(m.trip_id)))].filter((id) => !ownIds.has(id));
    const tripIds = [...ownIds, ...joinedIds];
    if (!tripIds.length) return companionsOf(userId, [], []);

    const [{ data: members = [] }, { data: joinedTrips = [] }] = await Promise.all([
      admin.from("trip_members").select("trip_id, user_id, email").in("trip_id", tripIds).eq("status", "approved"),
      joinedIds.length ? admin.from("trips").select("id, user_id").in("id", joinedIds) : { data: [] },
    ]);
    // Organizers of trips the user joined: their account email, to match saved emails
    const ownerIds = [...new Set(joinedTrips.map((t) => t.user_id))];
    const ownerEmails = new Map(
      await Promise.all(ownerIds.map(async (id) => [id, (await accountOf(id))?.email || null]))
    );
    return companionsOf(userId, [...own, ...joinedTrips], members, ownerEmails);
  }

  app.get("/api/saved-travelers/status", async (req, res) => {
    const user = await signedIn(req, res);
    if (!user) return;
    try {
      const { data: saved, error } = await admin
        .from("saved_travelers")
        .select("id, email, linked_user_id")
        .eq("owner_id", user.id);
      if (error) throw error;
      const together = await companions(user.id);

      const statuses = saved.map((t) => ({ id: t.id, ...statusFor(t, together) }));
      // Current photo, only for people the user shares a trip with (it's on their crew lists)
      await Promise.all(
        statuses.map(async (s) => {
          if (s.userId) s.avatarUrl = (await accountOf(s.userId))?.user_metadata?.avatar_url || null;
          delete s.userId;
        })
      );
      res.set("Cache-Control", "no-store");
      res.json({ travelers: Object.fromEntries(statuses.map(({ id, ...s }) => [id, s])) });
    } catch (err) {
      logger.error({ err }, "Couldn't check saved travelers");
      res.status(500).json({ error: "Couldn't check your saved travelers. Please try again." });
    }
  });

  // The organizer saves someone on their trip, linked to their account if they have one
  app.post("/api/trips/:tripId/crew/:memberId/save", async (req, res) => {
    const user = await signedIn(req, res);
    if (!user) return;
    if (!UUID_RE.test(req.params.memberId)) return res.status(404).json({ error: "That person isn't on this trip" });
    const { data: trip } = await admin.from("trips").select("id, user_id").eq("id", req.params.tripId).maybeSingle();
    if (!trip || trip.user_id !== user.id) return res.status(403).json({ error: "Only the trip's organizer can save its travelers" });
    const { data: member } = await admin
      .from("trip_members")
      .select("id, user_id, name, email, status")
      .eq("id", req.params.memberId)
      .eq("trip_id", trip.id)
      .maybeSingle();
    if (!member || member.status !== "approved") return res.status(404).json({ error: "That person isn't on this trip" });
    const email = lower(member.email);
    if (!email) return res.status(400).json({ error: "This traveler has no email to save" });

    const relation = RELATIONS.includes(req.body?.relation) ? req.body.relation : "Friend";
    const account = member.user_id ? await accountOf(member.user_id) : null;
    const fields = { name: (account ? displayName(account) : member.name).slice(0, 100), email, linked_user_id: member.user_id || null };

    // Already saved with this email (added by hand): link it rather than add a duplicate
    const { data: existing } = await admin
      .from("saved_travelers")
      .select("id")
      .eq("owner_id", user.id)
      .eq("email", email)
      .maybeSingle();
    const write = existing
      ? admin.from("saved_travelers").update({ linked_user_id: fields.linked_user_id }).eq("id", existing.id).eq("owner_id", user.id)
      : admin.from("saved_travelers").insert({ ...fields, relation, owner_id: user.id });
    const { data, error } = await write.select("id, name, email, relation, linked_user_id").single();
    if (error) {
      logger.error({ err: error }, "Couldn't save traveler");
      return res.status(500).json({ error: "Couldn't save this traveler. Please try again." });
    }
    res.status(existing ? 200 : 201).json(data);
  });
}
