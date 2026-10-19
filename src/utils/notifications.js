// In-app notifications (issue #28). The server creates them; the browser reads its own and
// marks them read directly through Supabase (row-level security limits it to the user's rows).
import { supabase } from "./supabase";
import { placeName } from "../../shared/tripName.js";

export const NOTIFICATIONS_PAGE_SIZE = 50;

export async function fetchNotifications(limit = NOTIFICATIONS_PAGE_SIZE) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, trip_id, data, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// Marks the given notifications read (all unread ones when `ids` is omitted)
export async function markNotificationsRead(ids) {
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (ids) query = query.in("id", ids);
  const { error } = await query;
  if (error) throw error;
}

// One line of text for a notification, e.g. "Sam would like to join your trip to Ireland".
// `homeCountry` (the reader's) names a trip in their own country after its cities
// ("your trip to New York"); notifications from before cities were saved use the country.
export function notificationText({ type, data = {} }, homeCountry = null) {
  const place = placeName({ country: data.destination, cities: data.cities }, homeCountry);
  const trip = place ? `your trip to ${place}` : "your trip";
  switch (type) {
    case "join_request":
      if (data.resolution === "approved") return `${data.name} joined ${trip}`;
      if (data.resolution === "declined") return `You declined ${data.name}'s request to join ${trip}`;
      return `${data.name} would like to join ${trip}`;
    case "member_joined":
      return `${data.name} joined ${trip}`;
    case "join_approved":
      return `${data.owner_name || "The organizer"} approved you to join the trip to ${place || "their trip"}`;
    case "itinerary_ready":
      return `Your itinerary for ${place || "your trip"} is ready`;
    case "itinerary_failed":
      return `We couldn't create your itinerary for ${place || "your trip"}. You can try again.`;
    default:
      return "You have a new notification";
  }
}

// Where tapping a notification goes
export function notificationLink({ type, trip_id: tripId }) {
  if (!tripId) return null;
  if (type === "join_request" || type === "member_joined") return `/trip/${tripId}?section=crew`;
  return `/trip/${tripId}`;
}

// "just now", "5m", "3h", "2d", then a date
export function timeAgo(iso) {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
