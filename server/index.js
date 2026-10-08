console.log("=== BACKEND STARTING ===");
console.log("Environment:", process.env.NODE_ENV);
// VITE_ANTHROPIC_API_KEY is the legacy name, still accepted until every environment is renamed
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
console.log("API Key exists:", !!ANTHROPIC_API_KEY);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// server/index.js
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { generateItinerary } from "./itinerary.js";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured on server" });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Supabase not configured on server" });
  }
  if (!tripId || !token) {
    return res.status(400).json({ error: "tripId and an auth token are required" });
  }

  // Act as the signed-in user so Supabase row-level security still applies
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, itinerary_data")
    .eq("id", tripId)
    .single();

  const formData = trip?.itinerary_data?._form_data;
  if (error || !formData) {
    return res.status(404).json({ error: "Trip not found" });
  }

  res.status(202).json({ status: "pending" });

  try {
    const itinerary = await generateItinerary(formData, ANTHROPIC_API_KEY);
    await saveItineraryData(supabase, tripId, { ...itinerary, _form_data: formData, _status: "ready" });
  } catch (err) {
    console.error("Itinerary generation failed:", err);
    await saveItineraryData(supabase, tripId, {
      _form_data: formData,
      _status: "failed",
      _error: err.message || "Generation failed",
    });
  }
});

async function saveItineraryData(supabase, tripId, itineraryData) {
  const { error } = await supabase
    .from("trips")
    .update({ itinerary_data: itineraryData })
    .eq("id", tripId);
  if (error) console.error("Failed to save itinerary for trip", tripId, error);
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
    const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      [city, country].filter(Boolean).join(", "),
    )}&type=city&format=json&apiKey=${apiKey}`;

    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    const location = geocodeData.results?.[0];

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

app.listen(PORT, () => {
  console.log(`=== Backend server running on port ${PORT} ===`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
