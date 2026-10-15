import React, { useMemo, useRef } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import DayMap from "../components/DayMap";
import EventsPanel from "../components/EventsPanel";
import FoodSpotsPanel from "../components/FoodSpotsPanel";
import ReservationsPanel from "../components/reservations/ReservationsPanel";
import MyReservationsPanel from "../components/reservations/MyReservationsPanel";
import CrewPanel from "../components/crew/CrewPanel";
import PhotosPanel from "../components/photos/PhotosPanel";
import TripHeader from "../components/trip/TripHeader";
import DayStrip from "../components/trip/DayStrip";
import DayDetails from "../components/trip/DayDetails";
import DayPager from "../components/trip/DayPager";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "../components/LoadingScreen";
import GeneratingScreen from "../components/GeneratingScreen";
import { useTrip, useStartGeneration, useDownloadPdf } from "../hooks/useTrips";
import { tripStatus } from "../utils/trips";
import { describeDays } from "../utils/itineraryDays";

const toMarker = (it, idx) =>
  it && it.coords
    ? { id: `m-${idx}`, title: it.title, coords: it.coords }
    : null;

export default function TripPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  // useTrip re-checks every few seconds while pending, so this flips to the itinerary on its own
  const { data: trip, isLoading, error } = useTrip(tripId);

  if (isLoading) return <LoadingScreen />;
  if (error || !trip) return <LoadingScreen message="Trip not found." />;

  const { _form_data, ...itinerary } = trip.itinerary_data || {};
  const formData = _form_data || { country: trip.destination, cities: [] };
  // Travel partners can see shared trips but not change them (see supabase/migrations)
  const viewer = trip.user_id === user?.id ? "owner" : "member";

  switch (tripStatus(trip)) {
    case "draft":
      return <Navigate to={`/drafts/${tripId}`} replace />;
    case "pending":
      return <GeneratingScreen formData={formData} />;
    case "failed":
      return <FailedScreen tripId={tripId} formData={formData} error={trip.error} canRetry={viewer === "owner"} />;
  }

  if (!itinerary.days?.length) return <LoadingScreen message="This trip has no itinerary." />;
  return (
    <TripView
      tripId={tripId}
      itinerary={itinerary}
      formData={formData}
      foodSpots={trip.foodSpots || {}}
      homebases={trip.homebases || {}}
      viewer={viewer}
    />
  );
}

function FailedScreen({ tripId, formData, error, canRetry }) {
  const retry = useStartGeneration();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#eef2f8] px-6 text-center text-slate-900">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-2xl font-extrabold">We couldn't create this itinerary</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error || "Something went wrong while generating your trip."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 font-bold transition hover:border-violet-300"
          >
            My Trips
          </Link>
          {canRetry && <button
            onClick={() => retry.mutate({ id: tripId, formData })}
            disabled={retry.isPending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 font-bold text-white transition hover:bg-violet-800 disabled:opacity-60"
          >
            {retry.isPending ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
            Try again
          </button>}
        </div>
      </div>
    </div>
  );
}

// viewer: "owner" (everything), "member" (a travel partner: view-only trip, plus their own
// private reservations), or "guest" (no account: the same, opened from their personal link,
// `guestToken`). `crew` is the guest's copy of who's going (signed-in viewers load it themselves).
//
// Layout (mobile first): navy header with the section tabs, then for the itinerary a day strip
// (every day, with arrows) pinned to the top, the day's title, its map, the plan, and
// previous/next day at the bottom. Swiping the plan left or right also changes day.
// ?section=food (etc.) and ?day=3 open straight on a section or day.
export function TripView({ tripId, itinerary, formData, foodSpots, homebases, viewer = "owner", crew, guestToken }) {
  const pdf = useDownloadPdf();
  const [searchParams, setSearchParams] = useSearchParams();
  const days = useMemo(() => describeDays(itinerary.days, formData), [itinerary.days, formData]);

  const sections = [
    { id: "days", label: "Itinerary" },
    { id: "events", label: "Local events" },
    { id: "food", label: "Food spots" },
    { id: "photos", label: "Photos" },
    { id: "reservations", label: viewer === "owner" ? "Reservations" : "My reservations" },
    { id: "crew", label: "Travel crew" },
  ];
  const section = sections.some((s) => s.id === searchParams.get("section")) ? searchParams.get("section") : "days";
  const dayParam = Number(searchParams.get("day"));
  const dayIndex = Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= days.length ? dayParam - 1 : 0;
  const activeDay = itinerary.days[dayIndex];

  // Section and day live in the URL, so reloading, sharing a link or the back button keep them
  const setParams = (changes) =>
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([k, v]) => (v == null ? next.delete(k) : next.set(k, v)));
        return next;
      },
      { replace: true }
    );
  const openSection = (id) => setParams({ section: id === "days" ? null : id });
  const dayTop = useRef(null);
  const selectDay = (i) => {
    if (i < 0 || i >= days.length) return;
    setParams({ day: i === 0 ? null : String(i + 1) });
    // Scrolled past the day's title (e.g. using previous/next at the bottom, or the pinned
    // strip mid-way down): go back up so the new day starts at its title and map
    if (dayTop.current && dayTop.current.getBoundingClientRect().top < 0) {
      dayTop.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const swipe = useSwipe({ onLeft: () => selectDay(dayIndex + 1), onRight: () => selectDay(dayIndex - 1) });

  const mapItems = useMemo(() => {
    const items = (activeDay.markers || [])
      .map((k, i) => toMarker(itinerary.spots[k], i))
      .filter(Boolean);
    if (!activeDay.hotel) return items;
    const hotelMarker = {
      id: `hotel-${activeDay.hotel.key || 'main'}`,
      title: activeDay.hotel.name || "Hotel",
      coords: activeDay.hotel.coords,
      isHotel: true,
      type: "hotel",
    };
    return [hotelMarker, ...items];
  }, [activeDay, itinerary]);

  const meta = days[dayIndex];

  return (
    <div className="min-h-screen bg-[#eef2f8] text-slate-900">
      <TripHeader
        tripId={tripId}
        formData={formData}
        days={days}
        viewer={viewer}
        crew={crew}
        sections={sections}
        section={section}
        onSection={openSection}
        pdf={{
          download: () => pdf.mutate({ id: tripId, destination: formData.country, isOwner: viewer === "owner" }),
          busy: pdf.isPending,
          error: pdf.error?.message,
        }}
      />

      <main className="mx-auto max-w-6xl px-3 pb-16 sm:px-6">
        {section === "days" ? (
          <>
            <DayStrip days={days} index={dayIndex} onSelect={selectDay} />

            <div ref={dayTop} className="scroll-mt-32 px-1 pb-3 pt-2 sm:pt-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-violet-700 sm:text-[13px]">
                Day {meta.n} of {days.length}
                {meta.longDate && ` · ${meta.longDate}`}
                {meta.city && ` · ${meta.city}`}
              </p>
              <h2 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight sm:text-[28px]">{meta.title}</h2>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={meta.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-4 md:grid-cols-5 md:gap-6"
              >
                {/* Map: big on desktop and kept in view while reading the plan */}
                <div className="md:col-span-3">
                  {/* isolate: Leaflet's layers use z-index up to 1000; keep them under the pinned day strip */}
                  <div className="isolate md:sticky md:top-32">
                    <DayMap items={mapItems} heightClass="h-[22rem] sm:h-96 md:h-[480px]" />
                  </div>
                </div>
                <div className="md:col-span-2" {...swipe}>
                  <DayDetails day={activeDay} spots={itinerary.spots} />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6">
              <DayPager days={days} index={dayIndex} onSelect={selectDay} />
            </div>
          </>
        ) : (
          <div className="pt-4 sm:pt-6">
            {section === "events" ? (
              <EventsPanel
                tripId={tripId}
                events={itinerary.events || []}
                source={itinerary._events_source}
                checkedAt={itinerary._events_checked_at}
                cities={(formData.cities || []).map((c) => c.name).filter(Boolean)}
                canRefresh={viewer === "owner"}
              />
            ) : section === "reservations" ? (
              // Everyone sees only their own codes: the organizer's live with the trip, a
              // partner's in their own private list (server/memberReservations.js)
              viewer === "owner" ? (
                <ReservationsPanel tripId={tripId} formData={formData} />
              ) : (
                <MyReservationsPanel tripId={tripId} guestToken={viewer === "guest" ? guestToken : undefined} />
              )
            ) : section === "photos" ? (
              <PhotosPanel tripId={tripId} guestToken={viewer === "guest" ? guestToken : undefined} days={days} />
            ) : section === "crew" ? (
              <CrewPanel tripId={tripId} destination={formData.country} crew={crew} />
            ) : (
              <FoodSpotsPanel
                tripId={tripId}
                cities={(formData.cities || []).map((c) => c.name).filter(Boolean)}
                foodSpots={foodSpots}
                homebases={homebases}
                readOnly={viewer !== "owner"}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Horizontal swipe on touch screens: spread the returned handlers onto an element. Ignores
// mostly-vertical moves (scrolling) and short ones.
function useSwipe({ onLeft, onRight }, minDistance = 60) {
  const start = useRef(null);
  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      (dx < 0 ? onLeft : onRight)();
    },
  };
}
