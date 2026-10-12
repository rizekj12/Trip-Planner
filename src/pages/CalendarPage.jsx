import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react";
import SkyBackground from "../components/SkyBackground";
import AppHeader from "../components/AppHeader";
import BottomTabBar from "../components/BottomTabBar";
import { useAuth } from "../context/AuthContext";
import { useTrips } from "../hooks/useTrips";
import { tripStatus } from "../utils/trips";
import { getCountryFlagOnly } from "../utils/countryFlags";
import {
  WEEKDAYS, todayIso, monthOf, addMonths, monthIndex, monthLabel, monthWeeks, tripRange,
  weekSegments, formatRange,
} from "../utils/calendar";

// How far ahead the calendar goes (further if a trip is booked later than this)
const MONTHS_AHEAD = 12;

// Solid colors for trip bars, picked per trip so each keeps its color across months
const BAR_COLORS = [
  "bg-indigo-500", "bg-pink-500", "bg-emerald-500", "bg-orange-500",
  "bg-cyan-500", "bg-violet-500", "bg-lime-600", "bg-rose-500",
];
const colorFor = (id) => BAR_COLORS[[...String(id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % BAR_COLORS.length];

const LANE_HEIGHT = 22; // px per stacked trip bar

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rawTrips = [], isLoading } = useTrips();
  const today = todayIso();
  // ?month=2026-11 opens on that month (the dashboard's mini calendar links here)
  const [searchParams] = useSearchParams();
  const [shown, setShown] = useState(() => {
    const month = searchParams.get("month");
    return /^\d{4}-\d{2}$/.test(month || "") ? monthOf(`${month}-01`) : monthOf(today);
  });

  // Trips that have dates, oldest first, with their range and status
  const trips = useMemo(
    () =>
      rawTrips
        .map((t) => {
          const range = tripRange(t);
          if (!range) return null;
          return {
            ...range,
            id: t.id,
            name: t.destination || "Untitled trip",
            cities: t.cities || [],
            status: tripStatus(t),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [rawTrips]
  );

  // From the month the account was created to a year out (stretched to fit any trip)
  const minMonth = useMemo(() => {
    const created = monthOf(user?.created_at?.slice(0, 10) || today);
    const firstTrip = trips[0] ? monthOf(trips[0].start) : created;
    return monthIndex(firstTrip) < monthIndex(created) ? firstTrip : created;
  }, [user, trips, today]);
  const maxMonth = useMemo(() => {
    const yearOut = addMonths(monthOf(today), MONTHS_AHEAD);
    const lastTrip = trips.length ? monthOf(trips.reduce((m, t) => (t.end > m ? t.end : m), today)) : yearOut;
    return monthIndex(lastTrip) > monthIndex(yearOut) ? lastTrip : yearOut;
  }, [trips, today]);

  const canGoBack = monthIndex(shown) > monthIndex(minMonth);
  const canGoForward = monthIndex(shown) < monthIndex(maxMonth);

  // Next/previous trip: the first trip starting after this month, or the last one before it
  const nextTrip = trips.find((t) => monthIndex(monthOf(t.start)) > monthIndex(shown));
  const prevTrip = [...trips].reverse().find((t) => monthIndex(monthOf(t.start)) < monthIndex(shown));

  const weeks = useMemo(() => monthWeeks(shown), [shown]);
  const monthPrefix = `${shown.year}-${String(shown.month + 1).padStart(2, "0")}`;
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = `${monthPrefix}-31`;
  const tripsThisMonth = trips.filter((t) => t.start <= monthEnd && t.end >= monthStart);

  const openTrip = (t) => navigate(t.status === "draft" ? `/drafts/${t.id}` : `/trip/${t.id}`);

  const navButton =
    "inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="relative min-h-screen pb-24 text-white sm:pb-16">
      <SkyBackground />

      <AppHeader />

      <div className="mx-auto mt-6 max-w-5xl px-4 md:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight drop-shadow md:text-4xl">My Trips Calendar</h1>

        {/* Month navigation */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setShown((m) => addMonths(m, -1))} disabled={!canGoBack} className={navButton} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <h2 className="min-w-[10.5rem] text-center text-xl font-bold drop-shadow">{monthLabel(shown)}</h2>
            <button onClick={() => setShown((m) => addMonths(m, 1))} disabled={!canGoForward} className={navButton} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
            <button onClick={() => setShown(monthOf(today))} className={`${navButton} ml-1`}>
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => prevTrip && setShown(monthOf(prevTrip.start))} disabled={!prevTrip} className={navButton}>
              <SkipBack size={16} />
              Previous trip
            </button>
            <button onClick={() => nextTrip && setShown(monthOf(nextTrip.start))} disabled={!nextTrip} className={navButton}>
              Next trip
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        {/* Month grid */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white/95 text-gray-900 shadow-2xl">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          {weeks.map((week) => {
            const segments = weekSegments(week, trips);
            const lanes = segments.reduce((n, s) => Math.max(n, s.lane + 1), 0);
            return (
              <div key={week[0]} className="relative border-b border-gray-100 last:border-b-0">
                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {week.map((iso) => {
                    const inMonth = iso.startsWith(monthPrefix);
                    const isToday = iso === today;
                    return (
                      <div
                        key={iso}
                        className={`border-r border-gray-100 px-1.5 pt-1.5 last:border-r-0 ${inMonth ? "" : "bg-gray-50/70"}`}
                        style={{ minHeight: 64 + lanes * LANE_HEIGHT }}
                      >
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                            isToday ? "bg-indigo-600 font-bold text-white" : inMonth ? "text-gray-800" : "text-gray-400"
                          }`}
                        >
                          {Number(iso.slice(8))}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Trip bars, drawn over the day cells */}
                {segments.map(({ trip, startCol, endCol, lane, continuesBefore, continuesAfter }) => (
                  <button
                    key={trip.id}
                    onClick={() => openTrip(trip)}
                    title={`${trip.name} · ${formatRange(trip)}`}
                    className={`absolute flex items-center truncate px-2 text-left text-xs font-semibold text-white shadow-sm transition hover:brightness-110 ${colorFor(trip.id)} ${
                      trip.status === "draft" ? "opacity-60 outline-dashed outline-1 outline-white" : ""
                    } ${continuesBefore ? "" : "rounded-l-md"} ${continuesAfter ? "" : "rounded-r-md"}`}
                    style={{
                      left: `calc(${(startCol / 7) * 100}% + ${continuesBefore ? 0 : 3}px)`,
                      width: `calc(${((endCol - startCol + 1) / 7) * 100}% - ${(continuesBefore ? 0 : 3) + (continuesAfter ? 0 : 3)}px)`,
                      top: 38 + lane * LANE_HEIGHT,
                      height: LANE_HEIGHT - 4,
                    }}
                  >
                    {getCountryFlagOnly(trip.name)} {trip.name}
                    {trip.status === "draft" && " · Draft"}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* This month's trips, readable on small screens */}
        <div className="mt-6 rounded-2xl bg-white/15 p-5 ring-1 ring-white/20 backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Trips in {monthLabel(shown)}
          </h3>
          {isLoading ? (
            <p className="mt-2 text-sm text-white/70">Loading…</p>
          ) : tripsThisMonth.length ? (
            <ul className="mt-3 space-y-2">
              {tripsThisMonth.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => openTrip(t)}
                    className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-2 text-left transition hover:bg-white/20"
                  >
                    <span className={`h-3 w-3 flex-none rounded-full ${colorFor(t.id)}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {getCountryFlagOnly(t.name)} {t.name}
                        {t.status === "draft" && <span className="font-normal text-white/70"> · Draft</span>}
                      </span>
                      {t.cities.length > 0 && <span className="block truncate text-xs text-white/70">{t.cities.join(", ")}</span>}
                    </span>
                    <span className="flex-none text-sm text-white/80">{formatRange(t)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-white/70">
              No trips this month.{nextTrip && " Use “Next trip” to jump to your next one."}
            </p>
          )}
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
