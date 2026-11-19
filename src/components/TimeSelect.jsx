import React from "react";

// "14:30" -> "2:30 PM"
export function formatTime(value) {
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Every 15 minutes from 12:00 AM to 11:45 PM, as "HH:MM" (24-hour, what's stored)
const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

// A time dropdown: scroll the list from 12:00 AM through the PM times. Stores "HH:MM" like
// <input type="time"> did, so saved times still load (one off the 15-minute grid, e.g. "14:07",
// is kept as an extra option).
export default function TimeSelect({ value = "", onChange, className = "", placeholder = "Select a time", ...props }) {
  const options = value && !TIMES.includes(value) ? [...TIMES, value].sort() : TIMES;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} {...props}>
      <option value="">{placeholder}</option>
      {options.map((t) => (
        <option key={t} value={t}>
          {formatTime(t)}
        </option>
      ))}
    </select>
  );
}
