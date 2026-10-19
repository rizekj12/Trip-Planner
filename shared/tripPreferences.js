// The questionnaire's detailed, optional questions (issue #90), shared by the app (questions
// and review) and the server (the itinerary prompt). Stored on the trip as
// formData.preferences.
//
// Optional questions are { value, noPreference }: "No preference" (the default) means the
// traveler skipped it, and the prompt says so explicitly. Yes/no extras are plain booleans,
// mentioned only when ticked. normalizePreferences() fills in anything missing (trips made
// before these questions existed) and drops anything invalid (the server can't trust the
// browser), so every reader can rely on the full shape.

export const PLAN_DETAIL = ["quick", "detailed"];

// [id, label] lists
export const GROUP_TYPES = [["solo", "Solo"], ["couple", "Couple"], ["friends", "Friends"], ["family", "Family"], ["business", "Business"]];
export const AGE_GROUPS = [["kids", "Kids (0–12)"], ["teens", "Teens (13–17)"], ["adults", "Adults"], ["seniors", "Seniors (65+)"]];
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "MXN", "CHF", "CNY", "KRW", "INR", "BRL"];
export const BUDGET_PARTS = [["lodging", "Lodging"], ["food", "Food"], ["activities", "Activities"], ["transport", "Local transport"]];
export const INTERESTS = [
  ["history", "History & museums"], ["food", "Food & drink"], ["nature", "Nature & hiking"], ["beaches", "Beaches"],
  ["nightlife", "Nightlife"], ["shopping", "Shopping"], ["art", "Art"], ["architecture", "Architecture"],
  ["sports", "Sports"], ["wellness", "Wellness & spa"], ["photography", "Photography spots"], ["markets", "Local markets"],
  ["music", "Live music"], ["theme_parks", "Theme parks"],
];
export const INTEREST_WEIGHTS = [[1, "Some"], [2, "A lot"], [3, "Must"]];
export const DINING_STYLES = [["street", "Street food"], ["casual", "Casual"], ["fine", "Fine dining"], ["mix", "A mix"]];
export const LODGING_TYPES = [["hotel", "Hotel"], ["hostel", "Hostel"], ["rental", "Airbnb / rental"], ["resort", "Resort"]];
export const AREA_VIBES = [["central", "Central"], ["quiet", "Quiet"], ["nightlife", "Near nightlife"]];
export const TRANSPORT_MODES = [["walking", "Walking"], ["transit", "Public transit"], ["rideshare", "Taxis & rideshare"], ["car", "Rental car"]];
export const LANGUAGE_COMFORT = [["english", "Prefer English-friendly spots"], ["any", "Happy to get by with gestures"]];
export const OCCASIONS = [["honeymoon", "Honeymoon"], ["birthday", "Birthday"], ["anniversary", "Anniversary"], ["graduation", "Graduation"], ["other", "Something else"]];
export const WEATHER = [["heat", "Heat"], ["rain", "Rain"], ["cold", "Cold"]];
// 1–5 scales: [low label, high label]
export const SCALES = {
  structure: ["Fully scheduled", "Loose, with free time"],
  touristy: ["Famous must-sees", "Off the beaten path"],
  foodAdventure: ["Stick to the familiar", "Try everything"],
};
// Max comfortable walking per day, by level
export const WALKING = [[1, "Under 3 km (2 mi)"], [2, "3–6 km (2–4 mi)"], [3, "6–10 km (4–6 mi)"], [4, "10+ km (6+ mi)"]];

export const MAX_TEXT = 500;
export const MAX_TRAVELERS_PER_GROUP = 20;

const ids = (list) => list.map(([id]) => id);
const np = (value) => ({ value, noPreference: true });

// A fresh set of answers: everything skipped
export function blankPreferences() {
  return {
    planDetail: "detailed",
    arrivalTime: np(""),
    departureTime: np(""),
    homeAirport: np(""),
    groupType: np(null),
    travelers: np({ kids: 0, teens: 0, adults: 2, seniors: 0 }),
    pets: false,
    budget: np({ min: "", max: "", per: "total", currency: "USD" }),
    budgetCovers: np([]),
    splurgeSave: np({ splurge: [], save: [] }),
    structure: np(3),
    openAfternoons: false,
    interests: np({}),
    touristy: np(3),
    mustDo: np(""),
    avoid: np(""),
    diningStyle: np(null),
    foodAdventure: np(3),
    foodExperiences: false,
    lodgingType: np(null),
    areaVibe: np(null),
    transport: np([]),
    maxWalking: np(2),
    dayTrips: np(true),
    language: np(null),
    occasion: np({ type: null, note: "" }),
    weather: np([]),
    output: { costs: false, bookingLinks: false, rainyDay: false },
  };
}

// The questionnaire's working copy: every field present (drafts saved before issue #90, or
// partway through, get the defaults), but in-progress answers kept as typed, including ones
// set aside with "No preference". Values of the wrong shape fall back to the default so the
// form can always render them.
export function formPreferences(raw) {
  const blank = blankPreferences();
  if (!raw || typeof raw !== "object") return blank;
  const sameShape = (a, b) => typeof a === typeof b && Array.isArray(a) === Array.isArray(b) && (a === null) === (b === null);
  const out = { ...blank };
  for (const [key, def] of Object.entries(blank)) {
    const r = raw[key];
    if (r === undefined) continue;
    if (key === "planDetail") out[key] = PLAN_DETAIL.includes(r) ? r : def;
    else if (typeof def === "boolean") out[key] = r === true;
    else if (key === "output") out[key] = Object.fromEntries(Object.keys(def).map((k) => [k, r?.[k] === true]));
    else if (r && typeof r === "object" && "noPreference" in r) {
      const isRecord = def.value && typeof def.value === "object" && !Array.isArray(def.value);
      // Single-choice fields start as null and hold an option id
      const value =
        def.value === null ? (typeof r.value === "string" ? r.value : null)
        : !sameShape(r.value, def.value) ? def.value
        : isRecord ? { ...def.value, ...r.value }
        : r.value;
      out[key] = { value, noPreference: r.noPreference !== false };
    }
  }
  return out;
}

// ---- Validation (each returns the clean value, or undefined when invalid) ----

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT) : undefined);
const oneOf = (list) => (v) => (ids(list).includes(v) ? v : undefined);
const someOf = (list) => (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => ids(list).includes(x)))] : undefined);
const nonEmpty = (list) => (list?.length ? list : undefined);
const level = (max) => (v) => (Number.isInteger(v) && v >= 1 && v <= max ? v : undefined);
const count = (v) => (Number.isInteger(v) && v >= 0 && v <= MAX_TRAVELERS_PER_GROUP ? v : 0);
const amount = (v) => {
  if (v === "" || v == null) return "";
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n) : undefined;
};

const VALIDATE = {
  arrivalTime: (v) => (TIME_RE.test(v) ? v : undefined),
  departureTime: (v) => (TIME_RE.test(v) ? v : undefined),
  homeAirport: (v) => text(v)?.slice(0, 100) || undefined,
  groupType: oneOf(GROUP_TYPES),
  travelers: (v) => {
    if (!v || typeof v !== "object") return undefined;
    const clean = Object.fromEntries(ids(AGE_GROUPS).map((k) => [k, count(v[k])]));
    return Object.values(clean).some(Boolean) ? clean : undefined;
  },
  budget: (v) => {
    if (!v || typeof v !== "object") return undefined;
    const min = amount(v.min);
    const max = amount(v.max);
    if (min === undefined || max === undefined || (min === "" && max === "")) return undefined;
    if (min !== "" && max !== "" && min > max) return undefined;
    return { min, max, per: v.per === "day" ? "day" : "total", currency: CURRENCIES.includes(v.currency) ? v.currency : "USD" };
  },
  budgetCovers: (v) => nonEmpty(someOf(BUDGET_PARTS)(v)),
  splurgeSave: (v) => {
    if (!v || typeof v !== "object") return undefined;
    const splurge = someOf(BUDGET_PARTS)(v.splurge) || [];
    const save = (someOf(BUDGET_PARTS)(v.save) || []).filter((x) => !splurge.includes(x));
    return splurge.length || save.length ? { splurge, save } : undefined;
  },
  structure: level(5),
  interests: (v) => {
    if (!v || typeof v !== "object") return undefined;
    const clean = Object.fromEntries(ids(INTERESTS).filter((k) => level(3)(v[k])).map((k) => [k, v[k]]));
    return Object.keys(clean).length ? clean : undefined;
  },
  touristy: level(5),
  mustDo: (v) => text(v) || undefined,
  avoid: (v) => text(v) || undefined,
  diningStyle: oneOf(DINING_STYLES),
  foodAdventure: level(5),
  lodgingType: oneOf(LODGING_TYPES),
  areaVibe: oneOf(AREA_VIBES),
  transport: (v) => nonEmpty(someOf(TRANSPORT_MODES)(v)),
  maxWalking: level(WALKING.length),
  dayTrips: (v) => (typeof v === "boolean" ? v : undefined),
  language: oneOf(LANGUAGE_COMFORT),
  occasion: (v) => {
    if (!v || typeof v !== "object") return undefined;
    const type = oneOf(OCCASIONS)(v.type) || null;
    const note = text(v.note)?.slice(0, 200) || "";
    return type || note ? { type: type || "other", note } : undefined;
  },
  weather: (v) => nonEmpty(someOf(WEATHER)(v)),
};

// Every field, with defaults for anything missing and "No preference" for anything invalid.
// A Quick plan skips the detailed questions, so its answers are all "No preference".
export function normalizePreferences(raw) {
  const blank = blankPreferences();
  const input = raw && typeof raw === "object" ? raw : {};
  const planDetail = PLAN_DETAIL.includes(input.planDetail) ? input.planDetail : blank.planDetail;
  const out = { ...blank, planDetail };
  if (planDetail === "quick") return out;

  for (const [key, validate] of Object.entries(VALIDATE)) {
    const field = input[key];
    if (!field || typeof field !== "object" || field.noPreference !== false) continue;
    const value = validate(field.value);
    if (value !== undefined) out[key] = { value, noPreference: false };
  }
  for (const key of ["pets", "openAfternoons", "foodExperiences"]) out[key] = input[key] === true;
  out.output = Object.fromEntries(Object.keys(blank.output).map((k) => [k, input.output?.[k] === true]));
  return out;
}

// Keeps a value the traveler typed while they still have "No preference" unticked: the form
// keeps raw input, and normalizePreferences decides what counts
export const answered = (field) => !!field && field.noPreference === false;

const labelOf = (list, id) => list.find(([k]) => k === id)?.[1] ?? id;
const labels = (list, values) => values.map((v) => labelOf(list, v).toLowerCase()).join(", ");
const scale = (key, v) => {
  const [low, high] = SCALES[key];
  return v <= 2 ? `${low.toLowerCase()} (${v}/5)` : v >= 4 ? `${high.toLowerCase()} (${v}/5)` : `in between (${v}/5)`;
};

// One line per question, worded for the itinerary prompt. Skipped questions are said
// explicitly ("no preference — ...") so Claude treats them the same way every time.
export function preferenceLines(raw) {
  const p = normalizePreferences(raw);
  const line = (label, field, describe, fallback) =>
    `- ${label}: ${answered(field) ? describe(field.value) : `no preference — ${fallback}`}`;

  const lines = [
    line("Arrival time on day 1", p.arrivalTime, (v) => `${v} local time; plan nothing before they could reasonably arrive`, "assume a midday arrival and keep day 1 light"),
    line("Departure time on the last day", p.departureTime, (v) => `${v} local time; leave time to get there`, "assume an afternoon departure and keep the last day light"),
    line("Starting city / home airport", p.homeAirport, (v) => v, "not relevant to the plan"),
    line("Group", p.groupType, (v) => labelOf(GROUP_TYPES, v), "plan for a general group of adults"),
    line("Travelers", p.travelers, (v) => AGE_GROUPS.filter(([k]) => v[k]).map(([k, l]) => `${v[k]} ${l.replace(/ \(.*\)/, "").toLowerCase()}`).join(", "), "assume two adults"),
    line(
      "Budget",
      p.budget,
      (v) => {
        const range = v.min !== "" && v.max !== "" ? `${v.min}–${v.max}` : v.min !== "" ? `from ${v.min}` : `up to ${v.max}`;
        return `${range} ${v.currency} ${v.per === "day" ? "per day" : "for the whole trip"}`;
      },
      "choose sensible mid-range options"
    ),
    line("The budget covers", p.budgetCovers, (v) => labels(BUDGET_PARTS, v), "assume it covers everything on the trip"),
    line(
      "Splurge vs. save",
      p.splurgeSave,
      (v) => [v.splurge.length && `splurge on ${labels(BUDGET_PARTS, v.splurge)}`, v.save.length && `save on ${labels(BUDGET_PARTS, v.save)}`].filter(Boolean).join("; "),
      "keep spending even across the trip"
    ),
    line("Day structure", p.structure, (v) => scale("structure", v), "a balanced mix of planned stops and free time"),
    line(
      "Interests",
      p.interests,
      (v) =>
        Object.entries(v)
          .sort((a, b) => b[1] - a[1])
          .map(([k, w]) => `${labelOf(INTERESTS, k).toLowerCase()} (${labelOf(INTEREST_WEIGHTS, w).toLowerCase()})`)
          .join(", "),
      "pick a varied mix of the destination's highlights"
    ),
    line("Touristy vs. off the beaten path", p.touristy, (v) => scale("touristy", v), "mix famous sights with some local spots"),
    line("Must-dos", p.mustDo, (v) => `"${v}" (include these)`, "none given"),
    line("Avoid", p.avoid, (v) => `"${v}"`, "nothing in particular"),
    line("Dining style", p.diningStyle, (v) => labelOf(DINING_STYLES, v).toLowerCase(), "a mix of casual and local favorites"),
    line("Food adventurousness", p.foodAdventure, (v) => scale("foodAdventure", v), "moderately adventurous"),
    line("Lodging they'd like, where not booked yet", p.lodgingType, (v) => labelOf(LODGING_TYPES, v).toLowerCase(), "no constraint"),
    line("Area to stay in", p.areaVibe, (v) => labelOf(AREA_VIBES, v).toLowerCase(), "central and convenient"),
    line("Getting around", p.transport, (v) => labels(TRANSPORT_MODES, v), "public transit and walking where practical"),
    line("Comfortable walking per day", p.maxWalking, (v) => labelOf(WALKING, v), "a moderate amount, about 3–6 km (2–4 mi)"),
    line("Day trips outside the cities", p.dayTrips, (v) => (v ? "welcome" : "no, stay within the cities"), "fine if one is clearly worth it"),
    line("Language", p.language, (v) => labelOf(LANGUAGE_COMFORT, v).toLowerCase(), "no constraint"),
    line("Special occasion", p.occasion, (v) => [labelOf(OCCASIONS, v.type), v.note && `"${v.note}"`].filter(Boolean).join(": ") + " (make it feel special)", "none"),
    line("Weather they're fine with", p.weather, (v) => labels(WEATHER, v), "plan for typical weather and include indoor options when it's likely to be bad"),
  ];
  if (p.pets) lines.push("- Traveling with a pet: choose pet-friendly places and note where pets aren't allowed");
  if (p.openAfternoons) lines.push("- Leave some afternoons open and unplanned, for spontaneity");
  if (p.foodExperiences) lines.push("- Interested in a food tour or cooking class: include one if available");
  return lines;
}

// For the review step: [label, text] rows per questionnaire step id. Skipped questions read
// "No preference"; yes/no extras are listed only when ticked.
export function preferenceSummary(raw) {
  const p = normalizePreferences(raw);
  const NONE = "No preference";
  const show = (field, describe) => (answered(field) ? describe(field.value) : NONE);
  const list = (options, values) => values.map((v) => labelOf(options, v)).join(", ");
  const level5 = (key, v) => (v <= 2 ? SCALES[key][0] : v >= 4 ? SCALES[key][1] : "In between");
  const extras = (pairs) => pairs.filter(([, on]) => on).map(([text]) => [text, "Yes"]);

  return {
    where: [
      ["Arrival time", show(p.arrivalTime, (v) => v)],
      ["Departure time", show(p.departureTime, (v) => v)],
      ["Coming from", show(p.homeAirport, (v) => v)],
    ],
    stay: [
      ["Kind of place (not booked)", show(p.lodgingType, (v) => labelOf(LODGING_TYPES, v))],
      ["Area", show(p.areaVibe, (v) => labelOf(AREA_VIBES, v))],
    ],
    group: [
      ["Group", show(p.groupType, (v) => labelOf(GROUP_TYPES, v))],
      ["Travelers", show(p.travelers, (v) => AGE_GROUPS.filter(([k]) => v[k]).map(([k, l]) => `${v[k]} ${l.replace(/ \(.*\)/, "").toLowerCase()}`).join(", "))],
      [
        "Budget",
        show(p.budget, (v) => {
          const range = v.min !== "" && v.max !== "" ? `${v.min}–${v.max}` : v.min !== "" ? `From ${v.min}` : `Up to ${v.max}`;
          return `${range} ${v.currency} ${v.per === "day" ? "per day" : "total"}`;
        }),
      ],
      ["Budget covers", show(p.budgetCovers, (v) => list(BUDGET_PARTS, v))],
      ["Splurge / save", show(p.splurgeSave, (v) => [v.splurge.length && `Splurge: ${list(BUDGET_PARTS, v.splurge)}`, v.save.length && `Save: ${list(BUDGET_PARTS, v.save)}`].filter(Boolean).join(" · "))],
      ...extras([["Traveling with a pet", p.pets]]),
    ],
    style: [
      ["Day structure", show(p.structure, (v) => level5("structure", v))],
      ...extras([["Room for spontaneity", p.openAfternoons]]),
    ],
    interests: [
      ["Interests", show(p.interests, (v) => Object.entries(v).sort((a, b) => b[1] - a[1]).map(([k, w]) => `${labelOf(INTERESTS, k)} (${labelOf(INTEREST_WEIGHTS, w).toLowerCase()})`).join(", "))],
      ["Sights", show(p.touristy, (v) => level5("touristy", v))],
      ["Must-dos", show(p.mustDo, (v) => v)],
      ["Avoid", show(p.avoid, (v) => v)],
      ["Dining style", show(p.diningStyle, (v) => labelOf(DINING_STYLES, v))],
      ["Food", show(p.foodAdventure, (v) => level5("foodAdventure", v))],
      ...extras([["Food tour or cooking class", p.foodExperiences]]),
    ],
    around: [
      ["Getting around", show(p.transport, (v) => list(TRANSPORT_MODES, v))],
      ["Walking per day", show(p.maxWalking, (v) => labelOf(WALKING, v))],
      ["Day trips", show(p.dayTrips, (v) => (v ? "Yes" : "No"))],
      ["Language", show(p.language, (v) => labelOf(LANGUAGE_COMFORT, v))],
      ["Special occasion", show(p.occasion, (v) => [labelOf(OCCASIONS, v.type), v.note].filter(Boolean).join(": "))],
      ["Weather", show(p.weather, (v) => list(WEATHER, v))],
      ...extras([["Estimated costs", p.output.costs], ["Booking links", p.output.bookingLinks], ["Rainy-day backups", p.output.rainyDay]]),
    ],
  };
}
