import React, { useState } from "react";
import { Calendar, MapPin, Ticket, RefreshCw, Loader2, Sparkles, Info } from "lucide-react";
import EventModal from "./EventModal";
import EventImage from "./EventImage";
import { useRefreshEvents } from "../hooks/useTrips";

const card = "rounded-3xl bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.06)] sm:p-6";

// Local events during the trip. Since issue #36 they're real listings from Ticketmaster
// (`source` "ticketmaster"); trips made earlier have AI-suggested events (no source), shown
// with a warning. The organizer can fetch real ones (`canRefresh`).
export default function EventsPanel({ tripId, events = [], source, checkedAt, cities = [], canRefresh = false }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const refresh = useRefreshEvents(tripId);
  const live = source === "ticketmaster";
  const checked = checkedAt && new Date(checkedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const refreshButton = (label) =>
    canRefresh && (
      <button
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
        className="inline-flex min-h-[40px] flex-none items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 transition hover:border-violet-300 disabled:opacity-60"
      >
        {refresh.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        {refresh.isPending ? "Searching…" : label}
      </button>
    );

  return (
    <>
      <section className={card} aria-labelledby="events-title">
        <h2 id="events-title" className="text-[22px] font-extrabold">Local events</h2>
        <p className="mt-1 text-sm text-slate-600">Happening while you're there</p>

        {/* Where these came from */}
        {live ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span className="flex items-center gap-2">
              <Ticket size={16} className="text-violet-700" aria-hidden="true" />
              Live listings from Ticketmaster{checked && ` · checked ${checked}`}
            </span>
            {refreshButton("Refresh")}
          </div>
        ) : source === "unavailable" ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span className="flex items-center gap-2">
              <Info size={16} aria-hidden="true" />
              Event listings weren't available when this trip was made.
            </span>
            {refreshButton("Try again")}
          </div>
        ) : (
          events.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="flex items-start gap-2">
                <Sparkles size={16} className="mt-0.5 flex-none" aria-hidden="true" />
                Suggested by AI when this trip was made. Dates and details may be wrong, so check before you go.
              </span>
              {refreshButton("Find real events")}
            </div>
          )
        )}
        {refresh.isError && <p className="mt-2 text-sm text-red-600">{refresh.error.message}</p>}

        {events.length > 0 && (
          <ul className="mt-4 space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="group flex w-full gap-4 rounded-2xl border-2 border-slate-100 p-3 text-left transition hover:border-violet-200"
                >
                  <span className="h-20 w-20 flex-none overflow-hidden rounded-xl">
                    <EventImage event={event} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold leading-snug text-slate-900 group-hover:text-violet-800">{event.title}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                      <Calendar size={14} aria-hidden="true" />
                      {[event.date, event.time].filter(Boolean).join(" · ")}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin size={14} aria-hidden="true" />
                        <span className="truncate">{event.location}</span>
                      </span>
                    )}
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {event.category && (
                        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800">{event.category}</span>
                      )}
                      {live && event.price && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{event.price}</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {events.length === 0 && (
          <div className="py-10 text-center">
            <Calendar size={40} className="mx-auto mb-3 text-slate-300" aria-hidden="true" />
            <p className="font-bold text-slate-800">
              {live ? "No ticketed events found for your dates" : "No events yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
              {live
                ? `Ticketmaster has nothing listed near ${cities.join(" or ") || "your destination"} while you're there. Local tourism sites often list markets and festivals.`
                : "Check local listings closer to your trip."}
            </p>
            {!live && source !== "unavailable" && <div className="mt-4 flex justify-center">{refreshButton("Find real events")}</div>}
          </div>
        )}

        {live && events.length > 0 && (
          <p className="mt-4 text-xs text-slate-500">Event details and tickets from Ticketmaster. Check the listing before you go.</p>
        )}
      </section>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
