import { days as mockDays } from "../data/days";
import { spots as mockSpots } from "../data/spots";
import { HOTELS } from "../data/hotels";
import { sampleEvents } from "../data/events";
import { supabase } from "./supabase";
import { savePending, saveTrip, saveFailed } from "./trips";

// Mock itinerary generator
async function generateMockItinerary(formData) {
  console.log("🎭 MOCK MODE: Using mock data instead of API");
  console.log("Form data received:", formData);

  // Simulate API delay (long enough to see the loading screen)
  await new Promise((resolve) => setTimeout(resolve, 6000));

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

// Saves the trip as pending and kicks off generation without waiting for it.
// The server builds the prompt, calls Claude and writes the itinerary back to the
// trip row, so it finishes even if the user leaves the page. Returns the saved row —
// pending, or failed (with _error) if generation couldn't be started.
export async function startGeneration({ id, formData }) {
  const row = await savePending({ id, formData });

  if (import.meta.env.VITE_USE_MOCK_DATA === "true") {
    generateMockItinerary(formData)
      .then((itinerary) => saveTrip({ id: row.id, country: formData.country, formData, itinerary }))
      .catch(console.error);
    return row;
  }

  try {
    await requestGeneration(row.id);
    return row;
  } catch (err) {
    console.error("Couldn't start generation:", err);
    // Don't leave the trip stuck on pending
    return saveFailed({ id: row.id, formData, error: err.message }).catch(() => row);
  }
}

async function requestGeneration(tripId) {
  const { data: { session } } = await supabase.auth.getSession();
  const backendUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

  let response;
  try {
    response = await fetch(`${backendUrl}/api/generate-itinerary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ tripId }),
    });
  } catch {
    throw new Error("Couldn't reach the server. Is the backend running?");
  }

  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}));
    throw new Error(error || `Couldn't start generation (${response.status})`);
  }
}
