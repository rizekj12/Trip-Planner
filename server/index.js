console.log("=== BACKEND STARTING ===");
console.log("Environment:", process.env.NODE_ENV);
// VITE_ANTHROPIC_API_KEY is the legacy name, still accepted until every environment is renamed
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
console.log("API Key exists:", !!ANTHROPIC_API_KEY);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// server/index.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { generateItinerary, tripLengthDays, MAX_TRIP_DAYS } from "./itinerary.js";
import { addFoodSpots, foodSpotsForTrip } from "./foodSpots.js";
import { geocodeCity, locateHomebase, homebasesForTrip } from "./geoapify.js";
import { buildTripPdf } from "./pdf.js";
import { registerCrewRoutes, withoutPrivateDetails } from "./crew.js";

const app = express();
// Hosts like Railway assign the port; locally it's 3001 (Vite runs the frontend on 3000)
const PORT = process.env.PORT || 3001;
// The built frontend (npm run build). Served by this server in production.
const DIST_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

// Middleware
app.use(cors());
app.use(express.json());

// Travel Crew routes (invites, joining, crew list, guest view)
registerCrewRoutes(app, {
  supabaseUrl: SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generate itinerary endpoint.
// The client saves the trip as pending first, then calls this with its id. We reply
// 202 right away and generate in the background, writing the result back to the trip
// row — so the itinerary still lands on the dashboard if the user leaves the page.
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
    .select("id, user_id, itinerary_data")
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
  if (days < 1 || days > MAX_TRIP_DAYS) {
    return res.status(400).json({
      error: days < 1
        ? "This trip needs check-in and check-out dates."
        : `Trips can be up to ${MAX_TRIP_DAYS} days; this one is ${days}. Please shorten your dates.`,
    });
  }

  res.status(202).json({ status: "pending" });

  try {
    // Food spots and homebase locations are prepared alongside the itinerary, so the
    // Food Spots tab (list, distances, map) is ready when the trip is
    const geoapifyKey = process.env.GEOAPIFY_API_KEY;
    const [itinerary, foodSpots, homebases] = await Promise.all([
      generateItinerary(formData, ANTHROPIC_API_KEY),
      foodSpotsForTrip(formData, { anthropicKey: ANTHROPIC_API_KEY, geoapifyKey }),
      homebasesForTrip(formData, geoapifyKey),
    ]);
    await patchItineraryData(supabase, tripId, {
      ...itinerary,
      _status: "ready",
      _food_spots: foodSpots,
      _homebases: homebases,
    });
  } catch (err) {
    console.error("Itinerary generation failed:", err);
    // The response has already been sent, so a failure here can only be logged
    await patchItineraryData(supabase, tripId, {
      _status: "failed",
      _error: err.message || "Generation failed",
    }).catch((saveErr) => console.error("Couldn't mark trip as failed:", tripId, saveErr));
  }
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

// Merges `patch` into the trip's itinerary_data, re-reading the row right before writing so
// changes made while we were working (e.g. the user editing reservations, which live in
// _form_data) aren't overwritten. Returns the merged data; throws if it couldn't save.
async function patchItineraryData(supabase, tripId, patch) {
  const { data: row, error: readError } = await supabase
    .from("trips")
    .select("itinerary_data")
    .eq("id", tripId)
    .single();
  if (readError) {
    throw new Error(`Couldn't read trip ${tripId}: ${readError.message}`);
  }
  const merged = { ...row.itinerary_data, ...patch };
  // An update blocked by row-level security returns no error, just no rows, so check both
  const { data: updated, error } = await supabase
    .from("trips")
    .update({ itinerary_data: merged })
    .eq("id", tripId)
    .select("id");
  if (error) {
    throw new Error(`Couldn't save trip ${tripId}: ${error.message}`);
  }
  if (!updated?.length) {
    throw new Error(`Couldn't save trip ${tripId}: no row was updated`);
  }
  return merged;
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
    console.error("Food spots failed:", err);
    res.status(502).json({ error: err.message || "Couldn't load food spots" });
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
      // A travel partner's copy: leave out the owner's reservations and confirmation codes
      trip.itinerary_data = withoutPrivateDetails(trip.itinerary_data);
    }
    const doc = await buildTripPdf(trip, { geoapifyKey: process.env.GEOAPIFY_API_KEY, miles: !!miles });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="trip-${tripId}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error("PDF generation failed:", err);
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
          .catch((err) => console.error(`Food spots for ${c.name} failed:`, err.message)),
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
    console.error("Failed to save food spots for trip", trip.id, err);
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
      console.error("Geoapify Places error:", errorData);
      return res.status(placesResponse.status).json({
        error: errorData.message || "Hotel search failed",
      });
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
    console.error("Server error:", error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
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
      console.error("Geoapify geocode error:", errorData);
      return res.status(geocodeResponse.status).json({
        error: errorData.message || "Address validation failed",
      });
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
    console.error("Server error:", error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
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
  console.log("Serving frontend from", DIST_DIR);
}

app.listen(PORT, () => {
  console.log(`=== Backend server running on port ${PORT} ===`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
