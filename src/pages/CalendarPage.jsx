import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Plus, CalendarDays } from "lucide-react";
import AppHeader from "../components/AppHeader";
import BottomTabBar from "../components/BottomTabBar";
import TripThumb from "../components/dashboard/TripThumb";
import { useAuth } from "../context/AuthContext";
import { tripName, useHomeCountry } from "../utils/tripName";
import { useTrips } from "../hooks/useTrips";
import { tripStatus } from "../utils/trips";
import { getCountryFlagOnly } from "../utils/countryFlags";
import { tripBadge, BADGE_TONES } from "../utils/dashboard";
import {
  WEEKDAYS, todayIso, monthOf, addMonths, monthIndex, monthLabel, monthWeeks, tripRange,
  weekSegments, formatRange, daysBetween,
} from "../utils/calendar";

// How far ahead the calendar goes (further if a trip is booked later than this)
const MONTHS_AHEAD = 12;
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Solid colors for trip bars, picked per trip so each keeps its color across months
const BAR_COLORS = [
  "bg-indigo-600", "bg-pink-600", "bg-emerald-600", "bg-orange-600",
  "bg-cyan-700", "bg-violet-600", "bg-lime-700", "bg-rose-600",
];
const colorFor = (id) => BAR_COLORS[[...String(id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % BAR_COLORS.length];

const LANE_HEIGHT = 24; // px per stacked trip bar
const card = "rounded-3xl bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.05)] sm:p-6";
const iconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-700 transition hover:border-violet-300 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-40";
const textButton =
  "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-40";

const monthKey = ({ year, month }) => `${year}-${String(month + 1).padStart(2, "0")}`;

// Trips calendar (dashboard style): a month grid with trip bars, a month strip to jump around
// the year, and a side column with the month's trips, what's coming up and the year in numbers.
// ?month=2026-11 opens on that month (the dashboard's mini calendar links here).
export default function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const homeCountry = useHomeCountry();
  const { data: rawTrips = [], isLoading } = useTrips();
  const today = todayIso();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shown, setShownState] = useState(() => {
    const month = searchParams.get("month");
    return /^\d{4}-\d{2}$/.test(month || "") ? monthOf(`${month}-01`) : monthOf(today);
  });
  // Keep the URL in step, so reloading or sharing the page stays on the same month
  const setShown = (next) => {
    const value = typeof next === "function" ? next(shown) : next;
    setShownState(value);
    setSearchParams({ month: monthKey(value) }, { replace: true });
  };
  const [focusId, setFocusId] = useState(null); // trip hovered in a list, highlighted on the grid

  // Trips that have dates, oldest first, with their range and status
  const trips = useMemo(
    () =>
      rawTrips
        .map((t) => {
          const range = tripRange(t);
          if (!range) return null;
          return {
            ...range,
            range,
            id: t.id,
            name: tripName(t, homeCountry) || "Untitled trip",
            cities: t.cities || [],
            status: tripStatus(t),
            isPast: range.end < today,
            isShared: !!t.user_id && t.user_id !== user?.id,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [rawTrips, today, user, homeCountry]
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
  const inRange = (m) => monthIndex(m) >= monthIndex(minMonth) && monthIndex(m) <= monthIndex(maxMonth);

  // Next/previous trip: the first trip starting after this month, or the last one before it
  const nextTrip = trips.find((t) => monthIndex(monthOf(t.start)) > monthIndex(shown));
  const prevTrip = [...trips].reverse().find((t) => monthIndex(monthOf(t.start)) < monthIndex(shown));

  const weeks = useMemo(() => monthWeeks(shown), [shown]);
  const monthPrefix = monthKey(shown);
  const overlapsMonth = (t, prefix) => t.start <= `${prefix}-31` && t.end >= `${prefix}-01`;
  const tripsThisMonth = trips.filter((t) => overlapsMonth(t, monthPrefix));

  // The shown year at a glance (dated, non-draft trips that start that year)
  const year = useMemo(() => {
    const ofYear = trips.filter((t) => t.status !== "draft" && t.start.startsWith(`${shown.year}-`));
    return {
      trips: ofYear.length,
      days: ofYear.reduce((sum, t) => sum + Math.max(1, daysBetween(t.start, t.end)), 0),
      countries: new Set(ofYear.map((t) => t.name)).size,
    };
  }, [trips, shown.year]);

  // Soonest trips that haven't ended (not drafts)
  const comingUp = trips.filter((t) => t.end >= today && t.status !== "draft").slice(0, 3);

  const openTrip = (t) => navigate(t.status === "draft" ? `/drafts/${t.id}` : `/trip/${t.id}`);

  return (
    <div className="min-h-screen bg-[#eef2f8] pb-24 text-slate-900 sm:pb-10">
      <AppHeader />

      <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-6 px-4 py-7 sm:px-6">
        {/* Main column: the month */}
        <main className="min-w-0 flex-[999_1_620px] space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">My trips calendar</h1>
              <p className="text-slate-600">Every trip you've planned or joined, month by month.</p>
            </div>
            <Link
              to="/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f2b5b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#163a75]"
            >
              <Plus size={16} />
              New itinerary
            </Link>
          </div>

          <section className={card} aria-label={`Calendar for ${monthLabel(shown)}`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setShown((m) => addMonths(m, -1))} disabled={!inRange(addMonths(shown, -1))} className={iconButton} aria-label="Previous month">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setShown((m) => addMonths(m, 1))} disabled={!inRange(addMonths(shown, 1))} className={iconButton} aria-label="Next month">
                  <ChevronRight size={18} />
                </button>
                <h2 className="ml-1 min-w-[10rem] text-xl font-extrabold" aria-live="polite">{monthLabel(shown)}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setShown(monthOf(today))} disabled={monthKey(shown) === today.slice(0, 7)} className={textButton}>
                  Today
                </button>
                <button onClick={() => prevTrip && setShown(monthOf(prevTrip.start))} disabled={!prevTrip} className={textButton}>
                  <SkipBack size={15} />
                  <span className="hidden sm:inline">Previous trip</span>
                  <span className="sm:hidden">Prev</span>
                </button>
                <button onClick={() => nextTrip && setShown(monthOf(nextTrip.start))} disabled={!nextTrip} className={textButton}>
                  <span className="hidden sm:inline">Next trip</span>
                  <span className="sm:hidden">Next</span>
                  <SkipForward size={15} />
                </button>
              </div>
            </div>

            {/* Month strip for the shown year; a dot marks months with a trip */}
            <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-1">
              <div className="flex min-w-max gap-1.5" role="group" aria-label={`Months of ${shown.year}`}>
                {SHORT_MONTHS.map((label, month) => {
                  const m = { year: shown.year, month };
                  const current = month === shown.month;
                  const hasTrip = trips.some((t) => overlapsMonth(t, monthKey(m)));
                  return (
                    <button
                      key={label}
                      onClick={() => setShown(m)}
                      disabled={!inRange(m)}
                      aria-current={current ? "date" : undefined}
                      aria-label={`${label} ${shown.year}${hasTrip ? ", has trips" : ""}`}
                      className={`relative flex h-11 w-14 flex-col items-center justify-center rounded-xl text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                        current ? "bg-[#0f2b5b] text-white" : "bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-violet-800"
                      }`}
                    >
                      {label}
                      <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${hasTrip ? (current ? "bg-pink-400" : "bg-violet-600") : "bg-transparent"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Month grid */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2.5">{d}</div>
                ))}
              </div>

              {weeks.map((week) => {
                const segments = weekSegments(week, trips);
                const lanes = segments.reduce((n, s) => Math.max(n, s.lane + 1), 0);
                return (
                  <div key={week[0]} className="relative border-b border-slate-100 last:border-b-0">
                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                      {week.map((iso, col) => {
                        const inMonth = iso.startsWith(monthPrefix);
                        const isToday = iso === today;
                        const weekend = col === 0 || col === 6;
                        return (
                          <div
                            key={iso}
                            className={`border-r border-slate-100 px-1.5 pt-1.5 last:border-r-0 ${
                              !inMonth ? "bg-slate-50" : weekend ? "bg-[#f8fafc]" : ""
                            }`}
                            style={{ minHeight: 72 + lanes * LANE_HEIGHT }}
                          >
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                                isToday
                                  ? "bg-violet-700 font-extrabold text-white"
                                  : inMonth
                                    ? "font-semibold text-slate-800"
                                    : "text-slate-400"
                              }`}
                              aria-label={isToday ? "Today" : undefined}
                            >
                              {Number(iso.slice(8))}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Trip bars, drawn over the day cells */}
                    {segments.map(({ trip, startCol, endCol, lane, continuesBefore, continuesAfter }) => {
                      const dimmed = focusId && focusId !== trip.id;
                      return (
                        <button
                          key={trip.id}
                          onClick={() => openTrip(trip)}
                          onMouseEnter={() => setFocusId(trip.id)}
                          onMouseLeave={() => setFocusId(null)}
                          title={`${trip.name} · ${formatRange(trip)}`}
                          className={`absolute flex items-center gap-1 truncate px-2 text-left text-xs font-bold text-white shadow-sm transition hover:brightness-110 ${colorFor(trip.id)} ${
                            trip.status === "draft" ? "opacity-60 outline-dashed outline-2 -outline-offset-2 outline-white/80" : ""
                          } ${trip.isPast && !focusId ? "opacity-55" : ""} ${dimmed ? "opacity-25" : ""} ${
                            continuesBefore ? "" : "rounded-l-lg"
                          } ${continuesAfter ? "" : "rounded-r-lg"}`}
                          style={{
                            left: `calc(${(startCol / 7) * 100}% + ${continuesBefore ? 0 : 4}px)`,
                            width: `calc(${((endCol - startCol + 1) / 7) * 100}% - ${(continuesBefore ? 0 : 4) + (continuesAfter ? 0 : 4)}px)`,
                            top: 40 + lane * LANE_HEIGHT,
                            height: LANE_HEIGHT - 4,
                          }}
                        >
                          <span className="truncate">
                            {getCountryFlagOnly(trip.name)} {trip.name}
                            {trip.status === "draft" && " · Draft"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-600">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-700 text-[11px] font-bold text-white">{Number(today.slice(8))}</span>
                Today
              </span>
              <span className="flex items-center gap-2"><span className="h-3 w-6 rounded bg-indigo-600" /> Trip</span>
              <span className="flex items-center gap-2"><span className="h-3 w-6 rounded bg-indigo-600 opacity-55" /> Past trip</span>
              <span className="flex items-center gap-2"><span className="h-3 w-6 rounded border-2 border-dashed border-indigo-400 bg-indigo-100" /> Draft</span>
            </div>
          </section>
        </main>

        {/* Side column */}
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
          <section className={card}>
            <h2 className="flex items-center gap-2 text-base font-extrabold">
              In {SHORT_MONTHS[shown.month]} {shown.year}
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-sm text-violet-800">{tripsThisMonth.length}</span>
            </h2>
            {isLoading ? (
              <div className="mt-3 space-y-2">
                <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : tripsThisMonth.length ? (
              <ul className="mt-3 space-y-1">
                {tripsThisMonth.map((t) => {
                  const badge = t.isPast ? { label: "Past", tone: "slate" } : tripBadge(t);
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => openTrip(t)}
                        onMouseEnter={() => setFocusId(t.id)}
                        onMouseLeave={() => setFocusId(null)}
                        onFocus={() => setFocusId(t.id)}
                        onBlur={() => setFocusId(null)}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50"
                      >
                        <span className="relative flex-none">
                          <TripThumb country={t.name} className={`h-12 w-16 rounded-lg ${t.isPast ? "opacity-70" : ""}`} flagSize="text-xl" />
                          <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white ${colorFor(t.id)}`} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-extrabold">{getCountryFlagOnly(t.name)} {t.name}</span>
                            {t.isShared && <span className="flex-none rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">Shared</span>}
                          </span>
                          <span className="block truncate text-[13px] text-slate-600">
                            {[formatRange(t), t.cities.join(", ")].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className={`hidden flex-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold min-[420px]:inline ${BADGE_TONES[badge.tone]}`}>
                          {badge.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-3 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-6 text-center">
                <CalendarDays className="mx-auto text-slate-300" size={28} aria-hidden="true" />
                <p className="mt-2 text-sm font-bold text-slate-800">No trips this month</p>
                {nextTrip ? (
                  <button onClick={() => setShown(monthOf(nextTrip.start))} className="mt-1 text-sm font-bold text-violet-700 hover:underline">
                    Jump to {nextTrip.name} ({formatRange(nextTrip)})
                  </button>
                ) : (
                  <Link to="/new" className="mt-1 inline-block text-sm font-bold text-violet-700 hover:underline">
                    Plan a trip
                  </Link>
                )}
              </div>
            )}
          </section>

          {comingUp.length > 0 && (
            <section className={card}>
              <h2 className="text-base font-extrabold">Coming up</h2>
              <ul className="mt-3 space-y-2">
                {comingUp.map((t) => {
                  const badge = tripBadge(t);
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setShown(monthOf(t.start))}
                        className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-100 p-3 text-left transition hover:border-violet-200"
                        aria-label={`Show ${t.name} on the calendar`}
                      >
                        <span className={`h-9 w-1.5 flex-none rounded-full ${colorFor(t.id)}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{getCountryFlagOnly(t.name)} {t.name}</span>
                          <span className="block text-[13px] text-slate-600">{formatRange(t)}</span>
                        </span>
                        <span className={`flex-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${BADGE_TONES[badge.tone]}`}>
                          {badge.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="rounded-3xl bg-[#0f2b5b] p-5 text-white">
            <h2 className="text-base font-extrabold">{shown.year} at a glance</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { value: year.trips, label: year.trips === 1 ? "trip" : "trips" },
                { value: year.days, label: year.days === 1 ? "day away" : "days away" },
                { value: year.countries, label: year.countries === 1 ? "country" : "countries" },
              ].map((i) => (
                <div key={i.label} className="rounded-2xl bg-white/10 px-1 py-3">
                  <div className="text-2xl font-extrabold">{i.value}</div>
                  <div className="text-xs text-slate-300">{i.label}</div>
                </div>
              ))}
            </div>
            {year.trips === 0 && <p className="mt-3 text-xs text-slate-300">No trips in {shown.year} yet.</p>}
          </section>
        </aside>
      </div>
      <BottomTabBar />
    </div>
  );
}
