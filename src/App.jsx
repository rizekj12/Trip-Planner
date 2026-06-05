import React, { useState, useMemo, useEffect } from "react";
import TripQuestionnaire from "./components/trip-generator/TripQuestionnaire";
import { generateItinerary } from "./utils/aiService";
import DayMap from "./components/DayMap";
import ItineraryCard from "./components/ItineraryCard";
import { Menu as MenuIcon, ArrowLeft } from "lucide-react";
import SideNav from "./components/SideNav";
import { AnimatePresence, motion } from "framer-motion";
import { gmaps } from "./utils/helpers";
import SkyBackground from "./components/SkyBackground";
import EventsPanel from "./components/EventsPanel";
import TripsDashboard from "./components/TripsDashboard";
import { saveTrip, fetchTrip } from "./utils/trips";
import { getCountryFlag } from "./utils/countryFlags";

export default function App() {
  // ALL STATE AND HOOKS AT THE TOP (before any conditionals)
  const [view, setView] = useState("dashboard"); // "dashboard" | "questionnaire" | "trip"
  const [generatedTrip, setGeneratedTrip] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("d1");
  const [navOpen, setNavOpen] = useState(false);
  const [tripFormData, setTripFormData] = useState(null);
  const [section, setSection] = useState("days");

  // Push a history entry when entering a non-dashboard view so browser back works
  useEffect(() => {
    if (view !== "dashboard") {
      history.pushState({ view }, "");
    }
    const onPop = () => setView("dashboard");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [view]);

  // ALL useMemo hooks at the top (they'll return null if generatedTrip is null)
  const activeDay = useMemo(
    () => generatedTrip?.days.find(d => d.key === tab) || null,
    [tab, generatedTrip]
  );


  const toMarker = (it, idx) =>
    it && it.coords
      ? { id: `m-${idx}`, title: it.title, coords: it.coords }
      : null;

  const dayItems = useMemo(() => {
    if (!activeDay || !generatedTrip) return [];
    const keys = activeDay.markers || [];
    return keys.map((k, i) => toMarker(generatedTrip.spots[k], i)).filter(Boolean);
  }, [activeDay, generatedTrip]);

  const hotelMarker = useMemo(() => {
    if (!activeDay?.hotel) return null;
    return {
      id: `hotel-${activeDay.hotel.key || 'main'}`,
      title: activeDay.hotel.name || "Hotel",
      coords: activeDay.hotel.coords,
      isHotel: true,
      type: "hotel",
    };
  }, [activeDay]);

  const mapItems = useMemo(() => {
    let items = dayItems;
    if (hotelMarker) {
      items = [hotelMarker, ...items];
    }
    return items;
  }, [dayItems, hotelMarker]);

  const tabs = useMemo(() => {
    if (!generatedTrip) return [];
    return generatedTrip.days.map((d, i) => ({
      key: d.key,
      label: `Day ${i + 1}`,
      date: d.date
    }));
  }, [generatedTrip]);

  // Simple theme
  const theme = {
    card: "bg-white/95 backdrop-blur-sm text-gray-900",
    header: "bg-indigo-100 text-indigo-900",
    sub: "bg-gray-50 text-gray-800"
  };

  // EVENT HANDLERS
  const handleTripComplete = async (formData, useMock = false) => {
    console.log('Form Data:', formData);
    setIsGenerating(true);
    setTripFormData(formData);
    setError(null);

    try {
      const itinerary = await generateItinerary(formData, useMock);
      console.log('Generated Itinerary:', itinerary);
      setGeneratedTrip(itinerary);
      setTab(itinerary.days[0].key);
      setView("trip");
      // Save to Supabase in background (non-blocking)
      saveTrip({ country: formData.country, formData, itinerary }).catch(console.error);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate itinerary. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleOpenTrip = async (id) => {
    try {
      const saved = await fetchTrip(id);
      const { _form_data, ...itinerary } = saved.itinerary_data;
      setGeneratedTrip(itinerary);
      setTripFormData(_form_data || { country: saved.destination, cities: [] });
      setTab(itinerary.days[0].key);
      setView("trip");
    } catch (err) {
      console.error("Failed to load trip:", err);
    }
  };

  const handleNewTrip = () => {
    setGeneratedTrip(null);
    setTab("d1");
    setView("questionnaire");
  };

  const handleBackToDashboard = () => {
    setView("dashboard");
    setGeneratedTrip(null);
    setTab("d1");
  };

  // RENDER: Dashboard
  if (view === "dashboard") {
    return <TripsDashboard onNewTrip={handleNewTrip} onOpenTrip={handleOpenTrip} />;
  }

  // RENDER: Show questionnaire
  if (view === "questionnaire") {
    return (
      <div>
        <TripQuestionnaire
          onComplete={handleTripComplete}
          isGenerating={isGenerating}
        />

        {error && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl max-w-md z-50">
            <p className="font-semibold">Oops! Something went wrong</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-3 text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  // RENDER: Show generated itinerary
  if (view === "trip" && generatedTrip && activeDay) {
    return (
      <div
        className="min-h-screen text-white relative"
      >
        <SkyBackground />

        {/* Header */}
        <div className="px-6 pt-6 pb-0 md:px-12">
          <button
            onClick={handleBackToDashboard}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15 text-white backdrop-blur ring-1 ring-white/20 hover:bg-white/25 transition text-sm mb-6"
          >
            <ArrowLeft size={16} />
            My Trips
          </button>
        </div>
        <div className="px-6 pb-12 md:px-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold tracking-tight drop-shadow md:text-6xl"
          >
            Your {tripFormData?.country ? `${tripFormData.country} ` : ''}Trip Itinerary {getCountryFlag(tripFormData?.country)}
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
                // Show Events Panel
                <EventsPanel events={generatedTrip?.events || []}
                  theme={theme} />
              ) : (
                // Show Day View (existing code)
                <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                  {/* Map */}
                  <div className="md:col-span-3">
                    <DayMap
                      items={mapItems}
                      hotels={[]}
                      theme={theme}
                      themeKey="default"
                    />
                  </div>
                  {/* Itinerary */}
                  <div className="md:col-span-2">
                    <ItineraryCard
                      day={activeDay}
                      spots={generatedTrip.spots}
                      theme={theme}
                      gmaps={gmaps}
                      extraItems={[]}
                    />
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
          days={generatedTrip.days}
          activeDayKey={tab}
          onSelectDay={(k) => { setTab(k); setSection("days"); setNavOpen(false); }}
          onSelectSection={(s) => {
            setSection(s);
            setNavOpen(false);
          }}
          currentSection={section}
          theme={theme}
        />

        {/* Back / New Trip Buttons */}
        <div className="fixed bottom-8 right-8 flex gap-3 z-40">
          <button
            onClick={handleBackToDashboard}
            className="px-5 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all font-semibold backdrop-blur"
          >
            My Trips
          </button>
          <button
            onClick={handleNewTrip}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            New Trip
          </button>
        </div>
      </div>
    );
  }

  // Fallback: Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <p className="text-white text-xl">Loading...</p>
    </div>
  );
}