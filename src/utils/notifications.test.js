// Notification text names a trip in the reader's own country after its cities
import { test, expect, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));
const { notificationText } = await import("./notifications");

test("a home trip is named after its cities", () => {
  const n = { type: "itinerary_ready", data: { destination: "United States", cities: ["New York"] } };
  expect(notificationText(n, "United States")).toBe("Your itinerary for New York is ready");
  expect(notificationText(n, "Canada")).toBe("Your itinerary for United States is ready");
});

test("notifications saved before cities were included keep the country", () => {
  const n = { type: "join_request", data: { name: "Sam", destination: "United States" } };
  expect(notificationText(n, "United States")).toBe("Sam would like to join your trip to United States");
});
