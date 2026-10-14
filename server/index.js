const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// server/index.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { tripLengthDays, isAllowedTripLength, MAX_TRIP_DAYS } from "../shared/tripLength.js";
import { addFoodSpots } from "./foodSpots.js";
import { geocodeCity, locateHomebase } from "./geoapify.js";
import { buildTripPdf } from "./pdf.js";
import { registerCrewRoutes, withoutPrivateDetails } from "./crew.js";
import { registerMemberReservationRoutes } from "./memberReservations.js";
import { createGuards } from "./limits.js";
import { createNotifier } from "./notifications.js";
import { createGenerationJobs } from "./generationJobs.js";
import { patchItineraryData } from "./tripData.js";
import { travelerNeeds } from "./travelerProfile.js";
import { logger } from "./logger.js";
import { publicMessage } from "./errors.js";

const app = express();
// Hosts like Railway assign the port; locally it's 3001 (Vite runs the frontend on 3000)
const PORT = process.env.PORT || 3001;
// The built frontend (npm run build). Served by this server in production.
const DIST_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

// Browsers may only call the API from these origins (CORS_ORIGINS, comma-separated). In
// production the app is served from the same origin as the API, so this is mainly for local
// development, where Vite runs on :3000 and the API on :3001.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// One proxy (Railway's) sits in front of the app, so req.ip is the visitor's address
app.set("trust proxy", 1);

// Middleware
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json());

// Who is calling, rate limits, and the daily itinerary cap (server/limits.js)
const guards = createGuards({
  supabaseUrl: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
app.use("/api", guards.identify, guards.limits.api);
app.use(["/api/generate-itinerary", "/api/food-spots", "/api/trip-pdf"], guards.limits.ai);
app.use(["/api/invites", "/api/guest"], guards.limits.public);
// Joining (or asking to join) a trip gets a tighter per-IP limit, on top of crew.js's per-trip one
app.post("/api/invites/:token/join", guards.limits.join);
// Geoapify lookups are only used from the signed-in questionnaire; without this, anyone
// could use the server as a free proxy and exhaust the quota
app.use(["/api/search-hotels", "/api/validate-address"], guards.requireUser, guards.limits.geo);

// In-app notifications (join requests, approvals, itinerary ready/failed)
const notifier = createNotifier({ supabaseUrl: SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY });

// Itinerary generation runs as a job that survives restarts; the sweeper picks up jobs a
// previous server left unfinished
const generationJobs = createGenerationJobs({
  supabaseUrl: SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anthropicKey: ANTHROPIC_API_KEY,
  geoapifyKey: process.env.GEOAPIFY_API_KEY,
  guards,
  notifier,
});
// Not in tests, which import the app without starting background work
if (!process.env.VITEST) generationJobs.startSweeper();

// Travel Crew routes (invites, join requests and approvals, crew list, guest view)
registerCrewRoutes(app, {
  supabaseUrl: SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  notifier,
});

// Travel partners' own reservations (each person only ever sees their own)
const memberReservations = registerMemberReservationRoutes(app, {
  supabaseUrl: SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generate itinerary endpoint.
// The client saves the trip as pending first, then calls this with its id. We record a
// generation job, reply 202 right away and generate in the background, writing the result
// back to the trip row — so the itinerary still lands on the dashboard if the user leaves the
// page, and is retried (or marked failed) if the server restarts meanwhile.
app.post("/api/generate-itinerary", async (req, res) => {
  const { tripId } = req.body;
  const token = req.headers.authorization?.replace(/^Bearer /, "");

  const configError = checkAiConfig();
  if (configError) return res.status(500).json({ error: configError });
  if (!tripId || !token) {
    return res.status(400).json({ error: "tripId and an auth token are required" });
  }

  const supabase = supabaseAsUser(token);
  const { data: { user } = {} } = await supabase.auth.getUser(token);

  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, user_id, destination, itinerary_data")
    .eq("id", tripId)
    .single();

  const formData = trip?.itinerary_data?._form_data;
  if (error || !formData) {
    return res.status(404).json({ error: "Trip not found" });
  }

  // Travel partners can read shared trips, so being able to read it isn't enough: only the
  // owner may spend Claude calls on it
  if (!user || trip.user_id !== user.id) {
    return res.status(403).json({ error: "Only the trip's owner can generate its itinerary" });
  }

  // A trip is generated once; the client marks it pending (new or retry) before calling this
  const status = trip.itinerary_data?._status;
  if (status !== "pending" && status !== "failed") {
    return res.status(409).json({ error: "This trip's itinerary has already been generated" });
  }

  // Enforced here, not just in the questionnaire, since the browser can be bypassed
  const days = tripLengthDays(formData.cities);
  if (!isAllowedTripLength(days)) {
    return res.status(400).json({
      error: days === null || days < 1
        ? "This trip needs check-in and check-out dates."
        : `Trips can be up to ${MAX_TRIP_DAYS} days; this one is ${days}. Please shorten your dates.`,
    });
  }

  // Someone double-clicked, or a retry arrived while the first run is still going
  if (await generationJobs.isRunning(trip.id)) {
    return res.status(409).json({ error: "This itinerary is already being generated" });
  }

  // Per-account daily cap; given back if generation fails, so failures don't count
  const reservation = await guards.reserveGeneration(user.id, trip.id);
  if (reservation.error) {
    return res.status(reservation.status).json({ error: reservation.error });
  }

  // Recorded as a job before replying, so it survives a server restart (server/generationJobs.js)
  try {
    await generationJobs.start({ tripId: trip.id, userId: user.id, reservationId: reservation.id });
  } catch (err) {
    await guards.releaseGeneration(reservation.id).catch(() => {});
    logger.error({ err, tripId: trip.id }, "Couldn't start generation");
    return res.status(500).json({ error: publicMessage(err, "Couldn't start generating this trip. Please try again.") });
  }
  res.status(202).json({ status: "pending" });
});

function checkAiConfig() {
  if (!ANTHROPIC_API_KEY) return "API key not configured on server";
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return "Supabase not configured on server";
  return null;
}

// Supabase client that acts as the signed-in user, so row-level security still applies
function supabaseAsUser(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}


// Food spots for one city of a trip. The first call returns 12 places; each later call
// adds 10 more, skipping ones already listed. Also looks up the city's homebase location
// if it hasn't been yet. Results are saved on the trip (itinerary_data._food_spots[city],
// _homebases[city]) so each is only fetched once. `homebaseOnly: true` skips the new spots,
// for trips whose spots were saved before homebases were tracked.
app.post("/api/food-spots", async (req, res) => {
  const { tripId, city, homebaseOnly } = req.body;
  const token = req.headers.authorization?.replace(/^Bearer /, "");

  const configError = checkAiConfig();
  if (configError) return res.status(500).json({ error: configError });
  if (!tripId || !city || !token) {
    return res.status(400).json({ error: "tripId, city and an auth token are required" });
  }

  const supabase = supabaseAsUser(token);
  const { data: { user } = {} } = await supabase.auth.getUser(token);
  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, user_id, itinerary_data")
    .eq("id", tripId)
    .single();

  const data = trip?.itinerary_data;
  if (error || !data) return res.status(404).json({ error: "Trip not found" });

  // Travel partners can read shared trips; only the owner may spend Claude calls on it
  if (!user || trip.user_id !== user.id) {
    return res.status(403).json({ error: "Only the trip's owner can load more food spots" });
  }

  // Only cities in this trip, so the endpoint can't be used for arbitrary prompts
  const tripCities = (data._form_data?.cities || []).map((c) => c.name).filter(Boolean);
  if (!tripCities.includes(city)) {
    return res.status(400).json({ error: "That city isn't part of this trip" });
  }

  const existing = data._food_spots?.[city] || [];
  const homebases = data._homebases || {};
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  const cityForm = data._form_data.cities.find((c) => c.name === city);

  try {
    const [spots, homebase] = await Promise.all([
      homebaseOnly
        ? existing
        : addFoodSpots({
            city,
            country: data._form_data?.country,
            existing,
            anthropicKey: ANTHROPIC_API_KEY,
            geoapifyKey,
            // Only the owner gets here, so these are their own dietary needs
            traveler: await travelerNeeds(supabase, user.id),
          }),
      // undefined = lookup failed, try again next time; null = nothing to pin
      city in homebases ? homebases[city] : locateHomebase(cityForm, geoapifyKey).catch(() => undefined),
    ]);

    await patchItineraryData(supabase, tripId, {
      _food_spots: { ...data._food_spots, [city]: spots },
      ...(homebase !== undefined && { _homebases: { ...homebases, [city]: homebase } }),
    });

    res.json({ spots, homebase: homebase ?? null });
  } catch (err) {
    logger.error({ err, tripId, city }, "Food spots failed");
    res.status(502).json({ error: publicMessage(err, "Couldn't load food spots. Please try again.") });
  }
});

// Offline PDF of a ready trip: day-by-day maps, stops and tips, plus local events and
// food spots. Responds with the PDF file; `miles` picks the distance units.
app.post("/api/trip-pdf", async (req, res) => {
  const { tripId, miles } = req.body;
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Supabase not configured on server" });
  }
  if (!tripId || !token) {
    return res.status(400).json({ error: "tripId and an auth token are required" });
  }

  const supabase = supabaseAsUser(token);
  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, user_id, destination, itinerary_data")
    .eq("id", tripId)
    .single();
  if (error || !trip) return res.status(404).json({ error: "Trip not found" });
  if (!trip.itinerary_data?.days?.length) {
    return res.status(400).json({ error: "This trip doesn't have an itinerary yet" });
  }

  try {
    const { data: { user } = {} } = await supabase.auth.getUser(token);
    if (user && trip.user_id === user.id) {
      await fillMissingFoodSpots(supabase, trip);
    } else {
      // A travel partner's copy: leave out the owner's reservations and confirmation codes,
      // and include the partner's own instead (server/memberReservations.js)
      const shared = withoutPrivateDetails(trip.itinerary_data);
      const mine = user ? await memberReservations.forUser(trip.id, user.id) : { flights: [], hotels: [] };
      trip.itinerary_data = { ...shared, _form_data: { ...shared._form_data, reservations: mine } };
    }
    const doc = await buildTripPdf(trip, { geoapifyKey: process.env.GEOAPIFY_API_KEY, miles: !!miles });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="trip-${tripId}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (err) {
    logger.error({ err, tripId }, "PDF generation failed");
    res.status(500).json({ error: "Couldn't create the PDF" });
  }
});

// Older trips (made before food spots came with the itinerary) may be missing food spots
// or homebase locations for some cities. Fetch those now, in parallel, and save them on the
// trip so the PDF and the Food Spots tab both have them. Updates `trip` in place; a city
// that fails is simply left out.
async function fillMissingFoodSpots(supabase, trip) {
  const data = trip.itinerary_data;
  const form = data._form_data || {};
  const foodSpots = { ...data._food_spots };
  const homebases = { ...data._homebases };
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;

  const tasks = (form.cities || [])
    .filter((c) => c.name)
    .flatMap((c) => [
      ANTHROPIC_API_KEY && !foodSpots[c.name]?.length &&
        addFoodSpots({ city: c.name, country: form.country, anthropicKey: ANTHROPIC_API_KEY, geoapifyKey })
          .then((spots) => { foodSpots[c.name] = spots; })
          .catch((err) => logger.error({ err, city: c.name }, "Food spots failed")),
      !(c.name in homebases) &&
        locateHomebase(c, geoapifyKey)
          .then((homebase) => { homebases[c.name] = homebase; })
          .catch(() => {}),
    ])
    .filter(Boolean);
  if (!tasks.length) return;

  await Promise.all(tasks);
  const patch = { _food_spots: foodSpots, _homebases: homebases };
  try {
    trip.itinerary_data = await patchItineraryData(supabase, trip.id, patch);
  } catch (err) {
    // Still use what was fetched for this PDF; it'll be fetched again next time
    logger.error({ err, tripId: trip.id }, "Failed to save food spots");
    trip.itinerary_data = { ...data, ...patch };
  }
}

// Hotel search endpoint
app.get("/api/search-hotels", async (req, res) => {
  const { city, country } = req.query;
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Geoapify API key not configured on server",
    });
  }

  if (!city) {
    return res.status(400).json({
      error: "City is required",
    });
  }

  try {
    const location = await geocodeCity(city, country, apiKey);

    if (!location) {
      return res.json({ hotels: [] });
    }

    const placesUrl = `https://api.geoapify.com/v2/places?categories=accommodation.hotel&filter=circle:${location.lon},${location.lat},15000&bias=proximity:${location.lon},${location.lat}&limit=50&apiKey=${apiKey}`;

    const placesResponse = await fetch(placesUrl);
    if (!placesResponse.ok) {
      const errorData = await placesResponse.json();
      logger.error({ status: placesResponse.status, geoapify: errorData?.message }, "Geoapify Places error");
      return res.status(502).json({ error: "Hotel search isn't available right now. Please try again." });
    }

    const placesData = await placesResponse.json();
    const hotels = (placesData.features || [])
      .map((f) => ({
        name: f.properties.name,
        address: f.properties.formatted,
        lat: f.properties.lat,
        lon: f.properties.lon,
      }))
      .filter((h) => h.name && h.address);

    res.json({ hotels });
  } catch (error) {
    logger.error({ err: error, path: req.path }, "Request failed");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// Address validation endpoint
app.get("/api/validate-address", async (req, res) => {
  const { address } = req.query;
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Geoapify API key not configured on server",
    });
  }

  if (!address) {
    return res.status(400).json({
      error: "Address is required",
    });
  }

  try {
    const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&format=json&apiKey=${apiKey}`;

    const geocodeResponse = await fetch(geocodeUrl);
    if (!geocodeResponse.ok) {
      const errorData = await geocodeResponse.json();
      logger.error({ status: geocodeResponse.status, geoapify: errorData?.message }, "Geoapify geocode error");
      return res.status(502).json({ error: "Address check isn't available right now. Please try again." });
    }

    const geocodeData = await geocodeResponse.json();
    const result = geocodeData.results?.[0];
    const confidence = result?.rank?.confidence ?? 0;
    const tooVague = !result || ["country", "state"].includes(result.result_type);
    const valid = !tooVague && confidence >= 0.4;

    res.json({
      valid,
      lat: result?.lat,
      lon: result?.lon,
      formatted: result?.formatted,
    });
  } catch (error) {
    logger.error({ err: error, path: req.path }, "Request failed");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// In production, also serve the built React app, so the whole site runs on one port.
// Any other GET (e.g. /trip/123) gets index.html and React Router takes it from there.
if (fs.existsSync(path.join(DIST_DIR, "index.html"))) {
  app.use(
    express.static(DIST_DIR, {
      index: false,
      setHeaders: (res, filePath) => {
        // Hashed build assets never change; the service worker and manifest must always be fresh
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );
  app.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method) || req.path.startsWith("/api/")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
  logger.info({ dir: DIST_DIR }, "Serving frontend");
}

// Exported for route tests (server/*.test.js), which use supertest instead of a real port
export default app;

if (!process.env.VITEST) {
  app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || "development", ai: !!ANTHROPIC_API_KEY }, "Server running");
  });
}
