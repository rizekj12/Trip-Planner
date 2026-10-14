// Shared trip photo album: the organizer, members and guests on a trip all add photos and
// see everyone's. Each photo can be tagged to a day of the itinerary and given a caption.
//
// Who can do what
//   - See and add photos: the organizer and approved travelers (members signed in, guests by
//     their personal link while it's valid). Pending or removed travelers can't.
//   - Change a photo's caption or day: whoever added it.
//   - Delete a photo: whoever added it, or the organizer.
//
// Photos are resized in the browser, which uploads a thumbnail and the photo together (one
// raw body: the first X-Thumbnail-Length bytes are the thumbnail). The server checks both are
// JPEG or PNG by their bytes and strips metadata again (server/fileScrub.js), since phone
// photos carry the GPS location they were taken at. Files go to the private "trip-photos"
// bucket (supabase/trip-photos.sql); the browser gets short-lived signed links to them.
//
// Routes
//   Signed-in:  GET|POST /api/trips/:tripId/photos
//               PATCH|DELETE /api/trips/:tripId/photos/:id
//               DELETE /api/trips/:tripId/photos (organizer: empty the album before deleting the trip)
//   Guest:      the same under /api/guest/:guestToken/photos (except emptying the album)
import crypto from "node:crypto";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { displayName, guestLinkExpired } from "./crew.js";
import { sniffType, stripJpegMetadata, stripPngMetadata } from "./fileScrub.js";
import { logger } from "./logger.js";

export const PHOTO_BUCKET = "trip-photos";
export const MAX_PHOTOS_PER_TRIP = 500;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_THUMBNAIL_BYTES = 1024 * 1024;
export const MAX_CAPTION_LENGTH = 200;
// Signed links last an hour; the app reloads the album well before that (src/hooks/useTripPhotos.js)
export const SIGNED_URL_SECONDS = 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = "id, trip_id, uploaded_by, member_id, uploader_name, uploader_avatar_url, day, caption, path, thumb_path, type, size, created_at";

// { type, bytes } for a JPEG or PNG with its metadata removed, or { error }
export function cleanPhoto(bytes) {
  const type = sniffType(bytes);
  if (type !== "image/jpeg" && type !== "image/png") return { error: "Only photos (JPEG or PNG) can be added to the album." };
  try {
    return { type, bytes: type === "image/jpeg" ? stripJpegMetadata(bytes) : stripPngMetadata(bytes) };
  } catch {
    return { error: "That photo looks damaged. Please try another." };
  }
}

// Splits an upload into { thumbnail, photo } (both cleaned), or { error }
export function splitUpload(body, thumbnailLengthHeader) {
  const thumbLength = Number(thumbnailLengthHeader);
  if (!Number.isInteger(thumbLength) || thumbLength <= 0 || thumbLength >= body.length) {
    return { error: "Missing the photo's thumbnail." };
  }
  if (thumbLength > MAX_THUMBNAIL_BYTES) return { error: "The thumbnail is too large." };
  if (body.length - thumbLength > MAX_PHOTO_BYTES) return { error: "Photos can be up to 10 MB." };
  const thumbnail = cleanPhoto(body.subarray(0, thumbLength));
  const photo = cleanPhoto(body.subarray(thumbLength));
  if (thumbnail.error || photo.error) return { error: photo.error || thumbnail.error };
  return { thumbnail, photo };
}

// A day number for a trip of `dayCount` days: { day } (null = not tied to a day) or { error }
export function cleanDay(value, dayCount) {
  if (value === undefined || value === null || value === "") return { day: null };
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > dayCount) return { error: "That day isn't part of this trip" };
  return { day };
}

export function cleanCaption(value) {
  if (value === undefined || value === null) return { caption: null };
  if (typeof value !== "string") return { error: "Invalid caption" };
  const caption = value.trim();
  if (caption.length > MAX_CAPTION_LENGTH) return { error: `Captions can be up to ${MAX_CAPTION_LENGTH} characters` };
  return { caption: caption || null };
}

// Whether `viewer` added this photo: signed-in people by their account, guests by their link
const addedBy = (row, viewer) => (viewer.userId ? row.uploaded_by === viewer.userId : row.member_id === viewer.memberId);

// A stored row as the browser sees it: never its storage paths, only signed links
export const toPhoto = (row, viewer, links = {}) => ({
  id: row.id,
  day: row.day,
  caption: row.caption,
  uploader: { name: row.uploader_name, avatarUrl: row.uploader_avatar_url || null },
  mine: addedBy(row, viewer),
  canDelete: addedBy(row, viewer) || viewer.isOwner,
  createdAt: row.created_at,
  url: links[row.path] || null,
  thumbUrl: links[row.thumb_path] || null,
});

export function registerTripPhotoRoutes(app, { supabaseUrl, serviceKey }) {
  const admin = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  const ready = (res) => {
    if (admin) return true;
    res.status(500).json({ error: "The photo album isn't set up on the server (SUPABASE_SERVICE_ROLE_KEY missing)" });
    return false;
  };

  const loadTrip = async (tripId) => {
    const { data } = await admin.from("trips").select("id, user_id, itinerary_data").eq("id", tripId).maybeSingle();
    return data;
  };

  // Who is asking, as { trip, userId, memberId, isOwner, name, avatarUrl }, or sends an
  // error and returns null. The organizer and approved members, by their sign-in.
  async function signedInViewer(req, res) {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const { data } = token ? await admin.auth.getUser(token) : { data: null };
    const user = data?.user;
    if (!user) return res.status(401).json({ error: "Please sign in" }), null;

    const trip = await loadTrip(req.params.tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" }), null;
    const avatarUrl = user.user_metadata?.avatar_url || null;
    if (trip.user_id === user.id) {
      return { trip, userId: user.id, memberId: null, isOwner: true, name: displayName(user), avatarUrl };
    }
    const { data: member } = await admin
      .from("trip_members")
      .select("id, status, name, avatar_url")
      .eq("trip_id", trip.id)
      .eq("user_id", user.id)
      .maybeSingle();
    // Not on the trip looks the same as no trip, so trip ids can't be probed
    if (member?.status !== "approved") return res.status(404).json({ error: "Trip not found" }), null;
    return { trip, userId: user.id, memberId: member.id, isOwner: false, name: member.name, avatarUrl: avatarUrl || member.avatar_url };
  }

  // An approved guest, by their personal link
  async function guestViewer(req, res) {
    if (!UUID_RE.test(req.params.guestToken)) return res.status(404).json({ error: "This link is no longer valid" }), null;
    const { data: member } = await admin
      .from("trip_members")
      .select("id, trip_id, status, name, avatar_url")
      .eq("guest_token", req.params.guestToken)
      .maybeSingle();
    if (!member) return res.status(404).json({ error: "This link is no longer valid" }), null;
    if (member.status !== "approved") return res.status(403).json({ error: "Your request to join this trip is still waiting for approval" }), null;
    const trip = await loadTrip(member.trip_id);
    if (!trip) return res.status(404).json({ error: "This link is no longer valid" }), null;
    if (guestLinkExpired(trip)) return res.status(410).json({ error: "This trip ended a while ago, so its guest link has expired." }), null;
    return { trip, userId: null, memberId: member.id, isOwner: false, name: member.name, avatarUrl: member.avatar_url || null };
  }

  const dayCount = (trip) => trip.itinerary_data?.days?.length || 0;

  const failed = (res, err, message) => {
    logger.error({ err }, message);
    res.status(500).json({ error: `${message}. Please try again.` });
  };

  // Never throws: leftover files are logged, not shown to the user
  async function removeFiles(paths) {
    for (let i = 0; i < paths.length; i += 1000) {
      const { error } = await admin.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 1000));
      if (error) logger.error({ err: error, count: paths.length }, "Couldn't delete trip photo files");
    }
  }

  // Every photo on the trip, oldest first, with signed links
  async function album(viewer) {
    const { data, error } = await admin.from("trip_photos").select(COLUMNS).eq("trip_id", viewer.trip.id).order("created_at");
    if (error) throw error;
    const rows = data || [];
    const paths = rows.flatMap((r) => [r.path, r.thumb_path]);
    const links = {};
    if (paths.length) {
      const { data: signed, error: signError } = await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
      if (signError) throw signError;
      for (const s of signed || []) if (s.signedUrl) links[s.path] = s.signedUrl;
    }
    return { photos: rows.map((r) => toPhoto(r, viewer, links)), maxPhotos: MAX_PHOTOS_PER_TRIP };
  }

  async function photoOnTrip(viewer, id) {
    if (!UUID_RE.test(id || "")) return null;
    const { data } = await admin.from("trip_photos").select(COLUMNS).eq("id", id).eq("trip_id", viewer.trip.id).maybeSingle();
    return data;
  }

  // Upload body: thumbnail + photo, with a friendly 413 for anything over the limit
  const rawBody = (req, res, next) =>
    express.raw({ type: () => true, limit: MAX_PHOTO_BYTES + MAX_THUMBNAIL_BYTES })(req, res, (err) => {
      if (err?.type === "entity.too.large") return res.status(413).json({ error: "Photos can be up to 10 MB." });
      if (err) return res.status(400).json({ error: "Couldn't read the upload." });
      next();
    });

  // The same handlers for signed-in people and guests; `who` finds the viewer
  const handlers = (who) => ({
    // Checked before the upload is read, so nobody off the trip can send the server 10 MB bodies
    async viewer(req, res, next) {
      if (!ready(res)) return;
      const viewer = await who(req, res);
      if (!viewer) return;
      req.viewer = viewer;
      next();
    },

    async list(req, res) {
      try {
        res.set("Cache-Control", "no-store");
        res.json(await album(req.viewer));
      } catch (err) {
        failed(res, err, "Couldn't load the photos");
      }
    },

    async add(req, res) {
      const { viewer } = req;
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!body.length) return res.status(400).json({ error: "Choose a photo to add." });
      const { day, error: dayError } = cleanDay(req.get("X-Photo-Day"), dayCount(viewer.trip));
      if (dayError) return res.status(400).json({ error: dayError });
      const { thumbnail, photo, error } = splitUpload(body, req.get("X-Thumbnail-Length"));
      if (error) return res.status(415).json({ error });

      const { count } = await admin.from("trip_photos").select("id", { count: "exact", head: true }).eq("trip_id", viewer.trip.id);
      if ((count || 0) >= MAX_PHOTOS_PER_TRIP) {
        return res.status(409).json({ error: `This album is full (${MAX_PHOTOS_PER_TRIP} photos).` });
      }

      const id = crypto.randomUUID();
      const ext = photo.type === "image/png" ? "png" : "jpg";
      const path = `${viewer.trip.id}/${id}.${ext}`;
      const thumbPath = `${viewer.trip.id}/${id}-thumb.${thumbnail.type === "image/png" ? "png" : "jpg"}`;
      const bucket = admin.storage.from(PHOTO_BUCKET);
      const [full, thumb] = await Promise.all([
        bucket.upload(path, photo.bytes, { contentType: photo.type }),
        bucket.upload(thumbPath, thumbnail.bytes, { contentType: thumbnail.type }),
      ]);
      if (full.error || thumb.error) {
        await removeFiles([path, thumbPath]);
        return failed(res, full.error || thumb.error, "Couldn't upload the photo");
      }

      const { error: insertError } = await admin.from("trip_photos").insert({
        id,
        trip_id: viewer.trip.id,
        uploaded_by: viewer.userId,
        member_id: viewer.memberId,
        uploader_name: String(viewer.name || "Traveler").slice(0, 100),
        uploader_avatar_url: viewer.avatarUrl,
        day,
        path,
        thumb_path: thumbPath,
        type: photo.type,
        size: photo.bytes.length,
      });
      if (insertError) {
        await removeFiles([path, thumbPath]);
        return failed(res, insertError, "Couldn't save the photo");
      }
      res.status(201).json(await album(viewer));
    },

    async update(req, res) {
      const { viewer } = req;
      const row = await photoOnTrip(viewer, req.params.id);
      if (!row) return res.status(404).json({ error: "That photo no longer exists" });
      if (!addedBy(row, viewer)) return res.status(403).json({ error: "Only the person who added a photo can change it" });

      const changes = {};
      if (req.body?.caption !== undefined) {
        const { caption, error } = cleanCaption(req.body.caption);
        if (error) return res.status(400).json({ error });
        changes.caption = caption;
      }
      if (req.body?.day !== undefined) {
        const { day, error } = cleanDay(req.body.day, dayCount(viewer.trip));
        if (error) return res.status(400).json({ error });
        changes.day = day;
      }
      if (Object.keys(changes).length) {
        const { error } = await admin.from("trip_photos").update(changes).eq("id", row.id).eq("trip_id", viewer.trip.id);
        if (error) return failed(res, error, "Couldn't save the photo");
      }
      res.json(await album(viewer));
    },

    async remove(req, res) {
      const { viewer } = req;
      const row = await photoOnTrip(viewer, req.params.id);
      if (!row) return res.status(404).json({ error: "That photo no longer exists" });
      if (!addedBy(row, viewer) && !viewer.isOwner) {
        return res.status(403).json({ error: "Only the person who added a photo, or the organizer, can delete it" });
      }
      const { error } = await admin.from("trip_photos").delete().eq("id", row.id).eq("trip_id", viewer.trip.id);
      if (error) return failed(res, error, "Couldn't delete the photo");
      await removeFiles([row.path, row.thumb_path]);
      res.json(await album(viewer));
    },
  });

  const member = handlers(signedInViewer);
  app.get("/api/trips/:tripId/photos", member.viewer, member.list);
  app.post("/api/trips/:tripId/photos", member.viewer, rawBody, member.add);
  app.patch("/api/trips/:tripId/photos/:id", member.viewer, member.update);
  app.delete("/api/trips/:tripId/photos/:id", member.viewer, member.remove);

  // The organizer empties the album (rows and files) before deleting the trip, since
  // deleting the trip's row can't remove files from storage
  app.delete("/api/trips/:tripId/photos", member.viewer, async (req, res) => {
    const { viewer } = req;
    if (!viewer.isOwner) return res.status(403).json({ error: "Only the trip's organizer can empty the album" });
    const { data, error } = await admin.from("trip_photos").select("id, path, thumb_path").eq("trip_id", viewer.trip.id);
    // No album table yet (supabase/trip-photos.sql not run): nothing to empty, so trips can still be deleted
    if (error && ["42P01", "PGRST205"].includes(error.code)) return res.json({ ok: true });
    if (error) return failed(res, error, "Couldn't delete the trip's photos");
    if (data?.length) {
      await removeFiles(data.flatMap((r) => [r.path, r.thumb_path]));
      const { error: deleteError } = await admin.from("trip_photos").delete().eq("trip_id", viewer.trip.id);
      if (deleteError) return failed(res, deleteError, "Couldn't delete the trip's photos");
    }
    res.json({ ok: true });
  });

  const guest = handlers(guestViewer);
  app.get("/api/guest/:guestToken/photos", guest.viewer, guest.list);
  app.post("/api/guest/:guestToken/photos", guest.viewer, rawBody, guest.add);
  app.patch("/api/guest/:guestToken/photos/:id", guest.viewer, guest.update);
  app.delete("/api/guest/:guestToken/photos/:id", guest.viewer, guest.remove);
}
