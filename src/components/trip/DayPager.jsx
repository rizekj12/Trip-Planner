import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Previous / next day at the bottom of a day, showing where each one goes
export default function DayPager({ days, index, onSelect }) {
  const prev = days[index - 1];
  const next = days[index + 1];
  const button =
    "flex min-h-[72px] flex-1 basis-[240px] items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 transition hover:border-violet-300";

  return (
    <nav aria-label="Previous and next day" className="flex flex-wrap gap-3">
      {prev && (
        <button onClick={() => onSelect(index - 1)} className={`${button} text-left`}>
          <ChevronLeft size={22} strokeWidth={2.5} className="flex-none text-violet-700" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">Previous · Day {prev.n}</span>
            <span className="block truncate font-extrabold text-slate-900">{prev.title}</span>
          </span>
        </button>
      )}
      {next && (
        <button onClick={() => onSelect(index + 1)} className={`${button} justify-end text-right`}>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">Next · Day {next.n}</span>
            <span className="block truncate font-extrabold text-slate-900">{next.title}</span>
          </span>
          <ChevronRight size={22} strokeWidth={2.5} className="flex-none text-violet-700" aria-hidden="true" />
        </button>
      )}
    </nav>
  );
}
