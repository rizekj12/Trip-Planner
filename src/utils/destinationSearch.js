// Search over the destination list (countries and territories), shared by the trip
// destination picker and the home-country menu
import { COUNTRIES, DESTINATION_ALIASES } from "../data/countriesAndCities";
import { countryNameForCode } from "./countryFlags";

// Lowercase, strip accents and periods: "Curaçao" -> "curacao", "U.S." -> "us"
export const normalize = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\./g, "").toLowerCase().trim();

const SEARCHABLE = COUNTRIES.map((name) => ({
  name,
  terms: [normalize(name), ...(DESTINATION_ALIASES[name] || []).map(normalize)],
}));

// Best matches first: exact, then starts-with, then a word starts with it, then (for 3+
// letters, so "pu" doesn't match "Republic") anywhere in the name
function rank(terms, q) {
  let best = Infinity;
  for (const t of terms) {
    if (t === q) best = Math.min(best, 0);
    else if (t.startsWith(q)) best = Math.min(best, 1);
    else if (t.split(/[\s-]+/).some((w) => w.startsWith(q))) best = Math.min(best, 2);
    else if (q.length >= 3 && t.includes(q)) best = Math.min(best, 3);
  }
  return best;
}

// Destination names matching `query`, best first (empty query -> [])
export function searchDestinations(query, limit = 8) {
  const q = normalize(query);
  if (!q) return [];
  return SEARCHABLE.map((d) => ({ name: d.name, score: rank(d.terms, q) }))
    .filter((d) => d.score < Infinity)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((d) => d.name);
}

// The destination `query` names exactly (including aliases like "usa"), or null
export function exactDestination(query) {
  const q = normalize(query);
  return q ? SEARCHABLE.find((d) => d.terms.includes(q))?.name ?? null : null;
}

// Best guess at the user's country from the browser's region (en-US -> United States)
export function guessHomeCountry() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    const lower = countryNameForCode(region);
    return lower ? COUNTRIES.find((c) => c.toLowerCase() === lower) ?? null : null;
  } catch {
    return null;
  }
}
