// The questionnaire's optional questions (issue #90): defaults, cleaning untrusted input, and
// how answers are worded for the itinerary prompt
import { describe, test, expect } from "vitest";
import { blankPreferences, normalizePreferences, preferenceLines, MAX_TEXT } from "./tripPreferences.js";

const set = (value) => ({ value, noPreference: false });

describe("normalizePreferences", () => {
  test("missing or garbage input gives the defaults: every question skipped", () => {
    for (const input of [undefined, null, "x", {}, []]) expect(normalizePreferences(input)).toEqual(blankPreferences());
    const blank = blankPreferences();
    const optional = Object.values(blank).filter((f) => f && typeof f === "object" && "noPreference" in f);
    expect(optional.length).toBeGreaterThan(20);
    expect(optional.every((f) => f.noPreference)).toBe(true);
  });

  test("keeps valid answers", () => {
    const p = normalizePreferences({
      arrivalTime: set("09:05"),
      travelers: set({ adults: 2, kids: 1 }),
      budget: set({ min: "100", max: 300, per: "day", currency: "JPY" }),
      interests: set({ food: 3, art: 1 }),
      splurgeSave: set({ splurge: ["food"], save: ["lodging", "food"] }),
      occasion: set({ type: "birthday", note: "  Sam turns 30  " }),
      dayTrips: set(false),
      pets: true,
      output: { costs: true },
    });
    expect(p.arrivalTime).toEqual(set("09:05"));
    expect(p.travelers.value).toEqual({ kids: 1, teens: 0, adults: 2, seniors: 0 });
    expect(p.budget.value).toEqual({ min: 100, max: 300, per: "day", currency: "JPY" });
    expect(p.interests.value).toEqual({ food: 3, art: 1 });
    // Can't both splurge and save on food
    expect(p.splurgeSave.value).toEqual({ splurge: ["food"], save: ["lodging"] });
    expect(p.occasion.value).toEqual({ type: "birthday", note: "Sam turns 30" });
    expect(p.dayTrips).toEqual(set(false));
    expect(p.pets).toBe(true);
    expect(p.output).toEqual({ costs: true, bookingLinks: false, rainyDay: false });
  });

  test("invalid answers fall back to no preference", () => {
    const p = normalizePreferences({
      arrivalTime: set("25:00"),
      groupType: set("pirates"),
      budget: set({ min: 500, max: 100 }),
      structure: set(9),
      interests: set({ food: 7, hacking: 3 }),
      transport: set(["teleport"]),
      travelers: set({ adults: 0 }),
    });
    for (const key of ["arrivalTime", "groupType", "budget", "structure", "interests", "transport", "travelers"]) {
      expect(p[key].noPreference).toBe(true);
    }
  });

  test("an answer with No preference ticked is ignored", () => {
    expect(normalizePreferences({ mustDo: { value: "Sumo", noPreference: true } }).mustDo.noPreference).toBe(true);
  });

  test("free text is trimmed and capped", () => {
    expect(normalizePreferences({ mustDo: set("x".repeat(MAX_TEXT + 50)) }).mustDo.value).toHaveLength(MAX_TEXT);
    expect(normalizePreferences({ mustDo: set("   ") }).mustDo.noPreference).toBe(true);
  });

  test("a Quick plan skips every detailed question", () => {
    const p = normalizePreferences({ planDetail: "quick", mustDo: set("Sumo"), pets: true, output: { costs: true } });
    expect(p).toEqual({ ...blankPreferences(), planDetail: "quick" });
  });
});

describe("preferenceLines", () => {
  test("one line per question, each explicit when skipped", () => {
    const lines = preferenceLines(undefined);
    expect(lines.length).toBe(23);
    expect(lines.every((l) => l.includes("no preference — "))).toBe(true);
  });

  test("yes/no extras appear only when ticked", () => {
    const lines = preferenceLines({ pets: true, openAfternoons: true, foodExperiences: true }).join("\n");
    expect(lines).toContain("pet-friendly");
    expect(lines).toContain("afternoons open");
    expect(lines).toContain("food tour or cooking class");
    expect(preferenceLines({}).join("\n")).not.toContain("pet");
  });

  test("budget wording for open-ended ranges", () => {
    expect(preferenceLines({ budget: set({ min: "", max: 2000, currency: "USD" }) }).join("\n")).toContain("- Budget: up to 2000 USD for the whole trip");
    expect(preferenceLines({ budget: set({ min: 80, max: "", per: "day", currency: "GBP" }) }).join("\n")).toContain("- Budget: from 80 GBP per day");
  });
});

describe("formPreferences", () => {
  test("fills in fields a draft doesn't have, keeping its answers as typed", async () => {
    const { formPreferences } = await import("./tripPreferences.js");
    const f = formPreferences({ planDetail: "quick", mustDo: { value: "Sumo", noPreference: true }, budget: { value: { min: 50 }, noPreference: false } });
    expect(f.planDetail).toBe("quick");
    expect(f.mustDo).toEqual({ value: "Sumo", noPreference: true });
    expect(f.budget).toEqual({ value: { min: 50, max: "", per: "total", currency: "USD" }, noPreference: false });
    expect(f.interests).toEqual({ value: {}, noPreference: true });
  });

  test("values of the wrong shape fall back to the default, so the form can render", async () => {
    const { formPreferences, blankPreferences } = await import("./tripPreferences.js");
    const f = formPreferences({ travelers: { value: "lots", noPreference: false }, transport: { value: "car", noPreference: false } });
    expect(f.travelers.value).toEqual(blankPreferences().travelers.value);
    expect(f.transport.value).toEqual([]);
  });
});

describe("preferenceSummary", () => {
  test("No preference for skipped questions, words for answers", async () => {
    const { preferenceSummary } = await import("./tripPreferences.js");
    const s = preferenceSummary({ interests: set({ food: 3 }), dayTrips: set(false), output: { rainyDay: true } });
    expect(s.interests[0]).toEqual(["Interests", "Food & drink (must)"]);
    expect(s.around).toContainEqual(["Day trips", "No"]);
    expect(s.around).toContainEqual(["Rainy-day backups", "Yes"]);
    expect(s.group.find(([l]) => l === "Budget")[1]).toBe("No preference");
  });
});
