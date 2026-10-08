import React from 'react';
import TodayStopsList from "./TodayStopsList";
import { gmaps } from "../utils/helpers";
import { theme } from "../utils/theme";

export default function ItineraryCard({ day, spots }) {
  const items = day.markers.map((k) => spots[k]).filter(Boolean);

  return (
    <div className={`rounded-2xl p-6 shadow-xl ${theme.card}`}>
      {/* Header strip */}
      <div className={`mb-4 rounded-xl p-3 ${theme.header}`}>
        <h2 className="text-2xl font-semibold">{day.title}</h2>
      </div>

      {/* Today’s Stops */}
      <TodayStopsList items={items} />

      {/* Notes */}
      <div className="mt-3 space-y-2">
        {day.notes.map((n, i) => (
          <div key={i} className={`rounded-xl p-3 text-sm ${theme.sub}`}>
            {n}
          </div>
        ))}
      </div>

      {/* Hotel */}
      {day.hotel && (
        <div className={`mt-4 rounded-xl p-3 text-sm ${theme.sub}`}>
          <div className="font-medium">Hotel</div>
          <div>{day.hotel.name}</div>
          <div className="opacity-80">{day.hotel.address}</div>
          <a
            className="mt-2 inline-block rounded-lg bg-indigo-600 px-3 py-1 text-white hover:opacity-90"
            href={gmaps(day.hotel.name + " " + day.hotel.address)}
            target="_blank"
          >
            Open Hotel in Maps
          </a>
        </div>
      )}
    </div>
  );
}
