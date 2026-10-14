import React from "react";
import { BedDouble, MapPin, PlayCircle } from "lucide-react";
import { gmaps } from "../../utils/helpers";

const card = "rounded-3xl bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.06)] sm:p-6";

// One day's plan: the stops in order (numbered like the map's pins, joined by a line), tips,
// and where the travelers sleep that night
export default function DayDetails({ day, spots }) {
  const stops = (day.markers || []).map((k) => spots[k]).filter(Boolean);
  const notes = day.notes || [];

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="day-plan">
        <h3 id="day-plan" className="mb-4 text-lg font-extrabold">The plan</h3>
        {stops.length ? (
          <ol>
            {stops.map((spot, i) => {
              const last = i === stops.length - 1;
              const links = spot.links || {};
              return (
                <li key={`${spot.title}-${i}`} className="flex gap-3.5">
                  <span className="flex flex-col items-center" aria-hidden="true">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-violet-700 text-[13px] font-extrabold text-white">
                      {i + 1}
                    </span>
                    {!last && <span className="min-h-[18px] w-0.5 flex-1 bg-violet-200" />}
                  </span>
                  <div className={`min-w-0 flex-1 ${last ? "" : "pb-5"}`}>
                    <p className="font-extrabold leading-snug text-slate-900">
                      <span className="sr-only">Stop {i + 1}: </span>
                      {spot.title}
                    </p>
                    {spot.address && <p className="mt-0.5 text-sm text-slate-600">{spot.address}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold">
                      <a
                        href={links.maps || gmaps(`${spot.title} ${spot.address || ""}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[32px] items-center gap-1 text-violet-800 hover:underline"
                      >
                        <MapPin size={14} /> Directions
                      </a>
                      {links.youtube && (
                        <a href={links.youtube} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center gap-1 text-violet-800 hover:underline">
                          <PlayCircle size={14} /> Videos
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-slate-600">No stops planned for this day.</p>
        )}
      </section>

      {notes.length > 0 && (
        <section className={card} aria-labelledby="day-tips">
          <h3 id="day-tips" className="mb-2 text-lg font-extrabold">Tips</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {day.hotel?.name && (
        <section className="flex items-center gap-3.5 rounded-3xl bg-[#0f2b5b] p-5 text-white">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white/10">
            <BedDouble size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">Tonight</p>
            <p className="truncate font-extrabold">{day.hotel.name}</p>
            {day.hotel.address && <p className="truncate text-sm text-slate-300">{day.hotel.address}</p>}
          </div>
          <a
            href={gmaps(`${day.hotel.name} ${day.hotel.address || ""}`)}
            target="_blank"
            rel="noreferrer"
            className="flex-none rounded-xl bg-white/10 px-3 py-2 text-sm font-bold ring-1 ring-white/25 hover:bg-white/20"
          >
            Maps
          </a>
        </section>
      )}
    </div>
  );
}
