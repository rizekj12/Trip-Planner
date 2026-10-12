import React from "react";
import { Link } from "react-router-dom";
import { Plus, MapPin, Map, Download } from "lucide-react";
import TripThumb from "./TripThumb";
import { getCountryFlagOnly } from "../../utils/countryFlags";
import { FEATURED_DESTINATIONS } from "../../data/destinationImages";

const STEPS = [
  { icon: MapPin, title: "1. Pick where and when", text: "Choose a destination, your cities and dates, and where you're staying." },
  { icon: Map, title: "2. Get every day planned", text: "Day-by-day stops on a map, the best food nearby, and events during your trip." },
  { icon: Download, title: "3. Take it with you", text: "Keep flight and hotel codes in one place and download it all for offline." },
];

// Dashboard for someone with no trips yet: an invitation to plan the first one
export default function FirstTripHero({ name }) {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900">
        <div aria-hidden="true" className="absolute inset-0 grid grid-cols-2 grid-rows-3 opacity-50 sm:grid-cols-4 sm:grid-rows-2">
          {FEATURED_DESTINATIONS.slice(0, 8).map((d, i) => (
            <img key={d.name} src={d.image} alt="" className={`h-full w-full object-cover ${i >= 6 ? "hidden sm:block" : ""}`} />
          ))}
        </div>
        <div className="relative mx-auto max-w-3xl px-5 py-20 text-center text-white sm:py-28">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-amber-200">
            Welcome{name ? `, ${name}` : ""}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Where will your first trip take you?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-200 sm:text-lg">
            Answer a few quick questions and we'll plan every day: maps, food spots, local events and an offline PDF.
          </p>
          <Link
            to="/new"
            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 text-lg font-extrabold text-violet-900 shadow-2xl transition hover:bg-violet-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white">
              <Plus size={20} />
            </span>
            New itinerary
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="pt-12">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-center">How it works</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-col">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-violet-100 text-violet-800">
                  <Icon size={21} />
                </span>
                <span>
                  <span className="block text-lg font-extrabold">{title}</span>
                  <span className="mt-1 block text-slate-600">{text}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight">Popular places to start</h2>
            <span className="text-slate-600">Pick one to pre-fill your first trip</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {FEATURED_DESTINATIONS.map((d) => (
              <Link
                key={d.name}
                to={`/new?destination=${encodeURIComponent(d.name)}`}
                className="group relative block h-36 overflow-hidden rounded-2xl bg-slate-900 sm:h-44"
              >
                <TripThumb country={d.name} className="h-full w-full opacity-90 transition group-hover:scale-105" />
                <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-slate-900/80 px-2.5 py-1.5 text-sm font-extrabold text-white">
                  {getCountryFlagOnly(d.name)} {d.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
