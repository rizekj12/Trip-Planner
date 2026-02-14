console.log("=== BACKEND STARTING ===");
console.log("Environment:", process.env.NODE_ENV);
console.log("API Key exists:", !!process.env.VITE_ANTHROPIC_API_KEY);
// server/index.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

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
  const apiKey = process.env.VITE_ANTHROPIC_API_KEY;

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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Anthropic API error:", errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || "API request failed",
      });
    }

    const data = await response.json();
    console.log("API response received successfully");

    res.json(data);
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
