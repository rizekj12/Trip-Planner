import React, { useState } from "react";
import { BedDouble, MapPin, PlayCircle, Ticket, CloudRain, Check, Pencil } from "lucide-react";
import EditDay from "./EditDay";
import { useEditItinerary } from "../../hooks/useTrips";
import { toggleDone } from "../../../shared/itineraryEdits.js";
import { gmaps } from "../../utils/helpers";

const card = "rounded-3xl bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.06)] sm:p-6";

// One day's plan: the stops in order (numbered like the map's pins, joined by a line), tips,
// and where the travelers sleep that night. The organizer (`canEdit`, with `tripId`) can tick
// stops off during the trip by tapping their number, and edit the day (issue #37); everyone
// sees what's been ticked off. `days` (describeDays) and `country` are for editing.
export default function DayDetails({ day, spots, canEdit = false, tripId, days = [], country }) {
  const [editing, setEditing] = useState(false);
  const edit = useEditItinerary(tripId);
  const keys = (day.markers || []).filter((k) => spots[k]);
  const stops = keys.map((k) => spots[k]);
  const done = new Set(day.done || []);
  const notes = day.notes || [];

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="day-plan">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="day-plan" className="text-lg font-extrabold">The plan</h3>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              aria-pressed={editing}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold ${
                editing ? "bg-violet-700 text-white hover:bg-violet-800" : "text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50"
              }`}
            >
              {editing ? <Check size={15} /> : <Pencil size={15} />}
              {editing ? "Done editing" : "Edit day"}
            </button>
          )}
        </div>
        {editing ? (
          <EditDay tripId={tripId} day={day} spots={spots} days={days} country={country} />
        ) : stops.length ? (
          <ol>
            {stops.map((spot, i) => {
              const last = i === stops.length - 1;
              const links = spot.links || {};
              const key = keys[i];
              const isDone = done.has(key);
              const circle = `flex h-8 w-8 flex-none items-center justify-center rounded-full text-[13px] font-extrabold text-white ${
                isDone ? "bg-emerald-600" : "bg-violet-700"
              }`;
              return (
                <li key={key} className="flex gap-3.5">
                  <span className="flex flex-col items-center">
                    {canEdit ? (
                      // 44px target around the 32px circle
                      <button
                        type="button"
                        onClick={() => edit.mutate((it) => toggleDone(it, day.key, key))}
                        aria-pressed={isDone}
                        aria-label={isDone ? `${spot.title}: done. Tap to undo` : `Mark ${spot.title} as done`}
                        className="-m-1.5 flex h-11 w-11 items-center justify-center rounded-full"
                      >
                        <span className={circle} aria-hidden="true">{isDone ? <Check size={16} strokeWidth={3} /> : i + 1}</span>
                      </button>
                    ) : (
                      <span className={circle} aria-hidden="true">{isDone ? <Check size={16} strokeWidth={3} /> : i + 1}</span>
                    )}
                    {!last && <span className="min-h-[18px] w-0.5 flex-1 bg-violet-200" aria-hidden="true" />}
                  </span>
                  <div className={`min-w-0 flex-1 ${last ? "" : "pb-5"}`}>
                    <p className={`font-extrabold leading-snug ${isDone ? "text-slate-500 line-through" : "text-slate-900"}`}>
                      <span className="sr-only">Stop {i + 1}{isDone ? " (done)" : ""}: </span>
                      {spot.title}
                    </p>
                    {spot.address && <p className="mt-0.5 text-sm text-slate-600">{spot.address}</p>}
                    {spot.estimatedCost && (
                      <p className="mt-0.5 text-sm font-semibold text-emerald-800">
                        <span className="sr-only">Estimated cost: </span>≈ {spot.estimatedCost}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold">
                      <a
                        href={links.maps || gmaps(`${spot.title} ${spot.address || ""}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[32px] items-center gap-1 text-violet-800 hover:underline"
                      >
                        <MapPin size={14} /> Directions
                      </a>
                      {links.booking && (
                        <a href={links.booking} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center gap-1 text-violet-800 hover:underline">
                          <Ticket size={14} /> Book
                        </a>
                      )}
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
        {!editing && edit.isError && <p className="mt-3 text-sm text-red-600">Couldn't save that: {edit.error.message}</p>}
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

      {day.rainyDayBackup && (
        <section className={card} aria-labelledby="day-rain">
          <h3 id="day-rain" className="mb-2 flex items-center gap-2 text-lg font-extrabold">
            <CloudRain size={18} className="text-sky-700" aria-hidden="true" /> If it rains
          </h3>
          <p className="text-[15px] leading-relaxed text-slate-700">{day.rainyDayBackup}</p>
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
