import React from 'react';


export default function FlightCard({ f }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm bg-[rgb(236,230,245)] text-zinc-900`}>
      <h3 className="mb-2 text-lg font-semibold text-zinc-900">{f.dir}</h3>
      <div className="space-y-3">
        {f.segments.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-xl bg-white/60 p-3 shadow-sm md:grid-cols-5"
          >
            <div className="md:col-span-2">
              <div className="text-sm text-zinc-500">Airline</div>
              <div className="font-medium">{s.airline}</div>
              <div className="text-sm">Flight {s.flight}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">From</div>
              <div className="font-medium">{s.from}</div>
              <div className="text-sm">Dep {s.dep}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">To</div>
              <div className="font-medium">{s.to}</div>
              <div className="text-sm">Arr {s.arr}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-500">Duration</div>
              <div className="font-medium">{s.duration}</div>
              {s.terminal && <div className="text-sm">{s.terminal}</div>}
              {s.aircraft && <div className="text-sm">{s.aircraft}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
