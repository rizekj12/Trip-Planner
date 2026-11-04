// Editing an itinerary (issue #37): edits refer to stops by key, so they still apply to a
// newer copy of the trip
import { test, expect } from "vitest";
import { moveStop, reorderStops, moveStopToDay, removeStop, addStop, toggleDone, replaceDay, spotKeyFor, restoreStop } from "./itineraryEdits.js";

const trip = () => ({
  days: [
    { key: "d1", city: "Tokyo", title: "One", markers: ["a", "b", "c"], notes: [], done: ["b"] },
    { key: "d2", city: "Kyoto", title: "Two", markers: ["d"], notes: [], rainyDayBackup: "Museum" },
  ],
  spots: { a: { title: "A" }, b: { title: "B" }, c: { title: "C" }, d: { title: "D" } },
  events: [{ id: "e1" }],
});
const markers = (it, i) => it.days[i].markers;

test("moveStop moves within a day, clamped, and ignores stops on other days", () => {
  expect(markers(moveStop(trip(), "d1", "c", 0), 0)).toEqual(["c", "a", "b"]);
  expect(markers(moveStop(trip(), "d1", "a", 99), 0)).toEqual(["b", "c", "a"]);
  expect(moveStop(trip(), "d1", "d", 0)).toEqual(trip());
});

test("reorderStops keeps stops that weren't in the new order", () => {
  expect(markers(reorderStops(trip(), "d1", ["c", "a"]), 0)).toEqual(["c", "a", "b"]);
  expect(markers(reorderStops(trip(), "d1", ["d", "b", "b"]), 0)).toEqual(["b", "a", "c"]);
});

test("moveStopToDay moves a stop to the end of another day, and clears its tick", () => {
  const it = moveStopToDay(trip(), "d1", "b", "d2");
  expect(markers(it, 0)).toEqual(["a", "c"]);
  expect(markers(it, 1)).toEqual(["d", "b"]);
  expect(it.days[0].done).toEqual([]);
  expect(moveStopToDay(trip(), "d1", "zzz", "d2")).toEqual(trip());
  expect(moveStopToDay(trip(), "d1", "a", "d9")).toEqual(trip());
});

test("removeStop drops it from the day and from spots", () => {
  const it = removeStop(trip(), "d1", "b");
  expect(markers(it, 0)).toEqual(["a", "c"]);
  expect(it.spots.b).toBeUndefined();
  expect(it.days[0].done).toEqual([]);
  expect(it.events).toEqual([{ id: "e1" }]);
});

test("a spot two days share stays when it's removed from one", () => {
  const shared = trip();
  shared.days[1].markers.push("a");
  expect(removeStop(shared, "d1", "a").spots.a).toEqual({ title: "A" });
});

test("addStop adds a place with a unique key, search links and its map pin", () => {
  const { itinerary, key } = addStop(trip(), "d2", { title: "Fushimi Inari Taisha", address: "68 Fukakusa", coords: [34.96, 135.77] });
  expect(key).toBe("fushimi_inari_taisha");
  expect(markers(itinerary, 1)).toEqual(["d", key]);
  expect(itinerary.spots[key]).toMatchObject({ title: "Fushimi Inari Taisha", city: "Kyoto", coords: [34.96, 135.77], location: "verified" });
  expect(itinerary.spots[key].links.maps).toContain("Fushimi");
  expect(spotKeyFor("A", { a: {}, a_2: {} })).toBe("a_3");
  expect(spotKeyFor("Sensō-ji!", {})).toBe("senso_ji");
});

test("toggleDone ticks a stop off and back on", () => {
  expect(toggleDone(trip(), "d1", "a").days[0].done).toEqual(["b", "a"]);
  expect(toggleDone(trip(), "d1", "b").days[0].done).toEqual([]);
  expect(toggleDone(trip(), "d1", "d").days[0].done).toEqual(["b"]);
});

test("replaceDay swaps in a regenerated day and drops the old stops", () => {
  const it = replaceDay(trip(), "d2", { title: "New", notes: ["Tip"], rainyDayBackup: null, markers: ["e"] }, { e: { title: "E" } });
  expect(it.days[1]).toEqual({ key: "d2", city: "Kyoto", title: "New", notes: ["Tip"], markers: ["e"], done: [] });
  expect(it.spots.d).toBeUndefined();
  expect(it.spots.e).toEqual({ title: "E" });
  expect(it.days[0]).toEqual(trip().days[0]);
});

test("restoreStop undoes a removal", () => {
  const removed = removeStop(trip(), "d1", "b");
  const restored = restoreStop(removed, "d1", "b", { title: "B" }, 1);
  expect(markers(restored, 0)).toEqual(["a", "b", "c"]);
  expect(restored.spots.b).toEqual({ title: "B" });
});
