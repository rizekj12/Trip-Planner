// Flight and hotel reservations (confirmation codes etc.), stored in the trip's form data so
// itinerary generation carries them through untouched:
//   formData.reservations.flights  — every flight
//   formData.reservations.hotels   — hotels added by hand
//   formData.cities[i].hotel       — the hotel picked in the questionnaire, whose
//                                    confirmationCode / notes are edited in place
// Updaters are pure: they take formData and return a new formData.

export const BLANK_FLIGHT = {
  airline: "", flightNumber: "", confirmationCode: "", from: "", to: "", date: "", time: "", notes: "",
};
export const BLANK_HOTEL = {
  name: "", address: "", checkIn: "", checkOut: "", confirmationCode: "", notes: "",
};

export function newReservationId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// True if any field besides the id has been filled in
export function hasDetails(entry) {
  return Object.entries(entry || {}).some(([key, value]) => key !== "id" && String(value ?? "").trim());
}

// Flights in date/time order (undated ones last)
export function getFlights(formData) {
  const flights = formData?.reservations?.flights || [];
  return [...flights].sort((a, b) =>
    `${a.date || "9999"} ${a.time || ""}`.localeCompare(`${b.date || "9999"} ${b.time || ""}`)
  );
}

// Questionnaire hotels (source "trip", one per city with a hotel) then hand-added ones ("manual")
export function getHotels(formData) {
  const fromTrip = (formData?.cities || [])
    .map((c, i) =>
      c.homebaseType === "hotel" && c.hotel?.name
        ? {
            id: `city-${i}`,
            source: "trip",
            cityIndex: i,
            city: c.name,
            name: c.hotel.name,
            address: c.hotel.address,
            checkIn: c.checkIn,
            checkOut: c.checkOut,
            confirmationCode: c.hotel.confirmationCode || "",
            notes: c.hotel.notes || "",
          }
        : null
    )
    .filter(Boolean);
  const manual = (formData?.reservations?.hotels || []).map((h) => ({ ...h, source: "manual" }));
  return [...fromTrip, ...manual];
}

function withReservations(formData, patch) {
  const reservations = { flights: [], hotels: [], ...formData.reservations };
  return { ...formData, reservations: { ...reservations, ...patch(reservations) } };
}

// Insert or replace (by id)
const upsert = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

export function saveFlight(formData, flight) {
  const entry = { ...flight, id: flight.id || newReservationId() };
  return withReservations(formData, (r) => ({ flights: upsert(r.flights, entry) }));
}

export function deleteFlight(formData, id) {
  return withReservations(formData, (r) => ({ flights: r.flights.filter((f) => f.id !== id) }));
}

export function saveHotel(formData, hotel) {
  if (hotel.source === "trip") {
    // Only the code and notes are editable; name/address/dates come from the trip itself
    const cities = formData.cities.map((c, i) =>
      i === hotel.cityIndex
        ? { ...c, hotel: { ...c.hotel, confirmationCode: hotel.confirmationCode, notes: hotel.notes } }
        : c
    );
    return { ...formData, cities };
  }
  const { source, ...fields } = hotel;
  const entry = { ...fields, id: fields.id || newReservationId() };
  return withReservations(formData, (r) => ({ hotels: upsert(r.hotels, entry) }));
}

// Hand-added hotels are removed; a trip hotel just has its code and notes cleared
export function deleteHotel(formData, hotel) {
  if (hotel.source === "trip") return saveHotel(formData, { ...hotel, confirmationCode: "", notes: "" });
  return withReservations(formData, (r) => ({ hotels: r.hotels.filter((h) => h.id !== hotel.id) }));
}
