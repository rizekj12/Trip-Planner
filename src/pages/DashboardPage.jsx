import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, MoreVertical, RotateCcw, Download, Loader2, Compass, LogOut } from "lucide-react";
import { useTrips, useDeleteTrip, useStartGeneration, useDownloadPdf } from "../hooks/useTrips";
import { useClickOutside } from "../hooks/useClickOutside";
import { useAuth } from "../context/AuthContext";
import AppHeader from "../components/AppHeader";
import BottomTabBar from "../components/BottomTabBar";
import TripThumb from "../components/dashboard/TripThumb";
import NextTripCard from "../components/dashboard/NextTripCard";
import FirstTripHero from "../components/dashboard/FirstTripHero";
import { MiniCalendar, TravelStats, TripIdeas } from "../components/dashboard/Sidebar";
import { getCountryFlagOnly } from "../utils/countryFlags";
import { formatRange, monthOf, todayIso } from "../utils/calendar";
import { describeTrips, tripBadge, travelStats, firstName, BADGE_TONES } from "../utils/dashboard";

// ⋮ menu; `actions` is a list of { label, icon, onClick, danger? }. `busy` swaps the dots
// for a spinner (e.g. while a PDF is being prepared). `onPhoto` styles it for use over an image.
function TripCardMenu({ actions, disabled, busy, onPhoto = false }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || busy}
        aria-label={busy ? "Preparing PDF" : "Trip options"}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
          onPhoto ? "bg-black/35 text-white hover:bg-black/55" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-gray-100 bg-white py-1 text-sm shadow-xl">
          {actions.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              onClick={() => { setOpen(false); onClick(); }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-gray-700 transition ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-indigo-50 hover:text-indigo-700"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const card = "rounded-3xl bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.05)] sm:p-6";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: trips = [], isLoading: loading } = useTrips();
  const deleteMutation = useDeleteTrip();
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null;
  const retry = useStartGeneration();
  const pdf = useDownloadPdf();
  const pdfTripId = pdf.isPending ? pdf.variables?.id : null;

  const { upcoming, past, next } = useMemo(() => describeTrips(trips), [trips]);
  const stats = useMemo(() => travelStats(past), [past]);
  const name = firstName(user);
  // The mini calendar shows the next trip's month, or this month
  const today = todayIso();
  const calendarMonth = monthOf(next && next.range.start > today ? next.range.start : today);

  // Trips friends invited the user to (supabase/migrations): view-only, so no Retry/Delete
  const isShared = (trip) => trip.user_id && trip.user_id !== user?.id;

  const menuActions = ({ trip, status }) => [
    ...(status === "ready" ? [{ label: "Download PDF", icon: Download, onClick: () => pdf.mutate(trip) }] : []),
    // Leaving happens on the trip's Travel Crew tab, which knows the membership to remove
    ...(isShared(trip) ? [{ label: "Leave trip…", icon: LogOut, danger: true, onClick: () => navigate(`/trip/${trip.id}?section=crew`) }] : []),
  ].concat(isShared(trip) ? [] : [

    ...(status === "failed"
      ? [{ label: "Retry", icon: RotateCcw, onClick: () => retry.mutate({ id: trip.id, formData: trip.itinerary_data?._form_data }) }]
      : []),
    { label: "Delete", icon: Trash2, danger: true, onClick: () => deleteMutation.mutate(trip.id) },
  ]);

  // Clicking a trip opens it: drafts go back to the questionnaire, everything else to the
  // trip page (which shows the itinerary, the loading screen, or the failed screen)
  const openProps = ({ trip, status }) => {
    const open = () => navigate(status === "draft" ? `/drafts/${trip.id}` : `/trip/${trip.id}`);
    return {
      role: "button",
      tabIndex: 0,
      onClick: open,
      onKeyDown: (e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          open();
        }
      },
    };
  };

  return (
    <div className="min-h-screen bg-[#eef2f8] pb-24 text-slate-900 sm:pb-0">
      <AppHeader />

      {loading ? (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      ) : trips.length === 0 ? (
        <FirstTripHero name={name} />
      ) : (
        <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-6 px-4 py-7 sm:px-6">
          {/* Main column */}
          <main className="min-w-0 flex-[999_1_620px] space-y-6">
            <p className="text-2xl font-extrabold tracking-tight">Welcome back{name ? `, ${name}` : ""}</p>

            {next ? (
              <NextTripCard
                entry={next}
                onDownloadPdf={() => pdf.mutate(next.trip)}
                downloading={pdfTripId === next.trip.id}
                isOwner={!isShared(next.trip)}
              />
            ) : (
              <section className="flex flex-wrap items-center gap-5 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Compass size={28} />
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-extrabold">Nothing booked yet — where to next?</h1>
                  <p className="text-slate-600">Plan your next trip and we'll count down the days with you.</p>
                </div>
                <Link to="/new" className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700">
                  New itinerary
                </Link>
              </section>
            )}

            {/* Upcoming trips */}
            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-extrabold">
                  Upcoming trips
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-sm text-violet-800">{upcoming.length}</span>
                </h2>
                <Link
                  to="/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f2b5b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#163a75]"
                >
                  <Plus size={16} />
                  New itinerary
                </Link>
              </div>
              {upcoming.length ? (
                <ul className="mt-3">
                  {upcoming.map((entry) => {
                    const { trip, range, status } = entry;
                    const badge = tripBadge(entry);
                    const cities = trip.cities || [];
                    return (
                      <li
                        key={trip.id}
                        {...openProps(entry)}
                        className="flex cursor-pointer items-center gap-4 border-t border-slate-100 px-1 py-3 transition hover:bg-slate-50"
                      >
                        <TripThumb
                          country={trip.destination}
                          className={`h-16 w-24 flex-none rounded-xl ${status === "draft" ? "opacity-70" : ""}`}
                          flagSize="text-2xl"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 truncate font-extrabold">
                            <span className="truncate">{getCountryFlagOnly(trip.destination)} {trip.destination || "Untitled trip"}</span>
                            {isShared(trip) && (
                              <span className="flex-none rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">Shared</span>
                            )}
                          </span>
                          <span className="block truncate text-sm text-slate-600">
                            {[cities.join(", "), range ? formatRange(range) : "Dates not set"].filter(Boolean).join(" · ")}
                          </span>
                          <span className={`mt-1 inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold sm:hidden ${BADGE_TONES[badge.tone]}`}>
                            {badge.label}
                          </span>
                        </span>
                        <span className={`hidden whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold sm:inline ${BADGE_TONES[badge.tone]}`}>
                          {badge.label}
                        </span>
                        <TripCardMenu actions={menuActions(entry)} disabled={deletingId === trip.id} busy={pdfTripId === trip.id} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-6 text-center text-slate-600">
                  No upcoming trips. Start one with <span className="font-semibold">New itinerary</span>.
                </p>
              )}
            </section>

            {/* Past trips */}
            <section className="rounded-3xl bg-slate-200/80 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                Past trips
                <span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-slate-700">{past.length}</span>
              </h2>
              {past.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
                  {past.map((entry) => {
                    const { trip, range } = entry;
                    return (
                      <div key={trip.id} {...openProps(entry)} className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white">
                        <div className="h-24 overflow-hidden">
                          <TripThumb country={trip.destination} muted className="h-24 w-full transition group-hover:scale-105" flagSize="text-4xl" />
                        </div>
                        <div className="absolute right-2 top-2">
                          <TripCardMenu actions={menuActions(entry)} disabled={deletingId === trip.id} busy={pdfTripId === trip.id} onPhoto />
                        </div>
                        <div className="px-3 py-2.5">
                          <div className="truncate text-sm font-bold">
                            {getCountryFlagOnly(trip.destination)} {trip.destination}
                          </div>
                          <div className="text-xs text-slate-600">
                            {new Date(`${range.start}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-slate-600">Trips you've taken will show up here.</p>
              )}
            </section>
          </main>

          {/* Sidebar (below the main column on phones) */}
          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
            <MiniCalendar month={calendarMonth} trips={upcoming.concat(past)} />
            <TravelStats stats={stats} />
            <TripIdeas exclude={upcoming.map((t) => t.trip.destination)} />
          </aside>
        </div>
      )}

      <BottomTabBar />

      {pdf.isError && (
        <div className="fixed bottom-24 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-xl bg-red-500 px-4 py-3 text-sm text-white shadow-2xl sm:bottom-6">
          <span>Couldn't create the PDF: {pdf.error.message}</span>
          <button onClick={() => pdf.reset()} className="font-semibold underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}
