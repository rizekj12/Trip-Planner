// Checking Claude's stop coordinates against Geoapify (issue #35)
import { describe, test, expect, vi, beforeEach } from "vitest";

const geo = vi.hoisted(() => ({ geocodeCity: vi.fn(), geocodePlace: vi.fn() }));
vi.mock("./geoapify.js", () => geo);
const { verifyStops, checkStop, distanceKm, CORRECT_AFTER_KM, FAR_KM } = await import("./verifyStops.js");

const TOKYO = [35.6812, 139.7671];
const SENSO_JI = [35.7148, 139.7967];

test("distanceKm", () => {
  expect(distanceKm(TOKYO, TOKYO)).toBe(0);
  expect(distanceKm(TOKYO, SENSO_JI)).toBeGreaterThan(4);
  expect(distanceKm(TOKYO, SENSO_JI)).toBeLessThan(5);
});

describe("checkStop", () => {
  test(`a match within ${CORRECT_AFTER_KM} km keeps Claude's pin`, () => {
    expect(checkStop([35.7149, 139.7968], { coords: SENSO_JI }, TOKYO)).toEqual({ coords: [35.7149, 139.7968], location: "verified" });
  });

  test("a match further away moves the pin", () => {
    expect(checkStop(TOKYO, { coords: SENSO_JI }, TOKYO)).toEqual({ coords: SENSO_JI, location: "corrected" });
  });

  test(`no match: kept unless it's over ${FAR_KM} km from the city, then unpinned`, () => {
    expect(checkStop(SENSO_JI, null, TOKYO)).toEqual({ coords: SENSO_JI, location: "unverified" });
    expect(checkStop([34.69, 135.5], null, TOKYO)).toEqual({ coords: null, location: "far" }); // Osaka
  });
});

describe("verifyStops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    geo.geocodeCity.mockResolvedValue({ lat: TOKYO[0], lon: TOKYO[1] });
  });
  const itinerary = () => ({
    spots: {
      senso_ji: { title: "Senso-ji", address: "2-3-1 Asakusa", city: "Tokyo", coords: TOKYO },
      made_up: { title: "Imaginary Tower", address: "", city: "Tokyo", coords: [34.69, 135.5] },
      flaky: { title: "Flaky Lookup", address: "", city: "Tokyo", coords: SENSO_JI },
    },
  });

  test("corrects, unpins and leaves alone as appropriate", async () => {
    geo.geocodePlace.mockImplementation(async (text) => {
      if (text.startsWith("Senso-ji")) return { coords: SENSO_JI };
      if (text.startsWith("Flaky")) throw new Error("network");
      return null;
    });
    const { spots } = await verifyStops(itinerary(), { country: "Japan" }, "key");
    expect(spots.senso_ji).toMatchObject({ coords: SENSO_JI, location: "corrected" });
    expect(spots.made_up).toMatchObject({ coords: null, location: "far" });
    // A failed lookup keeps Claude's pin and isn't marked
    expect(spots.flaky).toMatchObject({ coords: SENSO_JI });
    expect(spots.flaky.location).toBeUndefined();
    expect(geo.geocodePlace.mock.calls[0][0]).toBe("Senso-ji, Tokyo, Japan");
    expect(geo.geocodeCity).toHaveBeenCalledTimes(1);
  });

  test("without a Geoapify key or a findable city, pins are left as they are", async () => {
    expect((await verifyStops(itinerary(), { country: "Japan" }, undefined)).spots.senso_ji.coords).toEqual(TOKYO);
    geo.geocodeCity.mockResolvedValue(null);
    const { spots } = await verifyStops(itinerary(), { country: "Japan" }, "key");
    expect(spots.made_up.coords).toEqual([34.69, 135.5]);
    expect(geo.geocodePlace).not.toHaveBeenCalled();
  });
});
