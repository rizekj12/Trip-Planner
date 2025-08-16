import React from 'react';


// src/components/TodayStopsList.jsx
export default function TodayStopsList({ items, theme, showRegion = false }) {
  return (
    <div className={`rounded-xl p-3 ${theme.sub}`}>
      <div className="mb-2 font-medium">Today’s Stops</div>
      <ul className="space-y-2">
        {items.map((spot, i) => (
          <li key={spot.title + i} className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: theme.markerColor }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{spot.title}</div>
              {showRegion && spot.region && (
                <div className="text-xs opacity-70">{spot.region}</div>
              )}
            </div>

            <AddToDay spot={spot} />

          </li>
        ))}
      </ul>
    </div>
  );
}

//Example optional Add-to-Day control (keep commented out unless you’re ready)
function AddToDay({ spot }) {
  const add = (dayKey) => {
    // TODO: wire to your data model/localStorage
    alert(`Would add "${spot.title}" to ${dayKey}`);
  };
  return (
    <div className="flex items-center">
      <select
        onChange={(e) => { if (e.target.value) add(e.target.value); e.target.value = ""; }}
        className="rounded-md bg-white/80 px-2 py-1 text-xs text-zinc-900"
        defaultValue=""
      >
        <option value="" disabled>Add to day…</option>
        <option value="d1">Day 1</option>
        <option value="d2">Day 2</option>
        <option value="d3">Day 3</option>
        <option value="d4">Day 4</option>
        <option value="d5">Day 5</option>
        <option value="d6">Day 6</option>
        <option value="d7">Day 7</option>
        <option value="d8">Day 8</option>
        <option value="d9">Day 9</option>
        <option value="d10">Day 10</option>
      </select>
    </div>
  );
}

