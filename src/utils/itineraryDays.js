// What the itinerary page shows about each day: its number, real date and city.
// The AI labels days like "Day 1 (Tokyo)"; actual dates come from the trip's check-in dates
// (day 1 is the first check-in), and the city from whichever stay covers that date.
import { addDays } from "../../shared/tripLength.js";

const fmt = (iso, opts) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", opts);

// The city in a label like "Day 3 (Kyoto)", or ""
const cityFromLabel = (label = "") => /\(([^)]+)\)\s*$/.exec(label)?.[1]?.trim() || "";

// Which city's stay covers `iso`: checked in on or before it and checking out after it. On a
// travel day (one city's check-out is the next one's check-in) that's the new city.
function cityOn(iso, cities) {
  const staying = cities.find((c) => c.checkIn && c.checkOut && c.checkIn <= iso && iso < c.checkOut);
  if (staying) return staying.name;
  // The last day (check-out day of the final stay)
  return cities.find((c) => c.checkOut === iso)?.name || "";
}

export function describeDays(days = [], formData = {}) {
  const cities = (formData.cities || []).filter((c) => c?.name);
  const start = cities.map((c) => c.checkIn).filter(Boolean).sort()[0] || null;
  return days.map((day, i) => {
    const iso = start ? addDays(start, i) : null;
    return {
      key: day.key,
      n: i + 1,
      iso,
      shortDate: iso ? fmt(iso, { month: "short", day: "numeric" }) : null, // "Apr 3"
      longDate: iso ? fmt(iso, { weekday: "short", month: "short", day: "numeric" }) : null, // "Wed, Apr 3"
      city: (iso && cityOn(iso, cities)) || cityFromLabel(day.date) || cities[0]?.name || "",
      title: day.title || `Day ${i + 1}`,
    };
  });
}
