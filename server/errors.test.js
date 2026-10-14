import { test, expect } from "vitest";
import { UserFacingError, publicMessage } from "./errors.js";

test("messages written for travelers are passed through", () => {
  expect(publicMessage(new UserFacingError("The itinerary was too long."))).toBe("The itinerary was too long.");
});

test("internal errors are replaced with the fallback", () => {
  const dbError = new Error('duplicate key value violates unique constraint "trips_pkey"');
  expect(publicMessage(dbError, "Couldn't save.")).toBe("Couldn't save.");
  expect(publicMessage(dbError)).toBe("Something went wrong. Please try again.");
  expect(publicMessage(undefined, "Nope")).toBe("Nope");
});
