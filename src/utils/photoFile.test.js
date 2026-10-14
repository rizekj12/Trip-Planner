// Album photos: which trip day a photo belongs to (resizing needs a real browser's canvas)
import { test, expect } from "vitest";
import { guessDay, preparePhoto } from "./photoFile";

const DAYS = [{ n: 1, iso: "2030-04-01" }, { n: 2, iso: "2030-04-02" }];
const taken = (y, m, d, h = 12) => new File(["x"], "p.jpg", { type: "image/jpeg", lastModified: new Date(y, m - 1, d, h).getTime() });

test("guessDay matches the photo's local date to a trip day", () => {
  expect(guessDay(taken(2030, 4, 2, 23), DAYS)).toBe(2);
  expect(guessDay(taken(2030, 4, 1, 0), DAYS)).toBe(1);
  expect(guessDay(taken(2030, 5, 1), DAYS)).toBeNull();
  expect(guessDay(taken(2030, 4, 1), [])).toBeNull();
});

test("preparePhoto only takes photos", async () => {
  await expect(preparePhoto(new File(["x"], "notes.pdf", { type: "application/pdf" }))).rejects.toThrow("isn't a photo");
});
