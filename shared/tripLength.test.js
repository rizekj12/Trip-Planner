// Run with: npm test
import { test } from "vitest";
import assert from "node:assert/strict";
import { tripLengthDays, isAllowedTripLength, addDays, latestCheckOut, MAX_TRIP_DAYS } from "./tripLength.js";

const city = (checkIn, checkOut) => ({ name: "City", checkIn, checkOut });

test("single city: nights between check-in and check-out", () => {
  assert.equal(tripLengthDays([city("2026-11-03", "2026-11-10")]), 7);
  assert.equal(tripLengthDays([city("2026-11-03", "2026-11-04")]), 1);
});

test("multi-city: earliest check-in to latest check-out", () => {
  const cities = [city("2026-04-01", "2026-04-05"), city("2026-04-05", "2026-04-09"), city("2026-04-09", "2026-04-12")];
  assert.equal(tripLengthDays(cities), 11);
});

test("cities entered out of order give the same length", () => {
  const inOrder = [city("2026-04-01", "2026-04-05"), city("2026-04-05", "2026-04-09")];
  const reversed = [...inOrder].reverse();
  assert.equal(tripLengthDays(reversed), 8);
  assert.equal(tripLengthDays(reversed), tripLengthDays(inOrder));
});

test("overlapping or gapped cities still span earliest to latest", () => {
  assert.equal(tripLengthDays([city("2026-04-01", "2026-04-10"), city("2026-04-03", "2026-04-06")]), 9);
  assert.equal(tripLengthDays([city("2026-04-01", "2026-04-03"), city("2026-04-07", "2026-04-09")]), 8);
});

test("missing or invalid dates", () => {
  assert.equal(tripLengthDays([]), null);
  assert.equal(tripLengthDays(undefined), null);
  assert.equal(tripLengthDays([city("2026-04-01", "")]), null);
  assert.equal(tripLengthDays([city("", "2026-04-05")]), null);
  assert.equal(tripLengthDays([city("not a date", "2026-04-05")]), null);
  // A partially filled second city doesn't change the length
  assert.equal(tripLengthDays([city("2026-04-01", "2026-04-05"), city("2026-04-05", "")]), 4);
});

test("check-out before check-in is negative (and not allowed)", () => {
  const days = tripLengthDays([city("2026-04-10", "2026-04-05")]);
  assert.equal(days, -5);
  assert.equal(isAllowedTripLength(days), false);
});

test("crossing month, year and leap day boundaries", () => {
  assert.equal(tripLengthDays([city("2026-12-28", "2027-01-04")]), 7);
  assert.equal(tripLengthDays([city("2028-02-27", "2028-03-01")]), 3); // 2028 is a leap year
  assert.equal(tripLengthDays([city("2027-02-27", "2027-03-01")]), 2);
});

// Daylight-saving changes make some local days 23 or 25 hours long. Lengths must be whole
// days whatever the time zone of the browser or server.
const DST_TRIPS = [
  [city("2026-03-06", "2026-03-10"), 4], // US clocks go forward Mar 8
  [city("2026-10-30", "2026-11-03"), 4], // US clocks go back Nov 1
  [city("2026-03-27", "2026-03-31"), 4], // Europe forward Mar 29
  [city("2026-10-23", "2026-10-27"), 4], // Europe back Oct 25
  [city("2026-04-03", "2026-04-07"), 4], // New Zealand back Apr 5
];
for (const tz of ["UTC", "America/New_York", "Europe/London", "Pacific/Auckland", "Asia/Kolkata", "America/Los_Angeles"]) {
  test(`daylight-saving boundaries in ${tz}`, () => {
    const saved = process.env.TZ;
    process.env.TZ = tz;
    try {
      for (const [c, expected] of DST_TRIPS) assert.equal(tripLengthDays([c]), expected, `${c.checkIn} → ${c.checkOut}`);
      assert.equal(addDays("2026-03-01", MAX_TRIP_DAYS), "2026-03-15");
      assert.equal(addDays("2026-10-25", 1), "2026-10-26");
    } finally {
      process.env.TZ = saved;
    }
  });
}

test("allowed lengths are 1 to MAX_TRIP_DAYS", () => {
  assert.equal(isAllowedTripLength(null), false);
  assert.equal(isAllowedTripLength(0), false);
  assert.equal(isAllowedTripLength(1), true);
  assert.equal(isAllowedTripLength(MAX_TRIP_DAYS), true);
  assert.equal(isAllowedTripLength(MAX_TRIP_DAYS + 1), false);
});

test("latestCheckOut is the earliest check-in + MAX_TRIP_DAYS, in any order", () => {
  assert.equal(latestCheckOut([]), null);
  assert.equal(latestCheckOut([city("2026-04-09", ""), city("2026-04-01", "")]), addDays("2026-04-01", MAX_TRIP_DAYS));
  // A trip ending on that date is exactly the maximum length
  const longest = [city("2026-04-01", latestCheckOut([city("2026-04-01", "")]))];
  assert.equal(tripLengthDays(longest), MAX_TRIP_DAYS);
});
