import { test, expect } from "vitest";
import { toTrip, foodSpotMaps, withoutLegacyKeys } from "./tripRow.js";

test("toTrip drops keys from before issue #31 and adds food spots when given", () => {
  const row = { id: "t", status: "ready", itinerary_data: { days: [], _form_data: {}, _status: "pending", _homebases: {} } };
  expect(toTrip(row)).toEqual({ id: "t", status: "ready", itinerary_data: { days: [], _form_data: {} } });
  expect(toTrip(row, [{ city: "Tokyo", spots: [{ name: "A" }], homebase: null, homebase_checked_at: "x" }])).toMatchObject({
    foodSpots: { Tokyo: [{ name: "A" }] },
    homebases: { Tokyo: null },
  });
  expect(toTrip(null)).toBeNull();
});

test("foodSpotMaps: empty spots and unchecked homebases are left out", () => {
  expect(foodSpotMaps([{ city: "Kyoto", spots: [], homebase: null, homebase_checked_at: null }])).toEqual({ foodSpots: {}, homebases: {} });
});

test("withoutLegacyKeys copes with nothing", () => {
  expect(withoutLegacyKeys(null)).toEqual({});
});
