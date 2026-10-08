console.log("=== BACKEND STARTING ===");
console.log("Environment:", process.env.NODE_ENV);
// VITE_ANTHROPIC_API_KEY is the legacy name, still accepted until every environment is renamed
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
console.log("API Key exists:", !!ANTHROPIC_API_KEY);
// server/index.js
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const PORT = 3001;

app.listen(PORT, () => {
  console.log(`=== Backend server running on port ${PORT} ===`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generate itinerary endpoint
app.post("/api/generate-itinerary", async (req, res) => {
  const { prompt } = req.body;
  const apiKey = ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "API key not configured on server",
    });
  }

  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required",
    });
  }

  try {
    console.log("Calling Anthropic API...");

    const client = new Anthropic({ apiKey });
    // Stream so a large max_tokens doesn't hit HTTP timeouts. Thinking tokens count
    // against max_tokens, so leave plenty of room for a multi-day itinerary.
    const message = await client.messages
      .stream({
        model: "claude-sonnet-5",
        max_tokens: 64000,
        messages: [{ role: "user", content: prompt }],
      })
      .finalMessage();

    console.log("API response received:", message.stop_reason, message.usage);

    if (message.stop_reason === "max_tokens") {
      return res.status(502).json({
        error: "The itinerary was too long and got cut off. Try a shorter trip or fewer cities.",
      });
    }
    if (message.stop_reason === "refusal") {
      return res.status(502).json({ error: "The AI declined to generate this itinerary." });
    }

    res.json(message);
  } catch (error) {
    console.error("Anthropic API error:", error);
    res.status(error instanceof Anthropic.APIError ? error.status ?? 500 : 500).json({
      error: error.message || "Internal server error",
    });
  }
});

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
  console.log(`Backend server running on port ${PORT}`);
});
