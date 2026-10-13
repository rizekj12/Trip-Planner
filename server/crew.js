// Travel Crew: invite links, joining a trip (with an account or as a guest), the crew list,
// and the guest's view-only trip. Uses the service role key, so every route checks who is
// asking before touching anything. Tables: supabase/travel-crew.sql.
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Trip size and link lifetimes (issue #28)
export const MAX_TRAVELERS = 10; // people on a trip besides its organizer (members + guests)
const INVITE_LINK_DAYS = 30; // invite links last this long, or until the trip ends if sooner
const GUEST_LINK_DAYS_AFTER_TRIP = 30; // guest links stop working this long after the trip
const JOINS_PER_TRIP_PER_HOUR = 10; // flood guard for a leaked invite link
const MAX_PENDING_REQUESTS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
// A member's emergency contact (if they chose to share it) shows to the organizer from this
// many days before the trip until it ends
const EMERGENCY_SHARE_DAYS_BEFORE = 2;
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

export function registerCrewRoutes(app, { supabaseUrl, serviceKey, notifier }) {
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
      .select("id, role, status")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  };

  const countMembers = async (tripId, { status, since } = {}) => {
    let query = admin.from("trip_members").select("id", { count: "exact", head: true }).eq("trip_id", tripId);
    if (status) query = query.eq("status", status);
    if (since) query = query.gte("joined_at", since);
    const { count } = await query;
    return count || 0;
  };

  const tripDates = (trip) => {
    const cities = trip.itinerary_data?._form_data?.cities || [];
    const ins = cities.map((c) => c.checkIn).filter(Boolean).sort();
    const outs = cities.map((c) => c.checkOut).filter(Boolean).sort();
    return { start: ins[0] || null, end: outs[outs.length - 1] || null };
  };

  // End of the trip's last day (UTC), or null if it has no dates
  const tripEndsAt = (trip) => {
    const { end } = tripDates(trip);
    return end ? Date.parse(`${end}T23:59:59Z`) : null;
  };

  // A new invite link lasts INVITE_LINK_DAYS, or until the trip ends if that's sooner
  const inviteExpiry = (trip) => {
    const limit = Date.now() + INVITE_LINK_DAYS * DAY_MS;
    const ends = tripEndsAt(trip);
    return new Date(ends && ends > Date.now() ? Math.min(limit, ends) : limit).toISOString();
  };

  const ownerOf = async (trip) => (await admin.auth.admin.getUserById(trip.user_id)).data?.user || null;

  // Profile details (supabase/profiles.sql) for people with accounts, by user id. Empty if the
  // table isn't set up yet.
  const profilesFor = async (userIds) => {
    if (!userIds.length) return new Map();
    const { data, error } = await admin
      .from("profiles")
      .select("id, bio, share_emergency, emergency_name, emergency_relationship, emergency_phone, emergency_email")
      .in("id", userIds);
    if (error) return new Map();
    return new Map(data.map((p) => [p.id, p]));
  };

  // Whether today is within the window where shared emergency contacts are visible
  const emergencyWindowOpen = (trip) => {
    const { start } = tripDates(trip);
    const ends = tripEndsAt(trip);
    if (!start || !ends) return false;
    const opens = Date.parse(`${start}T00:00:00Z`) - EMERGENCY_SHARE_DAYS_BEFORE * DAY_MS;
    return Date.now() >= opens && Date.now() <= ends;
  };

  // Everyone on a trip, the owner first. `viewer` decides what's included: emails, pending
  // requests and shared emergency contacts only for the owner, and which row is "you" (a
  // signed-in user id, or a guest's own member row id).
  const crewFor = async (
    trip,
    { viewerUserId = null, viewerMemberId = null, showEmails = false, includePending = false } = {}
  ) => {
    let query = admin
      .from("trip_members")
      .select("id, user_id, role, status, name, email, avatar_url, joined_at")
      .eq("trip_id", trip.id)
      .order("joined_at");
    if (!includePending) query = query.eq("status", "approved");
    const { data: rows = [] } = await query;

    // Current name and photo for people with accounts (they may have changed since joining)
    const accounts = new Map();
    await Promise.all(
      [trip.user_id, ...rows.map((r) => r.user_id)].filter(Boolean).map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user) accounts.set(id, data.user);
      })
    );
    const profiles = await profilesFor([trip.user_id, ...rows.map((r) => r.user_id)].filter(Boolean));
    const showEmergency = showEmails && emergencyWindowOpen(trip);
    // Only for members who turned sharing on and gave a phone number
    const emergencyOf = (profile) =>
      showEmergency && profile?.share_emergency && profile.emergency_phone
        ? {
            name: profile.emergency_name,
            relationship: profile.emergency_relationship,
            phone: profile.emergency_phone,
            email: profile.emergency_email,
          }
        : undefined;

    const owner = accounts.get(trip.user_id);
    return [
      {
        id: "owner",
        role: "owner",
        status: "approved",
        name: displayName(owner),
        avatarUrl: owner?.user_metadata?.avatar_url || null,
        bio: profiles.get(trip.user_id)?.bio || null,
        email: showEmails ? owner?.email : undefined,
        isYou: !!viewerUserId && trip.user_id === viewerUserId,
      },
      ...rows.map((r) => {
        const account = r.user_id && accounts.get(r.user_id);
        const profile = r.user_id && profiles.get(r.user_id);
        return {
          id: r.id,
          role: r.role,
          status: r.status,
          name: account ? displayName(account) : r.name,
          avatarUrl: account?.user_metadata?.avatar_url || r.avatar_url || null,
          bio: profile?.bio || null,
          email: showEmails ? r.email : undefined,
          emergency: r.status === "approved" ? emergencyOf(profile) : undefined,
          isYou: (!!viewerUserId && r.user_id === viewerUserId) || r.id === viewerMemberId,
        };
      }),
    ];
  };

  // Who's on the trip: the owner first, then members and guests. Emails and pending requests
  // only go to the owner.
  app.get("/api/trips/:tripId/crew", async (req, res) => {
    if (!ready(res)) return;
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });

    const trip = await loadTrip(req.params.tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    const isOwner = trip.user_id === user.id;
    const mine = isOwner ? null : await membershipOf(trip.id, user.id);
    if (!isOwner && mine?.status !== "approved") return res.status(403).json({ error: "You're not on this trip" });

    const people = await crewFor(trip, { viewerUserId: user.id, showEmails: isOwner, includePending: isOwner });
    res.json({ isOwner, people, maxTravelers: MAX_TRAVELERS });
  });

  // The trip's invite link and settings (owner only). Gets the link, creating one if needed.
  // { reset: true } replaces it so old links stop working; an expired link is replaced
  // automatically. { requireApproval: true|false } changes the "approve new travelers" setting.
  app.post("/api/trips/:tripId/invite", async (req, res) => {
    if (!ready(res)) return;
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" });
    const trip = await loadTrip(req.params.tripId);
    if (!trip || trip.user_id !== user.id) return res.status(403).json({ error: "Only the trip's owner can invite people" });

    const { data: existing } = await admin
      .from("trip_invites")
      .select("token, expires_at, require_approval")
      .eq("trip_id", trip.id)
      .maybeSingle();

    const changes = {};
    if (typeof req.body?.requireApproval === "boolean") changes.require_approval = req.body.requireApproval;
    const expired = existing?.expires_at && Date.parse(existing.expires_at) < Date.now();
    if (!existing || req.body?.reset || expired) {
      changes.token = crypto.randomUUID();
      changes.created_at = new Date().toISOString();
      changes.expires_at = inviteExpiry(trip);
    } else if (!existing.expires_at) {
      // A link from before expiry existed: give it one now
      changes.expires_at = inviteExpiry(trip);
    }

    let invite = existing;
    if (Object.keys(changes).length) {
      const { data, error } = existing
        ? await admin.from("trip_invites").update(changes).eq("trip_id", trip.id).select().single()
        : await admin.from("trip_invites").insert({ trip_id: trip.id, ...changes }).select().single();
      if (error) {
        console.error("Invite link failed:", error);
        return res.status(500).json({ error: "Couldn't create the invite link" });
      }
      invite = data;
    }

    res.json({
      token: invite.token,
      expiresAt: invite.expires_at,
      requireApproval: invite.require_approval,
      travelers: await countMembers(trip.id, { status: "approved" }),
      maxTravelers: MAX_TRAVELERS,
    });
  });

  // The trip and invite behind a token: { trip, invite }, { expired: true }, or null
  const inviteFor = async (token) => {
    if (!UUID_RE.test(token || "")) return null;
    const { data: invite } = await admin
      .from("trip_invites")
      .select("trip_id, expires_at, require_approval")
      .eq("token", token)
      .maybeSingle();
    if (!invite) return null;
    if (invite.expires_at && Date.parse(invite.expires_at) < Date.now()) return { expired: true };
    const trip = await loadTrip(invite.trip_id);
    return trip ? { trip, invite } : null;
  };

  const inviteProblem = (res, found) => {
    if (!found) return res.status(404).json({ error: "This invite link is no longer valid" }), true;
    if (found.expired) {
      return res.status(410).json({ error: "This invite link has expired. Ask the organizer for a new one." }), true;
    }
    return false;
  };

  // What the invite page shows before someone joins (no sign-in needed)
  app.get("/api/invites/:token", async (req, res) => {
    if (!ready(res)) return;
    const found = await inviteFor(req.params.token);
    if (inviteProblem(res, found)) return;
    const { trip, invite } = found;
    const owner = await ownerOf(trip);
    const travelers = await countMembers(trip.id, { status: "approved" });
    res.json({
      tripId: trip.id,
      destination: trip.destination,
      cities: trip.cities || [],
      ...tripDates(trip),
      ownerName: displayName(owner),
      ownerAvatarUrl: owner?.user_metadata?.avatar_url || null,
      travelers: travelers + 1,
      full: travelers >= MAX_TRAVELERS,
      requireApproval: invite.require_approval,
    });
  });

  // Join via an invite: signed in -> a member; otherwise { name, email } -> a guest. With
  // "approve new travelers" on, they start as "pending" and the owner gets a notification.
  app.post("/api/invites/:token/join", async (req, res) => {
    if (!ready(res)) return;
    const found = await inviteFor(req.params.token);
    if (inviteProblem(res, found)) return;
    const { trip, invite } = found;
    const user = await requestUser(req);
    // A login the browser still has but Supabase no longer accepts (signed out elsewhere,
    // switched accounts): say so, rather than treating them as a guest with no name or email
    if (!user && req.headers.authorization) {
      return res.status(401).json({ error: "Your sign-in has expired. Please sign in again." });
    }

    if (user?.id === trip.user_id) return res.json({ tripId: trip.id, status: "approved" });

    // Already on the trip (or already asked): hand back where they stand
    const guestEmail = user ? null : String(req.body?.email || "").trim().toLowerCase().slice(0, 200);
    const { data: existing } = user
      ? await admin.from("trip_members").select("status").eq("trip_id", trip.id).eq("user_id", user.id).maybeSingle()
      : await admin
          .from("trip_members")
          .select("status, guest_token")
          .eq("trip_id", trip.id)
          .eq("role", "guest")
          .eq("email", guestEmail)
          .maybeSingle();
    if (existing) {
      return res.json(user ? { tripId: trip.id, status: existing.status } : { guestToken: existing.guest_token, status: existing.status });
    }

    const name = user ? displayName(user) : String(req.body?.name || "").trim().slice(0, 80);
    if (!user && (!name || !EMAIL_RE.test(guestEmail))) {
      return res.status(400).json({ error: "Please enter your name and a valid email" });
    }

    // Limits: trip size, open requests, and a flood guard for leaked links
    if ((await countMembers(trip.id, { status: "approved" })) >= MAX_TRAVELERS) {
      return res.status(409).json({ error: `This trip is full (${MAX_TRAVELERS} travelers plus the organizer).` });
    }
    if ((await countMembers(trip.id, { status: "pending" })) >= MAX_PENDING_REQUESTS) {
      return res.status(429).json({ error: "This trip has too many requests waiting. Please try again later." });
    }
    if ((await countMembers(trip.id, { since: new Date(Date.now() - 60 * 60 * 1000).toISOString() })) >= JOINS_PER_TRIP_PER_HOUR) {
      return res.status(429).json({ error: "This trip is getting a lot of join requests right now. Please try again later." });
    }

    const status = invite.require_approval ? "pending" : "approved";
    const guestToken = user ? null : crypto.randomUUID();
    const { data: member, error } = await admin
      .from("trip_members")
      .insert(
        user
          ? {
              trip_id: trip.id,
              user_id: user.id,
              role: "member",
              status,
              name,
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url || null,
            }
          : { trip_id: trip.id, role: "guest", status, name, email: guestEmail, guest_token: guestToken }
      )
      .select("id")
      .single();
    if (error) {
      console.error("Join failed:", error);
      return res.status(500).json({ error: "Couldn't join the trip" });
    }

    await notifier?.notify(trip.user_id, status === "pending" ? "join_request" : "member_joined", {
      tripId: trip.id,
      data: { member_id: member.id, name, role: user ? "member" : "guest", destination: trip.destination },
    });
    res.json(user ? { tripId: trip.id, status } : { guestToken, status });
  });

  // A guest's view-only trip, by their personal link. While their request waits for
  // approval it only says so; it expires GUEST_LINK_DAYS_AFTER_TRIP days after the trip ends.
  app.get("/api/guest/:guestToken", async (req, res) => {
    if (!ready(res)) return;
    if (!UUID_RE.test(req.params.guestToken)) return res.status(404).json({ error: "This link is no longer valid" });
    const { data: guest } = await admin
      .from("trip_members")
      .select("id, name, status, trip_id")
      .eq("guest_token", req.params.guestToken)
      .maybeSingle();
    const trip = guest && (await loadTrip(guest.trip_id));
    if (!trip) return res.status(404).json({ error: "This link is no longer valid" });

    const ends = tripEndsAt(trip);
    if (ends && Date.now() > ends + GUEST_LINK_DAYS_AFTER_TRIP * DAY_MS) {
      return res.status(410).json({ error: "This trip ended a while ago, so its guest link has expired." });
    }
    if (guest.status !== "approved") {
      const owner = await ownerOf(trip);
      return res.json({ status: "pending", guestName: guest.name, destination: trip.destination, ownerName: displayName(owner) });
    }

    res.json({
      status: "approved",
      guestName: guest.name,
      trip: { id: trip.id, destination: trip.destination, itinerary_data: withoutPrivateDetails(trip.itinerary_data) },
      // Guests can see who's going (names, photos, roles; never emails)
      crew: { isOwner: false, people: await crewFor(trip, { viewerMemberId: guest.id }) },
    });
  });

  // A pending request on one of the signed-in user's own trips: { trip, member }, or sends an error
  const ownersPendingRequest = async (req, res) => {
    const user = await requestUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in" }), null;
    const trip = await loadTrip(req.params.tripId);
    if (!trip || trip.user_id !== user.id) {
      return res.status(403).json({ error: "Only the trip's owner can approve travelers" }), null;
    }
    const { data: member } = await admin
      .from("trip_members")
      .select("id, user_id, status, name")
      .eq("id", req.params.memberId)
      .eq("trip_id", trip.id)
      .maybeSingle();
    if (!member || member.status !== "pending") {
      return res.status(404).json({ error: "That request isn't waiting anymore" }), null;
    }
    return { trip, member, owner: user };
  };

  // Approve a pending request (owner only)
  app.post("/api/trips/:tripId/crew/:memberId/approve", async (req, res) => {
    if (!ready(res)) return;
    const found = await ownersPendingRequest(req, res);
    if (!found) return;
    const { trip, member, owner } = found;

    if ((await countMembers(trip.id, { status: "approved" })) >= MAX_TRAVELERS) {
      return res.status(409).json({ error: `This trip is full (${MAX_TRAVELERS} travelers plus you).` });
    }
    const { error } = await admin.from("trip_members").update({ status: "approved" }).eq("id", member.id);
    if (error) {
      console.error("Approve failed:", error);
      return res.status(500).json({ error: "Couldn't approve the request" });
    }
    await notifier?.resolveJoinRequest(member.id, "approved");
    await notifier?.notify(member.user_id, "join_approved", {
      tripId: trip.id,
      data: { destination: trip.destination, owner_name: displayName(owner) },
    });
    res.json({ ok: true });
  });

  // Decline a pending request (owner only); they can ask again with a valid link
  app.post("/api/trips/:tripId/crew/:memberId/deny", async (req, res) => {
    if (!ready(res)) return;
    const found = await ownersPendingRequest(req, res);
    if (!found) return;
    await admin.from("trip_members").delete().eq("id", found.member.id);
    await notifier?.resolveJoinRequest(found.member.id, "declined");
    res.json({ ok: true });
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
      .select("id, user_id, status")
      .eq("id", req.params.memberId)
      .eq("trip_id", trip.id)
      .maybeSingle();
    if (!member) return res.status(404).json({ error: "That person isn't on this trip" });
    if (trip.user_id !== user.id && member.user_id !== user.id) {
      return res.status(403).json({ error: "Only the trip's owner can remove people" });
    }
    await admin.from("trip_members").delete().eq("id", member.id);
    if (member.status === "pending") await notifier?.resolveJoinRequest(member.id, "declined");
    res.json({ ok: true });
  });
}
