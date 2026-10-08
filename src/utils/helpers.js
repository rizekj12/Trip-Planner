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
