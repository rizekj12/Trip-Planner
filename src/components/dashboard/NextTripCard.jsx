import React from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import TripThumb from "./TripThumb";
import CrewBubbles from "../crew/CrewBubbles";
import { getCountryFlagOnly } from "../../utils/countryFlags";
import { formatRange } from "../../utils/calendar";
import { countdown, waitProgress, beforeYouGo } from "../../utils/dashboard";

const RING = 2 * Math.PI * 48; // circumference of the progress ring

// The hero of the dashboard: next trip's photo, days to go, and a "Before you go" checklist
export default function NextTripCard({ entry, onDownloadPdf, downloading, isOwner = true }) {
  const { trip, range, status } = entry;
  const count = countdown(range);
  const progress = count.mode === "during" ? 1 : waitProgress(trip, range);
  const cities = trip.cities || [];
  const items = beforeYouGo(entry, { isOwner });

  return (
    <section className="flex flex-wrap overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="relative min-h-[220px] flex-[1_1_320px] bg-slate-200">
        <TripThumb country={trip.destination} className="absolute inset-0 h-full w-full" flagSize="text-7xl" />
        <span className="absolute left-3.5 top-3.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0f2b5b]">
          {count.mode === "during" ? "On your trip" : "Next trip"}
        </span>
      </div>

      <div className="flex flex-[1_1_320px] flex-col gap-5 p-6 sm:p-7">
        <div className="flex items-center gap-5">
          {/* Progress ring with the countdown */}
          <div className="relative h-28 w-28 flex-none">
            <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#ede9fe" strokeWidth="10" />
              <circle
                cx="56" cy="56" r="48" fill="none" stroke="#7c3aed" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={RING} strokeDashoffset={RING * (1 - progress)} transform="rotate(-90 56 56)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {count.mode === "before" ? (
                <>
                  <span className="text-3xl font-extrabold leading-none">{count.days}</span>
                  <span className="text-xs font-bold text-slate-600">{count.days === 1 ? "day to go" : "days to go"}</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-600">Day</span>
                  <span className="text-3xl font-extrabold leading-none">{count.day}</span>
                  <span className="text-xs font-bold text-slate-600">of {count.of}</span>
                </>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
              {getCountryFlagOnly(trip.destination)} {trip.destination}
            </h1>
            {cities.length > 0 && <p className="truncate font-medium text-slate-600">{cities.join(" · ")}</p>}
            <p className="text-sm font-semibold text-slate-700">{formatRange(range)}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Before you go</p>
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => {
              const content = (
                <>
                  <span
                    className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full ${
                      item.done ? "bg-emerald-100 text-emerald-700" : "border border-slate-300 bg-white"
                    }`}
                  >
                    {item.done && <Check size={13} strokeWidth={3} />}
                    {item.key === "pdf" && downloading && <Loader2 size={13} className="animate-spin text-slate-500" />}
                  </span>
                  <span className={item.done ? "text-slate-900" : "text-slate-600"}>{item.label}</span>
                </>
              );
              const rowClass = "flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left text-[15px] transition hover:bg-slate-50";
              return (
                <li key={item.key}>
                  {item.action === "pdf" ? (
                    <button onClick={onDownloadPdf} disabled={downloading} className={rowClass}>{content}</button>
                  ) : item.to ? (
                    <Link to={item.to} className={rowClass}>{content}</Link>
                  ) : (
                    <span className={rowClass}>{content}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2.5">
          <Link to={`/trip/${trip.id}`} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
            Open itinerary
          </Link>
          {status === "ready" && (
            <button
              onClick={onDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
            >
              {downloading && <Loader2 size={15} className="animate-spin" />}
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>
          )}
          <div className="ml-auto">
            <CrewBubbles tripId={trip.id} destination={trip.destination} tone="light" />
          </div>
        </div>
      </div>
    </section>
  );
}
