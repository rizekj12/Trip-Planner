import React, { useState, useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu as MenuIcon, ArrowLeft } from "lucide-react";
import DayMap from "../components/DayMap";
import ItineraryCard from "../components/ItineraryCard";
import SideNav from "../components/SideNav";
import SkyBackground from "../components/SkyBackground";
import EventsPanel from "../components/EventsPanel";
import ProfileMenu from "../components/ProfileMenu";
import LoadingScreen from "../components/LoadingScreen";
import { useTrip } from "../hooks/useTrips";
import { getCountryFlag } from "../utils/countryFlags";

const toMarker = (it, idx) =>
  it && it.coords
    ? { id: `m-${idx}`, title: it.title, coords: it.coords }
    : null;

export default function TripPage() {
  const { tripId } = useParams();
  const { data: trip, isLoading, error } = useTrip(tripId);

  if (isLoading) return <LoadingScreen />;
  if (error || !trip) return <LoadingScreen message="Trip not found." />;

  const { _form_data, _draft, ...itinerary } = trip.itinerary_data || {};
  if (_draft) return <Navigate to={`/drafts/${tripId}`} replace />;
  if (!itinerary.days?.length) return <LoadingScreen message="This trip has no itinerary." />;

  return (
    <TripView
      itinerary={itinerary}
      formData={_form_data || { country: trip.destination, cities: [] }}
    />
  );
}

function TripView({ itinerary, formData }) {
  const [tab, setTab] = useState(itinerary.days[0].key);
  const [navOpen, setNavOpen] = useState(false);
  const [section, setSection] = useState("days");

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
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15 text-white backdrop-blur ring-1 ring-white/20 hover:bg-white/25 transition text-sm"
        >
          <ArrowLeft size={16} />
          My Trips
        </Link>
        <ProfileMenu />
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

      {/* Menu Button */}
      <div className="mb-3 ml-4 flex">
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
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={section === "events" ? "events" : tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {section === "events" ? (
              <EventsPanel events={itinerary.events || []} />
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
      />

      {/* Back / New Trip Buttons */}
      <div className="fixed bottom-8 right-8 flex gap-3 z-40">
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
      </div>
    </div>
  );
}
