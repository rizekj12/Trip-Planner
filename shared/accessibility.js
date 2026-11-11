// Accessibility and dietary needs a traveler can pick on their profile. Shared by the profile
// page and the server, which tells Claude about them when generating itineraries and food spots.

export const MOBILITY_AND_ACCESS_NEEDS = [
  "Limited walking",
  "Step-free access",
  "Wheelchair user",
  "Low vision",
  "Deaf or hard of hearing",
  "Service animal",
  "Sensory-friendly",
];

export const DIETARY_NEEDS = ["Gluten-free", "Vegetarian", "Vegan", "Nut allergy"];

export const ACCESSIBILITY_OPTIONS = [...MOBILITY_AND_ACCESS_NEEDS, ...DIETARY_NEEDS];

// Lines for a prompt describing the traveler's needs ("" when there are none). Only known
// options are included; the free-text notes are trimmed and capped. `traveler` is null for a
// user with no profiles row (they never saved the profile page), which means no needs (issue #106).
export function needsForPrompt(traveler, { dietaryOnly = false } = {}) {
  const { needs = [], notes = "" } = traveler || {};
  const known = (needs || []).filter((n) =>
    (dietaryOnly ? DIETARY_NEEDS : ACCESSIBILITY_OPTIONS).includes(n)
  );
  const note = dietaryOnly ? "" : String(notes || "").trim().slice(0, 500);
  if (!known.length && !note) return "";
  return [known.length && `- Needs: ${known.join(", ")}`, note && `- In their words: "${note}"`]
    .filter(Boolean)
    .join("\n");
}
