// Locating the traveler's hotel or homebase (issue #35): saved coordinates first, then the
// address, then (for hotels) the hotel's name. fetch is mocked.
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { locateHomebase } from "./geoapify.js";

const answers = [];
const fetchMock = vi.fn(async (url) => ({ json: async () => answers.shift()?.(url) ?? { results: [] } }));
const result = (extra) => ({ results: [{ lat: 35.69, lon: 139.70, result_type: "amenity", rank: { confidence: 0.9 }, formatted: "x", ...extra }] });

beforeEach(() => {
  answers.length = 0;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const hotel = (extra = {}) => ({ name: "Tokyo", homebaseType: "hotel", hotel: { name: "Hotel Gracery", address: "1-19-1 Kabukicho", ...extra } });

describe("locateHomebase", () => {
  test("uses coordinates saved in the questionnaire without any lookup", async () => {
    expect(await locateHomebase(hotel({ coords: [35.69, 139.70] }), "key")).toEqual({ type: "hotel", name: "Hotel Gracery", coords: [35.69, 139.70] });
    expect(await locateHomebase({ homebaseType: "custom", customAddress: "x", customCoords: [1, 2] }, "key")).toMatchObject({ name: "Your homebase", coords: [1, 2] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("geocodes the address when nothing is saved", async () => {
    answers.push(() => result({ result_type: "building" }));
    expect((await locateHomebase(hotel(), "key")).coords).toEqual([35.69, 139.70]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("for a hotel whose address can't be pinned, searches by its name around the city", async () => {
    answers.push(
      () => result({ rank: { confidence: 0.2 } }), // address: not precise enough
      (url) => (expect(decodeURIComponent(url)).toContain("text=Tokyo, Japan"), result({ lat: 35.68, lon: 139.76 })), // city center
      (url) => (expect(decodeURIComponent(url)).toContain("text=Hotel Gracery, Tokyo"), result({ lat: 35.6946, lon: 139.7016 }))
    );
    expect((await locateHomebase(hotel(), "key", { country: "Japan" })).coords).toEqual([35.6946, 139.7016]);
  });

  test("a custom address that can't be pinned stays unpinned (no name to search)", async () => {
    answers.push(() => result({ rank: { confidence: 0.1 } }));
    expect(await locateHomebase({ name: "Tokyo", homebaseType: "custom", customAddress: "somewhere" }, "key")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("no homebase, or no key and nothing saved", async () => {
    expect(await locateHomebase({ homebaseType: "none" }, "key")).toBeNull();
    expect(await locateHomebase(hotel(), undefined)).toBeNull();
  });
});
