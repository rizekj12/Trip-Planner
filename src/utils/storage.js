const KEY = "extraPicks_v1"; // { [dayKey]: Spot[] }

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function write(obj) {
  localStorage.setItem(KEY, JSON.stringify(obj));
  // Let the app know something changed so Day view refreshes
  window.dispatchEvent(new Event("extraPicksUpdated"));
}

export function getExtraPicks(dayKey) {
  const db = read();
  return db[dayKey] || [];
}

export function addExtraPick(dayKey, spot) {
  // store full spot object {title, coords, img, links, region}
  const db = read();
  const arr = db[dayKey] || [];
  // avoid dupes by title + coords
  const exists = arr.some(
    (s) => s.title === spot.title && String(s.coords) === String(spot.coords)
  );
  if (!exists) {
    db[dayKey] = [...arr, spot];
    write(db);
  }
}

export function removeExtraPick(dayKey, spot) {
  const db = read();
  const arr = db[dayKey] || [];
  db[dayKey] = arr.filter(
    (s) => !(s.title === spot.title && String(s.coords) === String(spot.coords))
  );
  write(db);
}

export function clearDayPicks(dayKey) {
  const db = read();
  delete db[dayKey];
  write(db);
}
