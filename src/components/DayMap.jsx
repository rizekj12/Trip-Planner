// src/components/DayMap.jsx
import React from 'react';
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Modal from "./Modal";
import { FALLBACK_IMG } from "../imgData";
import { FaYoutube } from "react-icons/fa";
import { SiGooglemaps, SiTiktok } from "react-icons/si";
import { numberedIcon, gmaps } from "../utils/helpers";
import { FiExternalLink } from "react-icons/fi";

// Fallback default icon (unused when numbered)
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Distinct gold/house icon for hotel
function hotelIcon() {
  const color = "#f59e0b"; // amber-500
  return L.divIcon({
    html: `
      <div style="
        background:${color};
        color:white;
        border-radius:50%;
        width:32px;height:32px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 6px rgba(0,0,0,.35);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3.172 3 10h1v10h6v-6h4v6h6V10h1L12 3.172z"/>
        </svg>
      </div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const b = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(b.pad(0.2));
  }, [points, map]);
  return null;
}

// A pleasant fallback if hotel has no image
const HOTEL_FALLBACK =
  "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=1200&auto=format&fit=crop";

export default function DayMap({ items, hotel, theme }) {
  const points = [
    ...items.map((s) => s.coords),
    ...(hotel?.coords ? [hotel.coords] : []),
  ];

  // Two separate actives: one for a spot and one for the hotel
  const [activeSpot, setActiveSpot] = useState(null);
  const [hotelOpen, setHotelOpen] = useState(false);

  return (
    <div className={`relative z-0 w-full overflow-hidden rounded-2xl shadow-lg ${theme.card}`}>
      <MapContainer
        style={{ height: 420, width: "100%", zIndex: 0 }}
        className="z-0"
        center={[35.6812, 139.7671]}
        zoom={12}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        {/* Numbered stops */}
        {items.map((s, idx) => (
          <Marker
            key={s.title + idx}
            position={s.coords}
            icon={numberedIcon(idx + 1, theme.markerColor) || defaultIcon}
            eventHandlers={{ click: () => setActiveSpot(s) }}
          >
            <Popup>{s.title}</Popup>
          </Marker>
        ))}

        {/* Distinct hotel marker */}
        {hotel?.coords && (
          <Marker
            position={hotel.coords}
            icon={hotelIcon()}
            zIndexOffset={1000}
            eventHandlers={{ click: () => setHotelOpen(true) }}
          >
            <Popup>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Hotel</div>
              <div>{hotel.name}</div>
              {hotel.address && (
                <div style={{ opacity: 0.8, fontSize: "0.9em" }}>{hotel.address}</div>
              )}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Spot modal (unchanged) */}
      <Modal open={!!activeSpot} onClose={() => setActiveSpot(null)} theme={theme}>
        {activeSpot && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <img
              src={activeSpot.img}
              alt={activeSpot.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_IMG;
              }}
              className="h-56 w-full rounded-xl object-cover"
            />
            <div>
              <h3 className="text-xl font-semibold">{activeSpot.title}</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {activeSpot.links?.youtube && (
                  <a href={activeSpot.links.youtube} target="_blank"
                    className="flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-white hover:bg-rose-700">
                    <FaYoutube size={20} />
                  </a>
                )}
                {activeSpot.links?.tiktok && (
                  <a href={activeSpot.links.tiktok} target="_blank"
                    className="flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-white hover:bg-zinc-900">
                    <SiTiktok size={18} />
                  </a>
                )}
                {activeSpot.links?.website && (
                  <a href={activeSpot.links.website} target="_blank"
                    className="flex items-center gap-2 rounded-xl bg-zinc-700 px-3 py-2 text-white hover:bg-zinc-800">
                    <FiExternalLink size={18} />
                  </a>
                )}
                {activeSpot.links?.maps && (
                  <a href={activeSpot.links.maps} target="_blank"
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700">
                    <SiGooglemaps size={20} />
                  </a>
                )}
              </div>

            </div>
          </div>
        )}
      </Modal>

      {/* Hotel modal (new) */}
      <Modal open={!!hotelOpen} onClose={() => setHotelOpen(false)} theme={theme}>
        {hotel && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <img
              src={hotel.img || HOTEL_FALLBACK}
              alt={hotel.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = HOTEL_FALLBACK;
              }}
              className="h-56 w-full rounded-xl object-cover"
            />

            <div>
              <h3 className="text-xl font-semibold">Hotel – {hotel.name}</h3>
              {hotel.address && (
                <div className="mt-1 text-sm opacity-80">{hotel.address}</div>
              )}

              {/* Optional meta */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {hotel.checkIn && (
                  <div className="rounded-lg bg-white/50 p-2 text-zinc-900">
                    <div className="text-xs opacity-70">Check‑in</div>
                    <div className="font-medium">{hotel.checkIn}</div>
                  </div>
                )}
                {hotel.checkOut && (
                  <div className="rounded-lg bg-white/50 p-2 text-zinc-900">
                    <div className="text-xs opacity-70">Check‑out</div>
                    <div className="font-medium">{hotel.checkOut}</div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {/* Google Maps */}
                <a
                  href={gmaps(`${hotel.name} ${hotel.address || ""}`)}
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z" />
                  </svg>
                </a>

                {/* Phone (if present) */}
                {hotel.phone && (
                  <a
                    href={`tel:${hotel.phone.replace(/[^+0-9]/g, "")}`}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
                  >
                    Call
                  </a>
                )}

                {/* Website (if present) */}
                {hotel.website && (
                  <a
                    href={hotel.website}
                    target="_blank"
                    className="rounded-xl bg-zinc-700 px-3 py-2 text-white hover:bg-zinc-800"
                  >
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
