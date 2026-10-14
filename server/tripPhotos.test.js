// Shared trip photo album: who can see, add, change and delete photos, and that photo
// metadata (GPS location) never reaches storage
import { describe, test, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db } from "./test/fakeSupabase.js";
import { OWNER, MEMBER, USERS, TOKENS, TRIP_ID, GUEST_TOKEN, PENDING_GUEST_TOKEN, auth, readyTrip, members } from "./test/fixtures.js";

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
const { registerTripPhotoRoutes, splitUpload, cleanDay, PHOTO_BUCKET, MAX_PHOTOS_PER_TRIP } = await import("./tripPhotos.js");
const { JPEG_WITH_GPS, PNG_WITH_TEXT, PDF } = await import("./test/sampleFiles.js");

const app = express();
app.use(express.json());
registerTripPhotoRoutes(app, { supabaseUrl: "http://fake", serviceKey: "service" });

// A three-day trip
const trip = () => readyTrip({ days: [1, 2, 3].map((n) => ({ key: `d${n}`, title: `Day ${n}`, markers: [] })) });
const photosPath = `/api/trips/${TRIP_ID}/photos`;
const guestPath = `/api/guest/${GUEST_TOKEN}/photos`;

// thumbnail + photo in one body, as the browser sends them
const upload = (path, { token, day, thumb = JPEG_WITH_GPS, photo = JPEG_WITH_GPS } = {}) => {
  let req = request(app)
    .post(path)
    .set("Content-Type", "application/octet-stream")
    .set("X-Thumbnail-Length", String(thumb.length));
  if (token) req = req.set(auth(token));
  if (day !== undefined) req = req.set("X-Photo-Day", String(day));
  return req.send(Buffer.concat([thumb, photo]));
};

const rows = () => db.rows("trip_photos");

beforeEach(() => {
  db.reset({ trips: [trip()], trip_members: members(), trip_photos: [] }, { users: USERS, tokens: TOKENS });
});

describe("who can see the album", () => {
  test("the organizer, approved members and approved guests", async () => {
    expect((await request(app).get(photosPath).set(auth("token-owner"))).status).toBe(200);
    expect((await request(app).get(photosPath).set(auth("token-member"))).status).toBe(200);
    expect((await request(app).get(guestPath)).status).toBe(200);
  });

  test("not strangers, pending travelers or anyone signed out", async () => {
    expect((await request(app).get(photosPath)).status).toBe(401);
    expect((await request(app).get(photosPath).set(auth("token-stranger"))).status).toBe(404);
    expect((await request(app).get(photosPath).set(auth("token-pending"))).status).toBe(404);
    expect((await request(app).get(`/api/guest/${PENDING_GUEST_TOKEN}/photos`)).status).toBe(403);
    expect((await request(app).get("/api/guest/not-a-token/photos")).status).toBe(404);
  });

  test("strangers can't upload either (checked before the body is read)", async () => {
    expect((await upload(photosPath, { token: "token-stranger" })).status).toBe(404);
    expect((await upload(`/api/guest/${PENDING_GUEST_TOKEN}/photos`)).status).toBe(403);
    expect(rows()).toHaveLength(0);
  });
});

describe("adding photos", () => {
  test("everyone sees everyone's photos, with signed links and no storage paths", async () => {
    await upload(photosPath, { token: "token-owner", day: 2 });
    await upload(photosPath, { token: "token-member" });
    const res = await upload(guestPath);
    expect(res.status).toBe(201);

    const { photos } = (await request(app).get(photosPath).set(auth("token-member"))).body;
    expect(photos.map((p) => p.uploader.name)).toEqual(["Olivia Owner", "Max Member", "Gail Guest"]);
    expect(photos[0].day).toBe(2);
    expect(photos[1].day).toBeNull();
    expect(photos.map((p) => p.mine)).toEqual([false, true, false]);
    expect(photos[0].url).toMatch(/^https:\/\/fake\.storage\/trip-photos\//);
    expect(photos[0].thumbUrl).toMatch(/-thumb\.jpg/);
    expect(photos[0].path).toBeUndefined();
  });

  test("strips GPS and comments from the photo and the thumbnail", async () => {
    await upload(photosPath, { token: "token-owner" });
    const stored = Object.values(db.files(PHOTO_BUCKET));
    expect(stored).toHaveLength(2);
    for (const file of stored) {
      expect(file.body.toString("latin1")).not.toContain("GPS-LAT");
      expect(file.body.toString("latin1")).not.toContain("Taken at home");
      expect(file.body.toString("latin1")).toContain("IMAGE-DATA-BYTES");
    }
  });

  test("PNGs are cleaned too", async () => {
    expect((await upload(photosPath, { token: "token-owner", photo: PNG_WITH_TEXT })).status).toBe(201);
    const png = Object.entries(db.files(PHOTO_BUCKET)).find(([path]) => path.endsWith(".png"));
    expect(png[1].body.toString("latin1")).not.toContain("Passport of Alex");
  });

  test("only photos, with a thumbnail, on a day of the trip", async () => {
    expect((await upload(photosPath, { token: "token-owner", photo: PDF })).status).toBe(415);
    expect((await upload(photosPath, { token: "token-owner", day: 4 })).status).toBe(400);
    expect((await upload(photosPath, { token: "token-owner", day: "first" })).status).toBe(400);
    const noThumb = await request(app).post(photosPath).set(auth("token-owner")).set("Content-Type", "application/octet-stream").send(JPEG_WITH_GPS);
    expect(noThumb.status).toBe(415);
    expect(rows()).toHaveLength(0);
    expect(db.files(PHOTO_BUCKET)).toEqual({});
  });

  test(`at most ${MAX_PHOTOS_PER_TRIP} per trip`, async () => {
    const full = Array.from({ length: MAX_PHOTOS_PER_TRIP }, () => ({ id: crypto.randomUUID(), trip_id: TRIP_ID, uploader_name: "x" }));
    db.reset({ trips: [trip()], trip_members: members(), trip_photos: full }, { users: USERS, tokens: TOKENS });
    expect((await upload(photosPath, { token: "token-owner" })).status).toBe(409);
  });
});

describe("changing and deleting", () => {
  const photoBy = async (opts) => {
    await upload(opts.token ? photosPath : guestPath, opts);
    return rows()[rows().length - 1];
  };

  test("only the person who added a photo can change its caption or day", async () => {
    const photo = await photoBy({ token: "token-member" });
    const path = `${photosPath}/${photo.id}`;

    const res = await request(app).patch(path).set(auth("token-member")).send({ caption: "  Sunset at the shrine ", day: 3 });
    expect(res.status).toBe(200);
    expect(rows()[0]).toMatchObject({ caption: "Sunset at the shrine", day: 3 });

    expect((await request(app).patch(path).set(auth("token-owner")).send({ caption: "Mine now" })).status).toBe(403);
    expect((await request(app).patch(`${guestPath}/${photo.id}`).send({ caption: "Mine now" })).status).toBe(403);
    expect((await request(app).patch(path).set(auth("token-member")).send({ day: 9 })).status).toBe(400);
    expect((await request(app).patch(path).set(auth("token-member")).send({ caption: "x".repeat(201) })).status).toBe(400);
    expect(rows()[0].caption).toBe("Sunset at the shrine");
  });

  test("guests manage their own photos by their link", async () => {
    const photo = await photoBy({});
    expect((await request(app).patch(`${guestPath}/${photo.id}`).send({ caption: "Hi" })).status).toBe(200);
    expect((await request(app).delete(`${photosPath}/${photo.id}`).set(auth("token-member"))).status).toBe(403);
    expect((await request(app).delete(`${guestPath}/${photo.id}`)).status).toBe(200);
    expect(rows()).toHaveLength(0);
    expect(db.files(PHOTO_BUCKET)).toEqual({});
  });

  test("the organizer can delete anyone's photo; members only their own", async () => {
    const guestPhoto = await photoBy({});
    const ownerPhoto = await photoBy({ token: "token-owner" });
    expect((await request(app).delete(`${photosPath}/${ownerPhoto.id}`).set(auth("token-member"))).status).toBe(403);

    const res = await request(app).get(photosPath).set(auth("token-owner"));
    expect(res.body.photos.every((p) => p.canDelete)).toBe(true);
    expect((await request(app).delete(`${photosPath}/${guestPhoto.id}`).set(auth("token-owner"))).status).toBe(200);
    expect(rows().map((r) => r.id)).toEqual([ownerPhoto.id]);
  });

  test("photos on another trip can't be reached through this one", async () => {
    const photo = await photoBy({ token: "token-owner" });
    db.rows("trip_photos")[0].trip_id = "trip-2";
    expect((await request(app).delete(`${photosPath}/${photo.id}`).set(auth("token-owner"))).status).toBe(404);
  });

  test("only the organizer can empty the album, and it removes the files", async () => {
    await photoBy({ token: "token-owner" });
    await photoBy({});
    expect((await request(app).delete(photosPath).set(auth("token-member"))).status).toBe(403);
    expect((await request(app).delete(photosPath).set(auth("token-owner"))).status).toBe(200);
    expect(rows()).toHaveLength(0);
    expect(db.files(PHOTO_BUCKET)).toEqual({});
  });

  test("a photo's uploader is remembered by account, not by membership", async () => {
    const photo = await photoBy({ token: "token-member" });
    expect(photo).toMatchObject({ uploaded_by: MEMBER.id, member_id: "m-approved" });
    const ownerPhoto = await photoBy({ token: "token-owner" });
    expect(ownerPhoto).toMatchObject({ uploaded_by: OWNER.id, member_id: null });
  });
});

describe("helpers", () => {
  test("splitUpload needs a sensible thumbnail length", () => {
    const body = Buffer.concat([JPEG_WITH_GPS, JPEG_WITH_GPS]);
    expect(splitUpload(body, String(JPEG_WITH_GPS.length)).photo.type).toBe("image/jpeg");
    expect(splitUpload(body, "0").error).toBeTruthy();
    expect(splitUpload(body, String(body.length)).error).toBeTruthy();
    expect(splitUpload(body, "abc").error).toBeTruthy();
  });

  test("cleanDay", () => {
    expect(cleanDay("", 3)).toEqual({ day: null });
    expect(cleanDay("2", 3)).toEqual({ day: 2 });
    expect(cleanDay(0, 3).error).toBeTruthy();
    expect(cleanDay(1.5, 3).error).toBeTruthy();
  });
});
