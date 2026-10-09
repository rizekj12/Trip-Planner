export function yt(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    q
  )}`;
}
export function gmaps(q) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    q
  )}`;
}

// Straight-line distance in km between two [lat, lng] points (haversine)
export function distanceKm([lat1, lng1], [lat2, lng2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// Whether to show distances in miles (US English browsers) rather than km
export function usesMiles() {
  return ["en-US", "en-LR"].includes(navigator.language);
}

// "0.8 mi" for US English browsers, otherwise "350 m" / "2.4 km"
export function formatDistance(km) {
  if (usesMiles()) {
    const mi = km * 0.621371;
    return mi < 0.1 ? "<0.1 mi" : `${mi.toFixed(1)} mi`;
  }
  return km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(1)} km`;
}
