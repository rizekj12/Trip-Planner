import React from 'react';

// src/components/DayMap.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

import MarkerInfoModal from "./MarkerInfoModal";
import HotelInfoModal from "./HotelInfoModal";

import "leaflet/dist/leaflet.css";

// ---------- Icon helpers ----------
function numberIcon(n, color = "#7c3aed") {
  const html = `
    <div style="
      background:${color};
      color:#fff;
      width:28px;height:28px;
      border-radius:9999px;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:12px;
      box-shadow:0 2px 6px rgba(0,0,0,.25);
      border:2px solid rgba(255,255,255,.65);
    ">${n}</div>`;
  return new L.DivIcon({
    className: "num-icon",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function hotelIcon() {
  const html = `
    <div style="
      background:#111827;
      color:#fff;
      width:28px;height:28px;
      border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      font-weight:800;font-size:16px;line-height:1;
      box-shadow:0 2px 6px rgba(0,0,0,.25);
      border:2px solid rgba(255,255,255,.65);
    ">🏨</div>`;
  return new L.DivIcon({
    className: "hotel-icon",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 24],
    popupAnchor: [0, -24],
  });
}

// ---------- Fit map to markers ----------
function FitBounds({ items, defaultCenter }) {
  const map = useMap();
  useEffect(() => {
    if (!items?.length) {
      if (defaultCenter) map.setView(defaultCenter, 12);
      return;
    }
    const pts = items
      .filter((s) => Array.isArray(s.coords) && s.coords.length === 2)
      .map((s) => L.latLng(s.coords[0], s.coords[1]));
    if (!pts.length) {
      if (defaultCenter) map.setView(defaultCenter, 12);
      return;
    }
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds.pad(0.2), { animate: false });
  }, [items, map, defaultCenter]);
  return null;
}

/**
 * Props:
 * - items:  itinerary/other/food spots (non-hotel)
 * - hotel?: single hotel (optional)
 * - hotels?: array of hotels (optional)  ← we'll use this for "Other" and "Food"
 * - theme, themeKey
 */
export default function DayMap({ items = [], hotel = null, hotels = [], theme, themeKey = "tokyo" }) {
  const [active, setActive] = useState(null);

  const spots = useMemo(
    () => (Array.isArray(items) ? items : []).filter((it) => it?.type !== "hotel" && Array.isArray(it?.coords)),
    [items]
  );

  // Merge any hotel(s): props.hotels[], props.hotel, and any hotels already inside items
  const hotelsFromItems = useMemo(
    () => (Array.isArray(items) ? items : []).filter((it) => it?.type === "hotel" && Array.isArray(it?.coords)),
    [items]
  );

  const hotelList = useMemo(() => {
    const list = [...hotelsFromItems];
    if (hotel && Array.isArray(hotel.coords)) list.push({ ...hotel, type: "hotel" });
    (Array.isArray(hotels) ? hotels : []).forEach((h) => {
      if (Array.isArray(h?.coords)) list.push({ ...h, type: "hotel" });
    });
    // de-dup by title (case-insensitive)
    const seen = new Set();
    return list.filter((h) => {
      const key = (h.title || "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [hotelsFromItems, hotel, hotels]);

  const center = useMemo(
    () => spots[0]?.coords || hotelList[0]?.coords || [35.681236, 139.767125],
    [spots, hotelList]
  );

  const tileUrl = theme?.mapTileUrl || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution =
    theme?.mapAttribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const iconCache = useRef({});
  function getNumberIcon(n) {
    const key = `${n}-${theme?.markerColor || "#7c3aed"}`;
    if (!iconCache.current[key]) iconCache.current[key] = numberIcon(n, theme?.markerColor || "#7c3aed");
    return iconCache.current[key];
  }
  const hotelDivIcon = useMemo(() => hotelIcon(), []);

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={13}
        className="h-72 w-full rounded-2xl shadow-xl ring-1 ring-black/10"
        scrollWheelZoom={false}
      >
        <TileLayer attribution={attribution} url={tileUrl} />
        <FitBounds items={[...spots, ...hotelList]} defaultCenter={center} />

        {/* Numbered spots */}
        {spots.map((spot, idx) => {
          const [lat, lng] = spot.coords;
          return (
            <Marker
              key={`${spot.title}-${idx}`}
              position={[lat, lng]}
              icon={getNumberIcon(idx + 1)}
              eventHandlers={{ click: () => setActive(spot) }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                {spot.title}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Hotels (🏨) */}
        {hotelList.map((h, i) => {
          const [lat, lng] = h.coords;
          return (
            <Marker
              key={`hotel-${i}-${h.title}`}
              position={[lat, lng]}
              icon={hotelDivIcon}
              eventHandlers={{ click: () => setActive(h) }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                {h.title || "Hotel"}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Conditional modals */}
      {active &&
        (active.type === "hotel" ? (
          <HotelInfoModal open={!!active} onClose={() => setActive(null)} hotel={active} themeKey={themeKey} />
        ) : (
          <MarkerInfoModal open={!!active} onClose={() => setActive(null)} active={active} themeKey={themeKey} />
        ))}
    </div>
  );
}
