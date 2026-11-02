import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Plane } from "lucide-react";
import CrewBubbles from "../crew/CrewBubbles";
import { getCountryFlagOnly } from "../../utils/countryFlags";
import { formatRange } from "../../utils/calendar";
import { placeName, useHomeCountry } from "../../utils/tripName";

// Navy trip header: back link, travelers and actions, the trip's name and dates, and the
// section tabs (always visible, so nothing is hidden behind a menu). Scrolls away on phones;
// the day strip below it stays pinned.
export default function TripHeader({ tripId, formData, days, viewer, crew, sections, section, onSection, pdf }) {
  const country = formData.country || "Your trip";
  const cities = (formData.cities || []).map((c) => c.name).filter(Boolean);
  // Its cities when the trip is in the viewer's own country ("3 days in New York")
  const name = placeName({ country: formData.country, cities }, useHomeCountry()) || country;
  const range = days[0]?.iso ? { start: days[0].iso, end: days[days.length - 1].iso } : null;

  return (
    <header className="bg-[#0f2b5b] text-white">
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="flex items-center justify-between gap-3">
          {viewer === "guest" ? (
            <Link to="/" className="flex items-center gap-2 font-extrabold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-600">
                <Plane size={18} className="rotate-45 fill-white text-white" />
              </span>
              <span className="hidden sm:inline">Trip Planner</span>
            </Link>
          ) : (
            <Link
              to="/"
              className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-slate-200 hover:text-white"
            >
              <ArrowLeft size={18} />
              My trips
            </Link>
          )}

          <div className="flex items-center gap-2">
            <CrewBubbles tripId={tripId} destination={name} crew={crew} />
            {viewer === "guest" ? (
              <Link to="/" className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50">
                Create a free account
              </Link>
            ) : (
              <button
                onClick={pdf.download}
                disabled={pdf.busy}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-bold ring-1 ring-white/25 transition hover:bg-white/20 disabled:opacity-70"
                title="Save this itinerary as a PDF for offline use"
                aria-label="Download PDF"
              >
                {pdf.busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span className="hidden sm:inline">{pdf.busy ? "Preparing…" : "PDF"}</span>
              </button>
            )}
          </div>
        </div>
        {pdf.error && <p className="mt-2 rounded-lg bg-red-500/90 px-3 py-1.5 text-sm">{pdf.error}</p>}

        <div className="mt-3 sm:mt-4">
          {cities.length > 0 && (
            <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
              {country} · {cities.join(" & ")}
            </p>
          )}
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight sm:text-4xl">
            {getCountryFlagOnly(country)} {days.length} days in {name}
          </h1>
          {range && (
            <p className="mt-1 text-sm text-slate-300 sm:text-[15px]">
              {formatRange(range)} · {days.length} day{days.length === 1 ? "" : "s"}
              {cities.length > 1 && ` · ${cities.length} cities`}
            </p>
          )}
        </div>

        <nav aria-label="Trip sections" className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-2 sm:mx-0 sm:px-0">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => onSection(s.id)}
              aria-current={section === s.id ? "page" : undefined}
              className={`min-h-[44px] whitespace-nowrap border-b-[3px] px-3 text-[15px] font-bold transition sm:px-4 ${
                section === s.id ? "border-pink-400 text-white" : "border-transparent text-slate-300 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
