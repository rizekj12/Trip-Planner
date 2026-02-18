import { days as mockDays } from "../data/days";
import { spots as mockSpots } from "../data/spots";
import { HOTELS } from "../data/hotels";
import { sampleEvents } from "../data/events";

// Helper functions
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
  },
  "events": [
    {
      "id": "event_1",
      "title": "Event Name",
      "date": "Date range or specific date",
      "time": "Event time (or 'Varies' if not specific)",
      "location": "Venue name",
      "address": "Full address",
      "description": "What happens at this event",
      "price": "Free|$10|$5-$20|null if unknown",
      "website": "URL or null",
      "ticketLink": "URL or null if no tickets needed",
      "category": "Food & Drink|Music & Dance|Sports & Recreation|Arts & Culture|Nightlife|Festival|Market|Other",
      "image": "https://via.placeholder.com/400x300"
    }
  ]
}

EVENT REQUIREMENTS:
- Include 3-5 LOCAL events happening during trip dates (${formData.cities[0].checkIn} to ${formData.cities[formData.cities.length - 1].checkOut})
- Mix of ticketed and free events
- Include festivals, markets, concerts, sports, cultural events, street fairs, etc.
- If ticket info unavailable, use null for ticketLink and "Check website" or "Free" for price
- If no official website exists, use null
- Events should match ${formData.vacationType} vacation type

ITINERARY REQUIREMENTS:
- Include ${numDays} days with 3-5 activities per day
- Use real GPS coordinates
- Match travel style: ${formData.travelStyle}`;
}

function parseItineraryResponse(apiResponse) {
  try {
    const textContent = apiResponse.content[0].text;
    const cleanedText = textContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const itinerary = JSON.parse(cleanedText);

    if (!itinerary.days || !Array.isArray(itinerary.days)) {
      throw new Error("Invalid itinerary structure: missing days array");
    }

    if (!itinerary.spots || typeof itinerary.spots !== "object") {
      throw new Error("Invalid itinerary structure: missing spots object");
    }

    // Events are optional
    if (!itinerary.events) {
      itinerary.events = [];
    }

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

// Mock itinerary generator
async function generateMockItinerary(formData) {
  console.log("🎭 MOCK MODE: Using mock data instead of API");
  console.log("Form data received:", formData);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Return your existing Japan trip data with events
  const mockItinerary = {
    days: mockDays,
    spots: mockSpots,
    events: sampleEvents,
    hotels: {
      tokyo_akiba: HOTELS.tokyo_akiba,
      kyoto_rokujo: HOTELS.kyoto_rokujo,
      tokyo_tamachi: HOTELS.tokyo_tamachi,
    },
  };

  console.log("✅ Mock itinerary generated with events");
  return mockItinerary;
}

// Real AI itinerary generator
async function generateRealItinerary(formData) {
  const prompt = buildPrompt(formData);

  console.log("🤖 AI MODE: Calling Claude API");
  console.log("Generating itinerary with prompt length:", prompt.length);

  const isDevelopment = import.meta.env.DEV;
  const backendUrl = isDevelopment ? "http://localhost:3001" : "";

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

// Main export - decides between mock and real based on environment
export async function generateItinerary(formData, forceMock = false) {
  // Check environment variable to decide mock vs real
  const useMock = forceMock || import.meta.env.VITE_USE_MOCK_DATA === "true";

  if (useMock) {
    return generateMockItinerary(formData);
  } else {
    return generateRealItinerary(formData);
  }
}
