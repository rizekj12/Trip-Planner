import React, { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Every day of the trip as a row of chips, with arrows on both ends. Pinned to the top of the
// screen while scrolling the itinerary, and keeps the chosen day's chip in view.
export default function DayStrip({ days, index, onSelect }) {
  const chips = useRef([]);
  useEffect(() => {
    chips.current[index]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  const arrow =
    "flex h-11 w-11 flex-none items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 transition hover:border-violet-300 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="sticky top-0 z-30 bg-[#eef2f8]/95 py-2 backdrop-blur sm:py-3">
      <nav aria-label="Days" className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_6px_20px_rgba(15,23,42,0.06)] sm:gap-3 sm:rounded-3xl sm:p-3">
        <button onClick={() => onSelect(index - 1)} disabled={index === 0} className={arrow} aria-label="Previous day">
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto scroll-smooth py-0.5 [scrollbar-width:none]">
          {days.map((d, i) => {
            const on = i === index;
            return (
              <button
                key={d.key}
                ref={(el) => (chips.current[i] = el)}
                onClick={() => onSelect(i)}
                aria-current={on ? "step" : undefined}
                aria-label={`Day ${d.n}${d.longDate ? `, ${d.longDate}` : ""}${d.city ? `, ${d.city}` : ""}`}
                className={`min-w-[88px] flex-none snap-center rounded-xl border-2 px-3 py-2 text-left transition sm:min-w-[108px] sm:rounded-2xl ${
                  on ? "border-[#0f2b5b] bg-[#0f2b5b] text-white" : "border-slate-200 bg-white text-slate-900 hover:border-violet-300"
                }`}
              >
                <span className={`block text-[11px] font-extrabold uppercase tracking-wider ${on ? "text-slate-300" : "text-slate-500"}`}>
                  Day {d.n}
                </span>
                <span className="block text-sm font-extrabold sm:text-[15px]">{d.shortDate || d.city || `Day ${d.n}`}</span>
                {d.shortDate && d.city && (
                  <span className={`block max-w-[7.5rem] truncate text-xs ${on ? "text-slate-300" : "text-slate-600"}`}>{d.city}</span>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => onSelect(index + 1)} disabled={index === days.length - 1} className={arrow} aria-label="Next day">
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </nav>
    </div>
  );
}
