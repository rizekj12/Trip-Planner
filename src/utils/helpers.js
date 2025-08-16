import L from "leaflet";

export function yt(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
export function gmaps(q) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

// Leaflet numbered divIcon
export function numberedIcon(num, color = "#4f46e5") {
  return L.divIcon({
    html: `
      <div style="
        background:${color};
        color:white;
        border-radius:50%;
        width:28px;height:28px;
        display:flex;align-items:center;justify-content:center;
        font-size:14px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.35);
      ">${num}</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

// Date helpers
const TRIP_YEAR = 2025;
export function toDateObj(label) {
  const parts = label.split(" ");
  const month = parts[1];
  const day = parts[2];
  return new Date(`${month} ${day}, ${TRIP_YEAR} 00:00:00`);
}
export function tabForToday(daysArr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const withDates = daysArr.map(d => ({ key: d.key, date: toDateObj(d.date) }));
  const exact = withDates.find(d => d.date.getTime() === today.getTime());
  if (exact) return exact.key;
  const first = withDates[0].date, last = withDates[withDates.length-1].date;
  if (today < first) return withDates[0].key;
  if (today > last) return withDates[withDates.length-1].key;
  const upcoming = withDates.find(d => d.date >= today);
  return (upcoming && upcoming.key) || withDates[0].key;
}
