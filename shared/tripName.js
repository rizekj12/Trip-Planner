// What to call a trip, shared by the app and the server (PDF, notifications). Usually its
// country ("Japan"), but a trip in the traveler's own country is named after its cities:
// someone based in the United States going to New York sees "New York", not "United
// States". `homeCountry` is the viewer's (user_metadata.home_country, set in the profile menu).

// "New York", "New York & Boston", "Austin, Dallas & Houston", "Austin, Dallas + 2 more"
export function joinCities(cities) {
  if (cities.length <= 2) return cities.join(" & ");
  if (cities.length === 3) return `${cities[0]}, ${cities[1]} & ${cities[2]}`;
  return `${cities[0]}, ${cities[1]} + ${cities.length - 2} more`;
}

export function placeName({ country, cities = [] }, homeCountry) {
  const names = [...new Set((cities || []).filter(Boolean))];
  if (country && homeCountry && country === homeCountry && names.length) return joinCities(names);
  return country || "";
}

// The city names of a trip row (the `cities` column, or the questionnaire answers)
export const tripCities = (trip) =>
  trip?.cities?.length ? trip.cities : (trip?.itinerary_data?._form_data?.cities || []).map((c) => c.name).filter(Boolean);

// A trip row's name, or "" when it has no destination yet
export const tripName = (trip, homeCountry) => placeName({ country: trip?.destination, cities: tripCities(trip) }, homeCountry);
