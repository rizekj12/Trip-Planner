// Photos for the dashboard, served from public/destinations (Unsplash License: free to use,
// no attribution required). Destinations without one get a flag tile instead.
const IMAGES = {
  "Japan": "/destinations/japan.jpg",
  "France": "/destinations/france.jpg",
  "Greece": "/destinations/greece.jpg",
  "Indonesia": "/destinations/indonesia.jpg",
  "Iceland": "/destinations/iceland.jpg",
  "Portugal": "/destinations/portugal.jpg",
  "United States": "/destinations/united-states.jpg",
  "Mexico": "/destinations/mexico.jpg",
  "Puerto Rico": "/destinations/puerto-rico.jpg",
};

export function destinationImage(country) {
  return IMAGES[country] || null;
}

// Destinations we can show with a photo, for "ideas" and the first-trip screen
export const FEATURED_DESTINATIONS = [
  { name: "Greece", tag: "Island hopping · Santorini" },
  { name: "Japan", tag: "Temples & neon · Kyoto, Tokyo" },
  { name: "Indonesia", tag: "Temples & beaches · Bali" },
  { name: "Iceland", tag: "Road trip · waterfalls & canyons" },
  { name: "Puerto Rico", tag: "Beaches · Old San Juan" },
  { name: "Portugal", tag: "Trams & tiles · Lisbon" },
  { name: "France", tag: "Classic city break · Paris" },
  { name: "Mexico", tag: "Food & color · Mexico City" },
].map((d) => ({ ...d, image: IMAGES[d.name] }));
