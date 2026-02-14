// Helper functions stay the same
function calculateTotalDays(cities) {
  if (!cities || cities.length === 0) return 0;

  const firstCheckIn = new Date(cities[0].checkIn);
  const lastCheckOut = new Date(cities[cities.length - 1].checkOut);

  const diffTime = Math.abs(lastCheckOut - firstCheckIn);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

function getTravelStyleDescription(style) {
  const descriptions = {
    early_bird: "Early riser - start activities early, relax in evenings",
    night_owl: "Night owl - slow mornings, active nights",
    flexible: "Flexible - mix of early and late activities",
  };
  return descriptions[style] || style;
}

function getVacationTypeDescription(type) {
  const descriptions = {
    relaxation: "Relaxation focused - slow pace, spa, leisure",
    adventure: "Adventure focused - active exploration, lots of activities",
    constant: "Constantly moving - packed schedule, see everything",
    balanced: "Balanced - mix of relaxation and exploration",
  };
  return descriptions[type] || type;
}

function buildPrompt(formData) {
  const numDays = calculateTotalDays(formData.cities);

  const citiesInfo = formData.cities
    .map(
      (city, i) => `
City ${i + 1}: ${city.name}
- Dates: ${city.checkIn} to ${city.checkOut}
- Hotel: ${city.hotel.name}, ${city.hotel.address}
`,
    )
    .join("\n");

  return `Create a ${numDays}-day travel itinerary for ${formData.country}.

TRIP DETAILS:
${citiesInfo}

PREFERENCES:
- Travel Style: ${getTravelStyleDescription(formData.travelStyle)}
- Vacation Type: ${getVacationTypeDescription(formData.vacationType)}

Respond with ONLY valid JSON (no markdown):

{
  "days": [
    {
      "key": "d1",
      "date": "Day 1 (City)",
      "title": "Day description",
      "hotel": {
        "name": "Hotel name",
        "address": "Hotel address",
        "coords": [lat, lon],
        "key": "hotel_key"
      },
      "markers": ["spot1", "spot2"],
      "notes": ["Tip 1", "Tip 2"]
    }
  ],
  "spots": {
    "spot1": {
      "title": "Place Name",
      "coords": [lat, lon],
      "img": "https://via.placeholder.com/400x300",
      "address": "Address",
      "links": {
        "youtube": "https://youtube.com/search?q=Place+Name",
        "maps": "https://www.google.com/maps/search/?api=1&query=Place+Name"
      }
    }
  }
}

Requirements:
- Include ${numDays} days
- 3-5 activities per day
- Use real GPS coordinates
- Match travel style: ${formData.travelStyle}`;
}

function parseItineraryResponse(apiResponse) {
  try {
    // Extract the text content from Claude's response
    const textContent = apiResponse.content[0].text;

    // Remove any markdown code blocks if present
    const cleanedText = textContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON
    const itinerary = JSON.parse(cleanedText);

    // Validate the structure
    if (!itinerary.days || !Array.isArray(itinerary.days)) {
      throw new Error("Invalid itinerary structure: missing days array");
    }

    if (!itinerary.spots || typeof itinerary.spots !== "object") {
      throw new Error("Invalid itinerary structure: missing spots object");
    }

    // Add any missing fields that your existing app expects
    itinerary.days = itinerary.days.map((day) => ({
      ...day,
      markers: day.markers || [],
      notes: day.notes || [],
      hotel: day.hotel || null,
    }));

    return itinerary;
  } catch (error) {
    console.error("Failed to parse itinerary:", error);
    console.error("Raw response:", apiResponse);
    throw new Error("Failed to parse AI response. Please try again.");
  }
}

export async function generateItinerary(formData) {
  const prompt = buildPrompt(formData);

  console.log("Generating itinerary with prompt length:", prompt.length);

  // Determine backend URL based on environment
  const isDevelopment = import.meta.env.DEV;
  const backendUrl = isDevelopment
    ? "http://localhost:3001" // Local backend in dev
    : ""; // Same origin in production (Railway will handle routing)

  try {
    const response = await fetch(`${backendUrl}/api/generate-itinerary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend error:", errorData);
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("Backend response received:", data);

    const itinerary = parseItineraryResponse(data);
    console.log("Parsed itinerary:", itinerary);

    return itinerary;
  } catch (error) {
    console.error("AI generation failed:", error);
    throw error;
  }
}
