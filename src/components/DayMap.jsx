import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

import MarkerInfoModal from "./MarkerInfoModal";
import HotelInfoModal from "./HotelInfoModal";
import { theme } from "../utils/theme";

import "leaflet/dist/leaflet.css";

// ---------- Icon helpers ----------
function numberIcon(n, color) {
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
const WORLD_CENTER = [20, 0];

function FitBounds({ items }) {
  const map = useMap();
  useEffect(() => {
    const pts = items
      .filter((s) => Array.isArray(s.coords) && s.coords.length === 2)
      .map((s) => L.latLng(s.coords[0], s.coords[1]));
    if (!pts.length) {
      map.setView(WORLD_CENTER, 2);
      return;
    }
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds.pad(0.2), { animate: false });
  }, [items, map]);
  return null;
}

// items: the day's stops plus hotels (type: "hotel"), each with [lat, lng] coords
export default function DayMap({ items = [] }) {
  const [active, setActive] = useState(null);

  const spots = useMemo(
    () => items.filter((it) => it?.type !== "hotel" && Array.isArray(it?.coords)),
    [items]
  );

  const hotelList = useMemo(
    () => items.filter((it) => it?.type === "hotel" && Array.isArray(it?.coords)),
    [items]
  );


  const iconCache = useRef({});
  function getNumberIcon(n) {
    if (!iconCache.current[n]) iconCache.current[n] = numberIcon(n, theme.markerColor);
    return iconCache.current[n];
  }
  const hotelDivIcon = useMemo(() => hotelIcon(), []);

  return (
    <div className="relative">
      <MapContainer
        center={WORLD_CENTER}
        zoom={2}
        className="h-72 w-full rounded-2xl shadow-xl ring-1 ring-black/10"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds items={items} />

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

      <HotelInfoModal hotel={active?.type === "hotel" ? active : null} onClose={() => setActive(null)} />
      <MarkerInfoModal active={active?.type !== "hotel" ? active : null} onClose={() => setActive(null)} />
    </div>
  );
}
