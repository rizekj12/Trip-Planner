import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Utensils, MapPin, Martini, Landmark, CloudSun } from "lucide-react";

export default function SideNav({
  open,
  onClose,
  days,
  activeDayKey,
  onSelectDay,
  onSelectSection,
  currentSection,
  theme,
}) {
  const th = theme || { card: "bg-white", header: "bg-zinc-100", markerColor: "#4f46e5", overlayScrim: "bg-black/40" };
  const [daysOpen, setDaysOpen] = useState(true);

  const baseBtn = "rounded-lg px-3 py-2 text-left hover:opacity-90 bg-white/40 flex items-center gap-2 border-l-4";
  const activeClass = " bg-white/70";
  const headerBtn = `mx-3 mb-2 w-[calc(100%-1.5rem)] rounded-lg px-3 py-2 text-left font-medium hover:opacity-90 border-l-4 text-black ${th.header}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={`fixed inset-0 z-[2000] backdrop-blur-sm ${th?.overlayScrim || "bg-black/40"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 left-0 z-[2100] w-72 max-w-[90vw] overflow-y-auto p-safe shadow-2xl sm:w-80 sm:max-w-[85vw]"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "tween", duration: 0.18 }}
            role="dialog"
            aria-label="Navigation"
          >
            <div className={`rounded-xl p-3 mb-4 ${th.card}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button className="rounded-md px-3 py-1 text-sm hover:opacity-90" onClick={onClose}>Close</button>
              </div>
            </div>

            <nav className="space-y-4">
              <div className={`rounded-xl ${th.card}`}>
                <div className="mb-2 px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-600/90">Plan</div>
                <button
                  className={headerBtn + (currentSection === "days" ? " bg-white/20" : "")}
                  style={{ borderColor: th.markerColor }}
                  onClick={() => setDaysOpen(v => !v)}
                  aria-expanded={daysOpen}
                  aria-controls="days-submenu"
                >
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={18} className="opacity-90" />
                    <span>Days</span>
                  </span>
                </button>
                <div id="days-submenu" className={`mt-1 space-y-1 pb-3 pl-2 ${daysOpen ? "" : "hidden"}`}>
                  {days.map((d, idx) => (
                    <button
                      key={d.key}
                      className={[
                        "mx-3 w-[calc(100%-1.5rem)] rounded-md px-2 py-1.5 text-left text-sm hover:opacity-90",
                        d.key === activeDayKey ? "bg-black/5 font-semibold" : "opacity-90"
                      ].join(" ")}
                      onClick={() => onSelectDay(d.key)}
                    >
                      Day {idx + 1} • {d.date}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl p-3 ${th.card} space-y-2`}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-600/90">Explore</div>

                <button
                  className={baseBtn}
                  style={{ borderColor: th.markerColor }}
                  onClick={() => onSelectSection("extras")}
                >
                  <MapPin size={18} /> <span>Other Things to Do</span>
                </button>

                <button
                  className={baseBtn}
                  style={{ borderColor: th.markerColor }}
                  onClick={() => onSelectSection("food")}
                >
                  <Utensils size={18} /> <span>Food Spots</span>
                </button>

                <button
                  className={baseBtn}
                  style={{ borderColor: th.markerColor }}
                  onClick={() => onSelectSection("currency")}
                >
                  <span className="inline-flex items-center gap-2">💱 <span>YEN → USD</span></span>
                </button>

                <button
                  className={baseBtn + (currentSection === "clubs" ? activeClass : "")}
                  style={{ borderColor: th.markerColor }}
                  onClick={() => onSelectSection("clubs")}
                >
                  <Martini size={18} /> <span>Clubs & Bars</span>
                </button>

                <button
                  className={baseBtn + (currentSection === "shrines" ? activeClass : "")}
                  style={{ borderColor: th.markerColor }}
                  onClick={() => onSelectSection("shrines")}
                >
                  <Landmark size={18} /> <span>Shrines & Temples</span>
                </button>

                <button
                  className={baseBtn + (currentSection === "weather" ? activeClass : "")}
                  style={{ borderColor: th.markerColor }}
                  onClick={() => onSelectSection("weather")}
                >
                  <CloudSun size={18} /> <span>Weather</span>
                </button>
              </div>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
