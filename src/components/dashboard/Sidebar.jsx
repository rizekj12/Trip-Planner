import React from "react";
import { Link } from "react-router-dom";
import TripThumb from "./TripThumb";
import { getCountryFlagOnly } from "../../utils/countryFlags";
import { FEATURED_DESTINATIONS } from "../../data/destinationImages";
import { WEEKDAYS, monthWeeks, monthLabel, todayIso } from "../../utils/calendar";

const card = "rounded-3xl bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.05)]";

// One month with trip days highlighted; links to the full calendar on that month
export function MiniCalendar({ month, trips }) {
  const today = todayIso();
  const prefix = `${month.year}-${String(month.month + 1).padStart(2, "0")}`;
  const dated = trips.filter((t) => t.range && t.status !== "draft");
  const onTrip = (iso) => dated.some((t) => t.range.start <= iso && t.range.end >= iso);
  const inMonth = dated.filter((t) => t.range.start <= `${prefix}-31` && t.range.end >= `${prefix}-01`);

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold">{monthLabel(month)}</h2>
        <Link to={`/calendar?month=${prefix}`} className="text-sm font-bold text-violet-700 hover:underline">
          Full calendar
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
        {WEEKDAYS.map((d) => <span key={d}>{d[0]}</span>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {monthWeeks(month).flat().map((iso) => {
          const here = iso.startsWith(prefix);
          const trip = here && onTrip(iso);
          return (
            <span
              key={iso}
              className={`flex h-8 items-center justify-center rounded-lg text-[13px] font-semibold ${
                !here ? "text-transparent" : trip ? "bg-violet-600 text-white" : iso === today ? "ring-2 ring-violet-400 text-slate-800" : "text-slate-700"
              }`}
            >
              {Number(iso.slice(8))}
            </span>
          );
        })}
      </div>
      {inMonth.length > 0 && (
        <ul className="mt-3 space-y-1">
          {inMonth.map((t) => (
            <li key={t.trip.id} className="flex items-center gap-2 text-[13px] text-slate-700">
              <span className="h-3 w-3 rounded bg-violet-600" />
              {getCountryFlagOnly(t.trip.destination)} {t.trip.destination}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TravelStats({ stats }) {
  const items = [
    { value: stats.trips, label: stats.trips === 1 ? "trip" : "trips" },
    { value: stats.countries, label: stats.countries === 1 ? "country" : "countries" },
    { value: stats.days, label: "days away" },
  ];
  return (
    <section className="rounded-3xl bg-[#0f2b5b] p-5 text-white">
      <h2 className="text-base font-extrabold">Your travels</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {items.map((i) => (
          <div key={i.label}>
            <div className="text-2xl font-extrabold">{i.value}</div>
            <div className="text-xs text-slate-300">{i.label}</div>
          </div>
        ))}
      </div>
      {stats.trips === 0 && <p className="mt-3 text-xs text-slate-300">Fills in as your trips wrap up.</p>}
    </section>
  );
}

// A few destinations with photos, skipping ones already planned; each starts a new trip
export function TripIdeas({ exclude = [] }) {
  const ideas = FEATURED_DESTINATIONS.filter((d) => !exclude.includes(d.name)).slice(0, 3);
  if (!ideas.length) return null;
  return (
    <section className={card}>
      <h2 className="text-base font-extrabold">Ideas for your next trip</h2>
      <ul className="mt-3 space-y-2.5">
        {ideas.map((d) => (
          <li key={d.name}>
            <Link to={`/new?destination=${encodeURIComponent(d.name)}`} className="group flex items-center gap-3">
              <TripThumb country={d.name} className="h-14 w-14 flex-none rounded-xl" />
              <span className="min-w-0">
                <span className="block font-bold group-hover:text-violet-700">{getCountryFlagOnly(d.name)} {d.name}</span>
                <span className="block truncate text-sm text-slate-600">{d.tag}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
