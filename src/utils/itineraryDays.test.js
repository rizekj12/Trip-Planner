import { describe, test, expect } from "vitest";
import { describeDays } from "./itineraryDays";

const days = (n) => Array.from({ length: n }, (_, i) => ({ key: `d${i + 1}`, date: `Day ${i + 1} (Somewhere)`, title: `Title ${i + 1}` }));
const tokyoKyoto = {
  cities: [
    { name: "Tokyo", checkIn: "2030-04-01", checkOut: "2030-04-04" },
    { name: "Kyoto", checkIn: "2030-04-04", checkOut: "2030-04-07" },
  ],
};

describe("describeDays", () => {
  test("dates count from the first check-in", () => {
    const out = describeDays(days(3), tokyoKyoto);
    expect(out.map((d) => d.iso)).toEqual(["2030-04-01", "2030-04-02", "2030-04-03"]);
    expect(out[0]).toMatchObject({ key: "d1", n: 1, shortDate: "Apr 1", longDate: "Mon, Apr 1", title: "Title 1" });
  });

  test("the city follows the stays; a travel day belongs to the new city; the last day to the final stay", () => {
    expect(describeDays(days(7), tokyoKyoto).map((d) => d.city)).toEqual([
      "Tokyo", "Tokyo", "Tokyo", "Kyoto", "Kyoto", "Kyoto", "Kyoto",
    ]);
  });

  test("cities entered out of order still give the right start date", () => {
    const reversed = { cities: [...tokyoKyoto.cities].reverse() };
    expect(describeDays(days(1), reversed)[0]).toMatchObject({ iso: "2030-04-01", city: "Tokyo" });
  });

  test("without dates, falls back to the AI's label", () => {
    const out = describeDays([{ key: "d1", date: "Day 1 (Lisbon)", title: "Arrival" }], { cities: [] });
    expect(out[0]).toMatchObject({ iso: null, shortDate: null, city: "Lisbon", title: "Arrival" });
  });

  test("a missing title gets a default", () => {
    expect(describeDays([{ key: "d1" }], tokyoKyoto)[0].title).toBe("Day 1");
  });
});
