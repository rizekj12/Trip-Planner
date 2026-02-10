// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";

import HeaderBanner from "./components/HeaderBanner";
import TripQuestionnaire from "./components/trip-generator/TripQuestionnaire";
import DayMap from "./components/DayMap";
import ItineraryCard from "./components/ItineraryCard";
import FlightCard from "./components/FlightCard";
import Countdown from "./components/Countdown"; // ← NEW
import { otherThings } from "./data/otherThings";
import { foodSpots } from "./data/foodSpots";
import ErrorBoundary from "./components/ErrorBoundary";
import SideNav from "./components/SideNav";
import SpotsPanel from "./components/SpotsPanel";
import WeatherTab from "./components/WeatherTab";
import { HOTELS } from "./data/hotels"
import { days } from "./data/days";
import { flights } from "./data/flights";
import { spots } from "./data/spots";
import { Menu as MenuIcon } from "lucide-react";
import { clubsBars } from "./data/clubsBars";
import { shrinesTemples } from "./data/shrinesTemples";
import CurrencyTab from "./components/CurrencyTab";

import { THEMES, KANSAI_DAYS } from "./utils/theme";
import { tabForToday, gmaps } from "./utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import { getExtraPicks } from "./utils/storage";
import { useDaySelections } from "./hooks/useDaySelections";
import WeatherWidget from "./components/WeatherWidget";

export default function App() {

  const [showQuestionnaire, setShowQuestionnaire] = useState(true);
  const [generatedTrip, setGeneratedTrip] = useState(null);

  const handleTripComplete = (formData) => {
    console.log('Form Data:', formData);
    setGeneratedTrip(formData);
    // For now, just log it - we'll add AI next
  };


  if (showQuestionnaire && !generatedTrip) {
    return (
      <TripQuestionnaire onComplete={handleTripComplete} />
    );
  }
  // const ALL_HOTELS = [HOTELS.tokyo_akiba, HOTELS.kyoto_rokujo, HOTELS.tokyo_tamachi];

  // const [tab, setTab] = useState(() => tabForToday(days));
  // const [extrasTick, setExtrasTick] = useState(0); // bump to re-render when picks change
  // const [navOpen, setNavOpen] = useState(false);
  // const [section, setSection] = useState("days");

  // const activeDay = useMemo(() => days.find(d => d.key === tab), [tab]);


  // const toMarker = (it, idx) => (it && it.coords ? { id: `m-${idx}`, title: it.title, coords: it.coords } : null);

  // const hotelForTab =
  //   ["d1", "d2", "d3", "d4"].includes(tab) ? HOTELS.tokyo_akiba :
  //     ["d5", "d6", "d7", "d8"].includes(tab) ? HOTELS.kyoto_rokujo :
  //       ["d9", "d10"].includes(tab) ? HOTELS.tokyo_tamachi :
  //         null;

  // const dayItems = useMemo(() => {
  //   const keys = activeDay?.markers || [];
  //   return keys.map((k, i) => toMarker(spots[k], i)).filter(Boolean);
  // }, [activeDay]);

  // const hotelMarker = useMemo(() => {
  //   if (!hotelForTab) return null;
  //   return {
  //     id: `hotel-${hotelForTab.key || hotelForTab.title}`,
  //     title: hotelForTab.title || "Hotel",
  //     coords: hotelForTab.coords,
  //     isHotel: true,
  //     type: "hotel", // <-- ADD THIS LINE
  //   };
  // }, [hotelForTab]);


  // const mapItems = useMemo(() => {
  //   let items = [];
  //   if (section === "clubs") items = clubsBars.map(toMarker).filter(Boolean);
  //   else if (section === "shrines") items = shrinesTemples.map(toMarker).filter(Boolean);
  //   else items = dayItems;
  //   // Only add hotel marker for days
  //   if (section === "days" && hotelMarker) {
  //     items = [hotelMarker, ...items];
  //   }
  //   return items;
  // }, [section, dayItems, hotelMarker]);



  // const tabs = [
  //   ...days.map((d, i) => ({ key: d.key, label: `Day ${i + 1}`, date: d.date })),
  //   { key: "extras", label: "Other things to do" },
  //   { key: "food", label: "Food spots" },
  //   { key: "currency", label: "YEN → USD" }, // <-- new tab
  //   { key: "flights", label: "Flight Info" },
  // ];




  // const themeKey = KANSAI_DAYS.has(tab) ? "kansai" : "tokyo";
  // const t = THEMES[themeKey];

  // const dbPicks = useDaySelections(activeDay?.key || null);



  // useEffect(() => {
  //   const id = setInterval(() => {
  //     const should = tabForToday(days);
  //     if (should !== tab) setTab(should);
  //   }, 60 * 60 * 1000);
  //   return () => clearInterval(id);
  // }, [tab]);

  // useEffect(() => {
  //   const onUpd = () => setExtrasTick((n) => n + 1);
  //   window.addEventListener("extraPicksUpdated", onUpd);
  //   return () => window.removeEventListener("extraPicksUpdated", onUpd);
  // }, []);



  // return (
  //   <div
  //     className="min-h-screen text-white bg-cover bg-no-repeat bg-fixed"
  //     style={{
  //       backgroundImage: `url(${t.bg})`,
  //       backgroundPosition: themeKey === "kansai" ? "center center" : "20% center",
  //     }}
  //   >
  //     <HeaderBanner />
  //     <div className="mb-3 ml-4 flex">
  //       <button
  //         onClick={() => setNavOpen(true)}
  //         className="inline-flex items-center gap-2 rounded-xl px-3 py-2
  //              bg-white/15 text-white backdrop-blur
  //              ring-1 ring-white/20 hover:bg-white/25 active:bg-white/20
  //              shadow-sm transition"
  //         aria-label="Open menu"
  //       >
  //         <MenuIcon size={18} className="opacity-90" />
  //         <span className="text-sm font-medium">Menu</span>
  //       </button>
  //     </div>

  //     <Countdown theme={t} />


  //     <div className="mx-auto max-w-7xl px-4 pb-16">
  //       <AnimatePresence mode="wait">
  //         <motion.div
  //           key={tab + section}
  //           initial={{ opacity: 0, y: 8 }}
  //           animate={{ opacity: 1, y: 0 }}
  //           exit={{ opacity: 0, y: -8 }}
  //           transition={{ duration: 0.25 }}
  //         >
  //           {tab === "flights" ? (
  //             <div className={`rounded-2xl p-6 shadow-xl bg-[rgb(236,230,245)] text-zinc-900`}>
  //               <div className="grid gap-6 md:grid-cols-2">
  //                 {flights.map((f, i) => (
  //                   <FlightCard key={i} f={f} />
  //                 ))}
  //               </div>
  //             </div>
  //           ) : tab === "currency" ? (
  //             <CurrencyTab />
  //           ) : tab === "extras" ? (
  //             <ErrorBoundary>
  //               <SpotsPanel items={otherThings} hotel={hotelForTab} hotels={ALL_HOTELS} theme={t} title="Other things to do" category="extras" />
  //             </ErrorBoundary>
  //           ) : tab === "food" ? (
  //             <ErrorBoundary>
  //               <SpotsPanel items={foodSpots} hotel={hotelForTab} hotels={ALL_HOTELS} theme={t} title="Food spots" category="food" />
  //             </ErrorBoundary>
  //           ) : section === "clubs" ? (
  //             <SpotsPanel items={clubsBars} title="Clubs & Bars" theme={t} />
  //           ) : section === "shrines" ? (
  //             <SpotsPanel items={shrinesTemples} title="Shrines & Temples" theme={t} showMap={false} />
  //           ) : section === "weather" ? (
  //             <WeatherTab />
  //           ) : (
  //             activeDay && (
  //               <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
  //                 {/* Map */}
  //                 <div className="md:col-span-3">
  //                   <DayMap
  //                     items={mapItems}
  //                     // hotel={hotelForTab}
  //                     hotels={[]}
  //                     theme={t}
  //                     themeKey={themeKey}
  //                   />
  //                 </div>
  //                 {/* Itinerary */}
  //                 <div className="md:col-span-2">
  //                   <ItineraryCard
  //                     day={{ ...activeDay }}
  //                     spots={spots}
  //                     theme={t}
  //                     gmaps={gmaps}
  //                     extraItems={dbPicks}
  //                   />
  //                 </div>
  //               </div>
  //             )
  //           )}
  //         </motion.div>
  //       </AnimatePresence>
  //     </div>

  //     <footer className="pb-10 text-center text-sm text-white/80 drop-shadow">
  //       Built with ❤️ • Animations by Framer Motion • Maps by OpenStreetMap & Leaflet
  //     </footer>

  //     <SideNav
  //       open={navOpen}
  //       onClose={() => setNavOpen(false)}
  //       days={days}
  //       activeDayKey={tab}
  //       onSelectDay={(k) => { setTab(k); setSection("days"); setNavOpen(false); }}
  //       onSelectSection={(s) => {
  //         if (s === "extras" || s === "food" || s === "currency") { setTab(s); setSection("days"); }
  //         else { setSection(s); }
  //         setNavOpen(false);
  //       }}
  //       currentSection={section}
  //       theme={t}
  //     />

  //     {/* Debug logs removed */}
  //   </div>
  // );
}


