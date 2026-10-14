// Shared test data: one organizer, one approved member, one pending member, one stranger,
// and a ready trip whose form data holds reservations and confirmation codes.
export const OWNER = { id: "user-owner", email: "owner@example.com", user_metadata: { full_name: "Olivia Owner" } };
export const MEMBER = { id: "user-member", email: "member@example.com", user_metadata: { full_name: "Max Member" } };
export const PENDING = { id: "user-pending", email: "pending@example.com", user_metadata: { full_name: "Pat Pending" } };
export const STRANGER = { id: "user-stranger", email: "stranger@example.com", user_metadata: { full_name: "Sam Stranger" } };

export const TOKENS = { "token-owner": OWNER.id, "token-member": MEMBER.id, "token-pending": PENDING.id, "token-stranger": STRANGER.id };
export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const TRIP_ID = "trip-1";
export const GUEST_TOKEN = "11111111-1111-4111-8111-111111111111";
export const PENDING_GUEST_TOKEN = "22222222-2222-4222-8222-222222222222";
export const INVITE_TOKEN = "33333333-3333-4333-8333-333333333333";

// Strings that must never reach anyone but the organizer
export const SECRETS = ["FLIGHT-CODE-1", "HOTEL-CODE-1", "MANUAL-HOTEL-CODE", "UA 123", "Seat 14C", "Late check-in"];

export function formData() {
  return {
    country: "Japan",
    travelStyle: "flexible",
    vacationType: "balanced",
    cities: [
      {
        name: "Tokyo",
        checkIn: "2030-04-01",
        checkOut: "2030-04-05",
        homebaseType: "hotel",
        hotel: { name: "Hotel Sakura", address: "1-1 Ginza, Tokyo", confirmationCode: "HOTEL-CODE-1", notes: "Late check-in", lat: 35.67, lon: 139.76 },
      },
    ],
    reservations: {
      flights: [
        { id: "f1", airline: "United", flightNumber: "UA 123", confirmationCode: "FLIGHT-CODE-1", from: "MCO", to: "HND", date: "2030-03-31", time: "10:00", notes: "Seat 14C" },
      ],
      hotels: [{ id: "h1", name: "Airport Inn", address: "Haneda", confirmationCode: "MANUAL-HOTEL-CODE", notes: "" }],
    },
  };
}

export function readyTrip(overrides = {}) {
  return {
    id: TRIP_ID,
    user_id: OWNER.id,
    destination: "Japan",
    cities: ["Tokyo"],
    itinerary_data: {
      days: [{ key: "d1", date: "Day 1 (Tokyo)", title: "Arrival", markers: ["s1"], notes: [] }],
      spots: { s1: { title: "Senso-ji", coords: [35.71, 139.79] } },
      events: [],
      _status: "ready",
      _pdf_downloaded_at: "2030-01-01T00:00:00Z",
      _form_data: formData(),
      ...overrides,
    },
  };
}

export function members() {
  return [
    { id: "m-approved", trip_id: TRIP_ID, user_id: MEMBER.id, role: "member", status: "approved", name: "Max Member", email: MEMBER.email, joined_at: "2030-01-01T00:00:00Z" },
    { id: "m-pending", trip_id: TRIP_ID, user_id: PENDING.id, role: "member", status: "pending", name: "Pat Pending", email: PENDING.email, joined_at: "2030-01-02T00:00:00Z" },
    { id: "m-guest", trip_id: TRIP_ID, user_id: null, role: "guest", status: "approved", name: "Gail Guest", email: "guest@example.com", guest_token: GUEST_TOKEN, joined_at: "2030-01-03T00:00:00Z" },
    { id: "m-guest-pending", trip_id: TRIP_ID, user_id: null, role: "guest", status: "pending", name: "Gus Guest", email: "gus@example.com", guest_token: PENDING_GUEST_TOKEN, joined_at: "2030-01-04T00:00:00Z" },
  ];
}

export const USERS = [OWNER, MEMBER, PENDING, STRANGER];

// True if any organizer-only string appears anywhere in `value`
export const leaksSecrets = (value) => {
  const text = JSON.stringify(value);
  return SECRETS.filter((s) => text.includes(s));
};
