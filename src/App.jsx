import React, { useState, useMemo } from "react";
import TripQuestionnaire from "./components/trip-generator/TripQuestionnaire";
import { generateItinerary } from "./utils/aiService";
import DayMap from "./components/DayMap";
import ItineraryCard from "./components/ItineraryCard";
import { Menu as MenuIcon } from "lucide-react";
import SideNav from "./components/SideNav";
import { AnimatePresence, motion } from "framer-motion";
import { gmaps } from "./utils/helpers";
import SkyBackground from "./components/SkyBackground";

export default function App() {
  // ALL STATE AND HOOKS AT THE TOP (before any conditionals)
  const [showQuestionnaire, setShowQuestionnaire] = useState(true);
  const [generatedTrip, setGeneratedTrip] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("d1");
  const [navOpen, setNavOpen] = useState(false);

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
    setError(null);

    try {
      // Pass useMock flag to force mock data
      const itinerary = await generateItinerary(formData, useMock);
      console.log('Generated Itinerary:', itinerary);
      setGeneratedTrip(itinerary);
      setShowQuestionnaire(false);
      setTab(itinerary.days[0].key);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate itinerary. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleNewTrip = () => {
    setGeneratedTrip(null);
    setShowQuestionnaire(true);
    setTab("d1");
  };

  // RENDER: Show questionnaire
  if (showQuestionnaire && !generatedTrip) {
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
  if (generatedTrip && activeDay) {
    return (
      <div
        className="min-h-screen text-white relative"
      >
        <SkyBackground />

        {/* Header */}
        <div className="px-6 py-12 md:px-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold tracking-tight drop-shadow md:text-6xl"
          >
            Your Trip Itinerary ✈️
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
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
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
          onSelectDay={(k) => { setTab(k); setNavOpen(false); }}
          onSelectSection={() => { }}
          currentSection="days"
          theme={theme}
        />

        {/* New Trip Button */}
        <button
          onClick={handleNewTrip}
          className="fixed bottom-8 right-8 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold z-40"
        >
          Create New Trip
        </button>
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