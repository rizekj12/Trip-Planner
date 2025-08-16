// src/App.jsx
import React, { useState, useEffect } from "react";

import HeaderBanner from "./components/HeaderBanner";
import TabsBar from "./components/TabsBar";
import DayMap from "./components/DayMap";
import ItineraryCard from "./components/ItineraryCard";
import FlightCard from "./components/FlightCard";
import Countdown from "./components/Countdown"; // ← NEW
import SpotsPanel from "./components/SpotsPanel"
import { otherThings } from "./data/otherThings";
import { foodSpots } from "./data/foodSpots";

import { days } from "./data/days";
import { flights } from "./data/flights";
import { spots } from "./data/spots";

import { THEMES, KANSAI_DAYS } from "./utils/theme";
import { tabForToday, gmaps } from "./utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import { getExtraPicks } from "./utils/storage";
import { useDaySelections } from "./hooks/useDaySelections";

export default function App() {
    const [tab, setTab] = useState(() => tabForToday(days));
    const [extrasTick, setExtrasTick] = useState(0); // bump to re-render when picks change

    const tabs = [
        ...days.map((d, i) => ({ key: d.key, label: `Day ${i + 1}`, date: d.date })),
        { key: "extras", label: "Other things to do" },
        { key: "food", label: "Food spots" },
        { key: "flights", label: "Flight Info" },
    ];


    const themeKey = KANSAI_DAYS.has(tab) ? "kansai" : "tokyo";
    const t = THEMES[themeKey];
    const activeDay = days.find((d) => d.key === tab);
    const dbPicks = useDaySelections(activeDay?.key || null);



    useEffect(() => {
        const id = setInterval(() => {
            const should = tabForToday(days);
            if (should !== tab) setTab(should);
        }, 60 * 60 * 1000);
        return () => clearInterval(id);
    }, [tab]);

    useEffect(() => {
        const onUpd = () => setExtrasTick((n) => n + 1);
        window.addEventListener("extraPicksUpdated", onUpd);
        return () => window.removeEventListener("extraPicksUpdated", onUpd);
    }, []);

    return (
        <div
            className="min-h-screen text-white bg-cover bg-no-repeat bg-fixed"
            style={{
                backgroundImage: `url(${t.bg})`,
                backgroundPosition: themeKey === "kansai" ? "center center" : "20% center",
            }}
        >
            <HeaderBanner />
            <Countdown theme={t} />

            <div className="mx-auto max-w-7xl px-4 pb-16">
                <TabsBar tabs={tabs} active={tab} setActive={setTab} theme={t} />
                {/* ...rest unchanged... */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                    >
                        {tab === "flights" ? (
                            <div className={`rounded-2xl p-6 shadow-xl bg-[rgb(236,230,245)] text-zinc-900`}>
                                <div className="grid gap-6 md:grid-cols-2">
                                    {flights.map((f, i) => (
                                        <FlightCard key={i} f={f} />
                                    ))}
                                </div>
                            </div>
                        ) : tab === "extras" ? (
                            <SpotsPanel items={otherThings} theme={t} title="Other things to do" category="extras" />
                        ) : tab === "food" ? (
                            <SpotsPanel items={foodSpots} theme={t} title="Food spots" category="food" />
                        ) : (
                            activeDay && (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                                    {/* Map */}
                                    <div className="md:col-span-3">
                                        <DayMap
                                            items={[
                                                ...activeDay.markers.map((k) => spots[k]).filter(Boolean),
                                                ...dbPicks,
                                            ]}
                                            hotel={activeDay.hotel}
                                            theme={t}
                                        />
                                    </div>

                                    {/* Itinerary */}
                                    <div className="md:col-span-2">
                                        <ItineraryCard
                                            day={{ ...activeDay }}
                                            spots={spots}
                                            theme={t}
                                            gmaps={gmaps}
                                            extraItems={dbPicks}
                                        />
                                    </div>
                                </div>
                            )
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <footer className="pb-10 text-center text-sm text-white/80 drop-shadow">
                Built with ❤️ • Animations by Framer Motion • Maps by OpenStreetMap & Leaflet
            </footer>
        </div>
    );
}
