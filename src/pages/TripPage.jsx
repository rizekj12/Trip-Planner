import React, { useState, useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu as MenuIcon, ArrowLeft, AlertTriangle, RotateCcw, Loader2, Download, Plane } from "lucide-react";
import DayMap from "../components/DayMap";
import ItineraryCard from "../components/ItineraryCard";
import SideNav from "../components/SideNav";
import SkyBackground from "../components/SkyBackground";
import EventsPanel from "../components/EventsPanel";
import FoodSpotsPanel from "../components/FoodSpotsPanel";
import ReservationsPanel from "../components/reservations/ReservationsPanel";
import MyReservationsPanel from "../components/reservations/MyReservationsPanel";
import ProfileMenu from "../components/ProfileMenu";
import CrewBubbles from "../components/crew/CrewBubbles";
import CrewPanel from "../components/crew/CrewPanel";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "../components/LoadingScreen";
import GeneratingScreen from "../components/GeneratingScreen";
import { useTrip, useStartGeneration, useDownloadPdf } from "../hooks/useTrips";
import { tripStatus } from "../utils/trips";
import { getCountryFlag } from "../utils/countryFlags";

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

  const { _form_data, _draft, _status, _started_at, _error, _food_spots, _homebases, ...itinerary } = trip.itinerary_data || {};
  const formData = _form_data || { country: trip.destination, cities: [] };
  // Travel partners can see shared trips but not change them (see supabase/travel-crew.sql)
  const viewer = trip.user_id === user?.id ? "owner" : "member";

  switch (tripStatus(trip)) {
    case "draft":
      return <Navigate to={`/drafts/${tripId}`} replace />;
    case "pending":
      return <GeneratingScreen formData={formData} />;
    case "failed":
      return <FailedScreen tripId={tripId} formData={formData} error={_error} canRetry={viewer === "owner"} />;
  }

  if (!itinerary.days?.length) return <LoadingScreen message="This trip has no itinerary." />;
  return (
    <TripView
      tripId={tripId}
      itinerary={itinerary}
      formData={formData}
      foodSpots={_food_spots || {}}
      homebases={_homebases || {}}
      viewer={viewer}
    />
  );
}

function FailedScreen({ tripId, formData, error, canRetry }) {
  const retry = useStartGeneration();

  return (
    <div className="min-h-screen text-white relative flex flex-col items-center justify-center px-6 text-center">
      <SkyBackground />
      <div className="w-full max-w-md rounded-3xl bg-white/15 p-8 ring-1 ring-white/25 backdrop-blur-md shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/30">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-2xl font-extrabold drop-shadow">We couldn't create this itinerary</h1>
        <p className="mt-2 text-sm text-white/80">
          {error || "Something went wrong while generating your trip."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="flex-1 rounded-xl bg-white/20 px-4 py-3 font-semibold hover:bg-white/30 transition"
          >
            My Trips
          </Link>
          {canRetry && <button
            onClick={() => retry.mutate({ id: tripId, formData })}
            disabled={retry.isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 font-semibold hover:shadow-lg transition disabled:opacity-60"
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
export function TripView({ tripId, itinerary, formData, foodSpots, homebases, viewer = "owner", crew, guestToken }) {
  const [tab, setTab] = useState(itinerary.days[0].key);
  const [navOpen, setNavOpen] = useState(false);
  const pdf = useDownloadPdf();
  // ?section=reservations (etc.) opens straight on that section, e.g. from the dashboard checklist
  const [searchParams] = useSearchParams();
  const [section, setSection] = useState(() =>
    ["events", "food", "crew", "reservations"].includes(searchParams.get("section"))
      ? searchParams.get("section")
      : "days"
  );

  const activeDay = useMemo(
    () => itinerary.days.find(d => d.key === tab) || itinerary.days[0],
    [tab, itinerary]
  );

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

  return (
    <div className="min-h-screen text-white relative">
      <SkyBackground />

      {/* Header */}
      <div className="px-6 pt-6 pb-0 md:px-12 flex items-center justify-between mb-6">
        {viewer === "guest" ? (
          <>
            <Link to="/" className="flex items-center gap-2 font-extrabold text-white drop-shadow">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-600">
                <Plane size={18} className="rotate-45 fill-white text-white" />
              </span>
              Trip Planner
            </Link>
            <Link to="/" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50">
              Create a free account
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15 text-white backdrop-blur ring-1 ring-white/20 hover:bg-white/25 transition text-sm"
            >
              <ArrowLeft size={16} />
              My Trips
            </Link>
            <ProfileMenu />
          </>
        )}
      </div>
      <div className="px-6 pb-12 md:px-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold tracking-tight drop-shadow md:text-6xl"
        >
          Your {formData?.country ? `${formData.country} ` : ''}Trip Itinerary {getCountryFlag(formData?.country)}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.15 }}
          className="mt-2 max-w-3xl text-base text-white drop-shadow md:text-lg"
        >
          AI-powered travel plan
        </motion.p>
      </div>

      {/* Menu + Download buttons */}
      <div className="mb-3 ml-4 mr-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setNavOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2
               bg-white/15 text-white backdrop-blur
               ring-1 ring-white/20 hover:bg-white/25 active:bg-white/20
               shadow-sm transition"
          aria-label="Open menu"
        >
          <MenuIcon size={18} className="opacity-90" />
          <span className="text-sm font-medium">Menu</span>
        </button>
        {viewer !== "guest" && <button
          onClick={() => pdf.mutate({ id: tripId, destination: formData.country, isOwner: viewer === "owner" })}
          disabled={pdf.isPending}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2
               bg-white/15 text-white backdrop-blur
               ring-1 ring-white/20 hover:bg-white/25 active:bg-white/20
               shadow-sm transition disabled:opacity-70"
          title="Save this itinerary as a PDF for offline use"
        >
          {pdf.isPending ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} className="opacity-90" />}
          <span className="text-sm font-medium">{pdf.isPending ? "Preparing PDF…" : "Download PDF"}</span>
        </button>}
        <div className="ml-auto">
          <CrewBubbles tripId={tripId} destination={formData.country} crew={crew} />
        </div>
        {pdf.isError && (
          <span className="rounded-lg bg-red-500/80 px-3 py-1.5 text-sm text-white">{pdf.error.message}</span>
        )}
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={section === "days" ? tab : section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {section === "events" ? (
              <EventsPanel events={itinerary.events || []} />
            ) : section === "reservations" ? (
              // Everyone sees only their own codes: the organizer's live with the trip, a
              // partner's in their own private list (server/memberReservations.js)
              viewer === "owner" ? (
                <ReservationsPanel tripId={tripId} formData={formData} />
              ) : (
                <MyReservationsPanel tripId={tripId} guestToken={viewer === "guest" ? guestToken : undefined} />
              )
            ) : section === "crew" ? (
              <CrewPanel tripId={tripId} destination={formData.country} crew={crew} />
            ) : section === "food" ? (
              <FoodSpotsPanel
                tripId={tripId}
                cities={(formData.cities || []).map((c) => c.name).filter(Boolean)}
                foodSpots={foodSpots}
                homebases={homebases}
                readOnly={viewer !== "owner"}
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                {/* Map */}
                <div className="md:col-span-3">
                  <DayMap items={mapItems} />
                </div>
                {/* Itinerary */}
                <div className="md:col-span-2">
                  <ItineraryCard day={activeDay} spots={itinerary.spots} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="pb-10 text-center text-sm text-white/80 drop-shadow">
        Built with ❤️ • Powered by Claude AI
      </footer>

      {/* Side Navigation */}
      <SideNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        days={itinerary.days}
        activeDayKey={tab}
        onSelectDay={(k) => { setTab(k); setSection("days"); setNavOpen(false); }}
        onSelectSection={(s) => {
          setSection(s);
          setNavOpen(false);
        }}
        currentSection={section}
        reservationsLabel={viewer === "owner" ? "Reservations" : "My reservations"}
        showCrew
      />

      {/* Back / New Trip Buttons */}
      {viewer !== "guest" && <div className="fixed bottom-8 right-8 flex gap-3 z-40">
        <Link
          to="/"
          className="px-5 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all font-semibold backdrop-blur"
        >
          My Trips
        </Link>
        <Link
          to="/new"
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
        >
          New Trip
        </Link>
      </div>}
    </div>
  );
}
