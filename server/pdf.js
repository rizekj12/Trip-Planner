// Builds an offline-friendly PDF of a trip: cover, one page per day (map, stops, tips,
// hotel), up to 10 local events, and up to 10 food spots per city.
import PDFDocument from "pdfkit";
import { staticMapImage } from "./geoapify.js";

const MAX_EVENTS = 10;
const MAX_FOOD_SPOTS = 10;

const COLORS = {
  text: "#0f172a",
  muted: "#64748b",
  accent: "#4f46e5",
  marker: "#7c3aed",
  rule: "#e2e8f0",
};

// The built-in PDF fonts only cover Western European characters. Swap common typographic
// marks for plain ones and drop anything else (e.g. CJK) so it can't print as garbage.
function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Straight-line distance, matching the app's estimate: "0.8 mi" or "350 m" / "2.4 km"
function formatDistance([lat1, lng1], [lat2, lng2], miles) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  const km = 6371 * 2 * Math.asin(Math.sqrt(a));
  if (miles) return `${Math.max(0.1, km * 0.621371).toFixed(1)} mi`;
  return km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(1)} km`;
}

// Flights and hotels with confirmation codes, mirroring src/utils/reservations.js:
// questionnaire hotels (per city) plus anything added in the Reservations tab
function reservationsFor(form) {
  const flights = [...(form.reservations?.flights || [])].sort((a, b) =>
    `${a.date || "9999"} ${a.time || ""}`.localeCompare(`${b.date || "9999"} ${b.time || ""}`)
  );
  const hotels = [
    ...(form.cities || [])
      .filter((c) => c.homebaseType === "hotel" && c.hotel?.name)
      .map((c) => ({ ...c.hotel, checkIn: c.checkIn, checkOut: c.checkOut })),
    ...(form.reservations?.hotels || []),
  ];
  return { flights, hotels };
}

function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Stops (numbered) and hotel for one day, in the shape staticMapImage expects
function dayMarkers(day, spots) {
  const stops = (day.markers || []).map((key) => spots[key]).filter(Boolean);
  const markers = stops
    .map((s, i) => s.coords && { coords: s.coords, label: String(i + 1) })
    .filter(Boolean);
  if (day.hotel?.coords) markers.push({ coords: day.hotel.coords, hotel: true });
  return { stops, markers };
}

export async function buildTripPdf(trip, { geoapifyKey, miles = false }) {
  const { _form_data: form = {}, _food_spots: foodSpots = {}, _homebases: homebases = {}, ...itinerary } =
    trip.itinerary_data || {};
  const days = itinerary.days || [];
  const spots = itinerary.spots || {};
  const country = form.country || trip.destination || "";

  // Fetch every day's map up front (rate-limited), so a slow map can't stall the PDF midway
  const dayData = days.map((day) => dayMarkers(day, spots));
  const maps = await Promise.all(dayData.map(({ markers }) => staticMapImage(markers, geoapifyKey)));

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 54, bottom: 60, left: 54, right: 54 },
    bufferPages: true,
    info: { Title: clean(`${country} trip itinerary`), Creator: "Trip Planner" },
  });
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const heading = (text, size = 18) =>
    doc.font("Helvetica-Bold").fontSize(size).fillColor(COLORS.text).text(clean(text));
  const label = (text) =>
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.accent).text(clean(text).toUpperCase(), { characterSpacing: 0.5 });
  const body = (text, opts = {}) =>
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.text).text(clean(text), opts);
  const muted = (text, opts = {}) =>
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted).text(clean(text), opts);
  const rule = () => {
    doc.moveDown(0.6);
    doc.strokeColor(COLORS.rule).lineWidth(0.8)
      .moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + width, doc.y).stroke();
    doc.moveDown(0.6);
  };
  // Start a new page if fewer than `needed` points are left
  const ensureSpace = (needed) => {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };
  // Numbered list item: colored number, bold title, then detail lines
  const numbered = (n, title, lines) => {
    ensureSpace(48);
    const top = doc.y;
    doc.circle(doc.page.margins.left + 8, top + 6, 8).fill(COLORS.marker);
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff")
      .text(String(n), doc.page.margins.left, top + 2.5, { width: 16, align: "center" });
    const x = doc.page.margins.left + 24;
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COLORS.text).text(clean(title), x, top, { width: width - 24 });
    for (const [line, style] of lines) {
      if (!clean(line)) continue;
      doc.font("Helvetica").fontSize(style === "muted" ? 8.8 : 9.5)
        .fillColor(style === "muted" ? COLORS.muted : COLORS.text)
        .text(clean(line), x, doc.y + 1, { width: width - 24 });
    }
    doc.x = doc.page.margins.left;
    doc.moveDown(0.7);
  };

  // ---- Cover
  const cities = (form.cities || []).filter((c) => c.name);
  label("Trip itinerary");
  doc.moveDown(0.3);
  heading(country ? `Your ${country} Trip` : "Your Trip", 30);
  doc.moveDown(0.3);
  if (cities.length) body(cities.map((c) => c.name).join("  -  "), { lineGap: 2 });
  const first = cities[0]?.checkIn;
  const last = cities[cities.length - 1]?.checkOut;
  if (first && last) muted(`${formatDate(first)} - ${formatDate(last)}  |  ${days.length} days`);
  rule();

  label("Where you're staying");
  doc.moveDown(0.3);
  for (const c of cities) {
    const stay =
      c.homebaseType === "hotel" ? `${c.hotel?.name || "Hotel"}, ${c.hotel?.address || ""}`
      : c.homebaseType === "custom" ? c.customAddress
      : "No homebase set";
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.text).text(`${clean(c.name)}: `, { continued: true });
    body(stay);
    if (c.checkIn && c.checkOut) muted(`${formatDate(c.checkIn)} - ${formatDate(c.checkOut)}`);
    doc.moveDown(0.4);
  }
  rule();

  label("Contents");
  doc.moveDown(0.3);
  const { flights, hotels } = reservationsFor(form);
  if (flights.length || hotels.length) body("Reservations and confirmation codes");
  body(`Day-by-day plan with maps (${days.length} days)`);
  if (itinerary.events?.length) body(`Local events (${Math.min(itinerary.events.length, MAX_EVENTS)})`);
  if (Object.keys(foodSpots).length) body("Food spots");
  doc.moveDown(1);
  muted("Saved for offline use. Map pins match the numbered stops on each day.");

  // ---- Reservations
  // One reservation: bold title, detail lines, and the confirmation code (if any) in large type
  const reservation = (title, lines, code) => {
    ensureSpace(60);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.text).text(clean(title));
    for (const line of lines) if (clean(line)) muted(line);
    if (code) {
      doc.moveDown(0.15);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("CONFIRMATION CODE", { characterSpacing: 0.5 });
      doc.font("Courier-Bold").fontSize(15).fillColor(COLORS.accent).text(clean(code).toUpperCase(), { characterSpacing: 1 });
    }
    doc.moveDown(0.8);
  };

  if (flights.length || hotels.length) {
    doc.addPage();
    heading("Reservations");
    muted("Flight and hotel details with confirmation codes");
    doc.moveDown(0.8);

    if (flights.length) {
      label("Flights");
      doc.moveDown(0.4);
      for (const f of flights) {
        reservation(
          [f.airline, f.flightNumber].filter(Boolean).join(" ") || "Flight",
          [
            (f.from || f.to) && `${f.from || "?"} -> ${f.to || "?"}`,
            [formatDate(f.date), formatTime(f.time)].filter(Boolean).join("  |  "),
            f.notes,
          ],
          f.confirmationCode
        );
      }
    }

    if (hotels.length) {
      if (flights.length) doc.moveDown(0.4);
      label("Hotels");
      doc.moveDown(0.4);
      for (const h of hotels) {
        reservation(
          h.name || "Hotel",
          [
            h.address,
            (h.checkIn || h.checkOut) && `${formatDate(h.checkIn) || "?"} - ${formatDate(h.checkOut) || "?"}`,
            h.notes,
          ],
          h.confirmationCode
        );
      }
    }
  }

  // ---- Days
  days.forEach((day, i) => {
    doc.addPage();
    // Claude's day labels usually already start with "Day N", so don't repeat it
    label(/^day\b/i.test(day.date || "") ? day.date : `Day ${i + 1}${day.date ? `  |  ${day.date}` : ""}`);
    doc.moveDown(0.2);
    heading(day.title || `Day ${i + 1}`);
    doc.moveDown(0.5);

    const map = maps[i];
    if (map) {
      const h = (width * 420) / 800;
      doc.image(map, doc.page.margins.left, doc.y, { width, height: h });
      doc.y += h + 12;
    } else {
      muted("Map unavailable for this day.");
      doc.moveDown(0.5);
    }

    const { stops } = dayData[i];
    if (stops.length) {
      label("Stops");
      doc.moveDown(0.4);
      stops.forEach((s, n) => numbered(n + 1, s.title, [[s.address, "muted"]]));
    }

    if (day.notes?.length) {
      ensureSpace(40);
      label("Tips");
      doc.moveDown(0.3);
      for (const note of day.notes) body(`-  ${note}`, { indent: 0, paragraphGap: 3 });
      doc.moveDown(0.5);
    }

    if (day.hotel) {
      ensureSpace(40);
      label("Hotel");
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.text).text(clean(day.hotel.name));
      if (day.hotel.address) muted(day.hotel.address);
    }
  });

  // ---- Local events
  const events = (itinerary.events || []).slice(0, MAX_EVENTS);
  if (events.length) {
    doc.addPage();
    heading("Local Events");
    muted("Happening during your trip");
    doc.moveDown(0.8);
    events.forEach((e, i) =>
      numbered(i + 1, e.title, [
        [[e.date, e.time].filter(Boolean).join("  |  "), "muted"],
        [[e.location, e.address].filter(Boolean).join(", "), "muted"],
        [[e.category, e.price].filter(Boolean).join("  |  "), "muted"],
        [e.description],
      ])
    );
  }

  // ---- Food spots, per city
  const foodCities = Object.entries(foodSpots).filter(([, list]) => list?.length);
  foodCities.forEach(([city, list], ci) => {
    if (ci === 0) {
      doc.addPage();
      heading("Food Spots");
      muted("Top places to eat, picked for your trip");
      doc.moveDown(0.8);
    } else {
      ensureSpace(80);
      doc.moveDown(0.6);
    }
    label(city);
    doc.moveDown(0.4);
    const homebase = homebases[city];
    list.slice(0, MAX_FOOD_SPOTS).forEach((s, i) => {
      const distance =
        homebase?.coords && s.coords
          ? `${formatDistance(homebase.coords, s.coords, miles)} from ${homebase.type === "hotel" ? "hotel" : "homebase"}`
          : "";
      numbered(i + 1, s.name, [
        [[s.cuisine, s.price, s.neighborhood, distance].filter(Boolean).join("  |  "), "muted"],
        [s.address, "muted"],
        [s.description],
      ]);
    });
  });

  // ---- Footer on every page
  const range = doc.bufferedPageRange();
  for (let p = range.start; p < range.start + range.count; p++) {
    doc.switchToPage(p);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // let the footer sit in the margin without adding a page
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
      .text(clean(`${country} trip  |  Trip Planner`), doc.page.margins.left, doc.page.height - 36, { width, align: "left" })
      .text(`Page ${p + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 36, { width, align: "right" });
    doc.page.margins.bottom = bottom;
  }

  // The caller pipes the document somewhere, then calls doc.end()
  return doc;
}
