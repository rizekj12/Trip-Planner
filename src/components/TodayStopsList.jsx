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

          </li>
        ))}
      </ul>
    </div>
  );
}

