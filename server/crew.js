// Travel Crew: invite links, joining a trip (with an account or as a guest), the crew list,
// and the guest's view-only trip. Uses the service role key, so every route checks who is
// asking before touching anything. Tables: supabase/travel-crew.sql.
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Itinerary data without the owner's private details (reservations, confirmation codes),
// for anyone who isn't the trip's owner
export function withoutPrivateDetails(itineraryData = {}) {
  const { _form_data: form = {}, _pdf_downloaded_at, ...rest } = itineraryData;
  const { reservations, ...publicForm } = form;
  return {
    ...rest,
    _form_data: {
      ...publicForm,
      cities: (publicForm.cities || []).map((c) => ({
        ...c,
        hotel: c.hotel ? { name: c.hotel.name, address: c.hotel.address } : c.hotel,
      })),
    },
  };
}

const displayName = (user) =>
  (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Traveler").trim();

export function registerCrewRoutes(app, { supabaseUrl, serviceKey }) {
  const admin = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  // Every crew route needs the admin client; say so clearly if it isn't configured
  const ready = (res) => {
    if (admin) return true;
    res.status(500).json({ error: "Travel Crew isn't set up on the server (SUPABASE_SERVICE_ROLE_KEY missing)" });
    return false;
  };

  // The signed-in user behind the request's Bearer token, or null
  const requestUser = async (req) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) return null;
    const { data } = await admin.auth.getUser(token);
    return data?.user || null;
  };

  const loadTrip = async (tripId) => {
    const { data } = await admin
      .from("trips")
      .select("id, user_id, destination, cities, itinerary_data")
      .eq("id", tripId)
      .maybeSingle();
    return data;
  };

  const membershipOf = async (tripId, userId) => {
    const { data } = await admin
      .from("trip_members")
      .select("id, role")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  };

  // Everyone on a trip, the owner first. `viewer` decides what's included: emails only for
  // the owner, and which row is "you" (a signed-in user id, or a guest's own member row id).
  const crewFor = async (trip, { viewerUserId = null, viewerMemberId = null, showEmails = false } = {}) => {
    const { data: rows = [] } = await admin
      .from("trip_members")
      .select("id, user_id, role, name, email, avatar_url, joined_at")
      .eq("trip_id", trip.id)
      .order("joined_at");

    // Current name and photo for people with accounts (they may have changed since joining)
    const accounts = new Map();
    await Promise.all(
      [trip.user_id, ...rows.map((r) => r.user_id)].filter(Boolean).map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user) accounts.set(id, data.user);
      })
    );

    const owner = accounts.get(trip.user_id);
    return [
      {
        id: "owner",
        role: "owner",
        name: displayName(owner),
        avatarUrl: owner?.user_metadata?.avatar_url || null,
        email: showEmails ? owner?.email : undefined,
        isYou: !!viewerUserId && trip.user_id === viewerUserId,
      },
      ...rows.map((r) => {
        const account = r.user_id && accounts.get(r.user_id);
        return {
          id: r.id,
          role: r.role,
          name: account ? displayName(account) : r.name,
          avatarUrl: account?.user_metadata?.avatar_url || r.avatar_url || null,
          email: showEmails ? r.email : undefined,
          isYou: (!!viewerUserId && r.user_id === viewerUserId) || r.id === viewerMemberId,
        };
      }),
    ];
  };

  const tripDates = (trip) => {
    const cities = trip.itinerary_data?._form_data?.cities || [];
    const ins = cities.map((c) => c.checkIn).filter(Boolean).sort();
    const outs = cities.map((c) => c.checkOut).filter(Boolean).sort();
    return { start: ins[0] || null, end: outs[outs.length - 1] || null };
  };

  // Who's on the trip: the owner first, then members and guests. Emails only go to the owner.
  app.get("/api/trips/:tripId/crew", async (req, res) => {
    if (!ready(res)) return;
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });

    const trip = await loadTrip(req.params.tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    const isOwner = trip.user_id === user.id;
    const mine = isOwner ? null : await membershipOf(trip.id, user.id);
    if (!isOwner && !mine) return res.status(403).json({ error: "You're not on this trip" });

    const people = await crewFor(trip, { viewerUserId: user.id, showEmails: isOwner });
    res.json({ isOwner, people });
  });

  // The trip's invite link token (owner only). { reset: true } replaces it, so old links stop working.
  app.post("/api/trips/:tripId/invite", async (req, res) => {
    if (!ready(res)) return;
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const trip = await loadTrip(req.params.tripId);
    if (!trip || trip.user_id !== user.id) return res.status(403).json({ error: "Only the trip's owner can invite people" });

    if (!req.body?.reset) {
      const { data: existing } = await admin.from("trip_invites").select("token").eq("trip_id", trip.id).maybeSingle();
      if (existing) return res.json({ token: existing.token });
    }
    const token = crypto.randomUUID();
    const { error } = await admin
      .from("trip_invites")
      .upsert({ trip_id: trip.id, token, created_at: new Date().toISOString() }, { onConflict: "trip_id" });
    if (error) {
      console.error("Invite link failed:", error);
      return res.status(500).json({ error: "Couldn't create the invite link" });
    }
    res.json({ token });
  });

  const tripForInvite = async (token) => {
    if (!UUID_RE.test(token || "")) return null;
    const { data: invite } = await admin.from("trip_invites").select("trip_id").eq("token", token).maybeSingle();
    return invite ? loadTrip(invite.trip_id) : null;
  };

  // What the invite page shows before someone joins (no sign-in needed)
  app.get("/api/invites/:token", async (req, res) => {
    if (!ready(res)) return;
    const trip = await tripForInvite(req.params.token);
    if (!trip) return res.status(404).json({ error: "This invite link is no longer valid" });
    const { data } = await admin.auth.admin.getUserById(trip.user_id);
    const { count } = await admin.from("trip_members").select("id", { count: "exact", head: true }).eq("trip_id", trip.id);
    res.json({
      tripId: trip.id,
      destination: trip.destination,
      cities: trip.cities || [],
      ...tripDates(trip),
      ownerName: displayName(data?.user),
      ownerAvatarUrl: data?.user?.user_metadata?.avatar_url || null,
      travelers: (count || 0) + 1,
    });
  });

  // Join via an invite: signed in -> becomes a member; otherwise { name, email } -> a guest
  app.post("/api/invites/:token/join", async (req, res) => {
    if (!ready(res)) return;
    const trip = await tripForInvite(req.params.token);
    if (!trip) return res.status(404).json({ error: "This invite link is no longer valid" });
    const user = await requestUser(req);

    if (user) {
      if (trip.user_id === user.id) return res.json({ tripId: trip.id });
      const { error } = await admin.from("trip_members").upsert(
        {
          trip_id: trip.id,
          user_id: user.id,
          role: "member",
          name: displayName(user),
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || null,
        },
        { onConflict: "trip_id,user_id", ignoreDuplicates: true }
      );
      if (error) {
        console.error("Join failed:", error);
        return res.status(500).json({ error: "Couldn't join the trip" });
      }
      return res.json({ tripId: trip.id });
    }

    const name = String(req.body?.name || "").trim().slice(0, 80);
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 200);
    if (!name || !EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter your name and a valid email" });

    // Same guest email on the same trip: hand back their existing link
    const { data: existing } = await admin
      .from("trip_members")
      .select("guest_token")
      .eq("trip_id", trip.id)
      .eq("role", "guest")
      .eq("email", email)
      .maybeSingle();
    if (existing) return res.json({ guestToken: existing.guest_token });

    const guestToken = crypto.randomUUID();
    const { error } = await admin
      .from("trip_members")
      .insert({ trip_id: trip.id, role: "guest", name, email, guest_token: guestToken });
    if (error) {
      console.error("Guest join failed:", error);
      return res.status(500).json({ error: "Couldn't add you to the trip" });
    }
    res.json({ guestToken });
  });

  // A guest's view-only trip, by their personal link
  app.get("/api/guest/:guestToken", async (req, res) => {
    if (!ready(res)) return;
    if (!UUID_RE.test(req.params.guestToken)) return res.status(404).json({ error: "This link is no longer valid" });
    const { data: guest } = await admin
      .from("trip_members")
      .select("id, name, trip_id")
      .eq("guest_token", req.params.guestToken)
      .maybeSingle();
    const trip = guest && (await loadTrip(guest.trip_id));
    if (!trip) return res.status(404).json({ error: "This link is no longer valid" });
    res.json({
      guestName: guest.name,
      trip: { id: trip.id, destination: trip.destination, itinerary_data: withoutPrivateDetails(trip.itinerary_data) },
      // Guests can see who's going (names, photos, roles; never emails)
      crew: { isOwner: false, people: await crewFor(trip, { viewerMemberId: guest.id }) },
    });
  });

  // Remove someone: the owner can remove anyone; a member can remove themselves (leave)
  app.delete("/api/trips/:tripId/crew/:memberId", async (req, res) => {
    if (!ready(res)) return;
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const trip = await loadTrip(req.params.tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const { data: member } = await admin
      .from("trip_members")
      .select("id, user_id")
      .eq("id", req.params.memberId)
      .eq("trip_id", trip.id)
      .maybeSingle();
    if (!member) return res.status(404).json({ error: "That person isn't on this trip" });
    if (trip.user_id !== user.id && member.user_id !== user.id) {
      return res.status(403).json({ error: "Only the trip's owner can remove people" });
    }
    await admin.from("trip_members").delete().eq("id", member.id);
    res.json({ ok: true });
  });
}
