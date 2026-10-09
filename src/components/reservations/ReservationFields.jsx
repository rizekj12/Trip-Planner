import React from "react";

const inputClass =
  "w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm text-gray-900 bg-white";

function Field({ label, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

// Inputs for one flight. value: BLANK_FLIGHT-shaped object; onChange(patch).
export function FlightFields({ value, onChange }) {
  const input = (key, props = {}) => (
    <input
      className={inputClass}
      value={value[key] || ""}
      onChange={(e) => onChange({ [key]: e.target.value })}
      {...props}
    />
  );
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Airline">{input("airline", { placeholder: "e.g. United" })}</Field>
      <Field label="Flight number">{input("flightNumber", { placeholder: "e.g. UA 837" })}</Field>
      <Field label="Confirmation code" className="col-span-2">
        {input("confirmationCode", { placeholder: "e.g. K7XQ2P", className: `${inputClass} font-mono uppercase` })}
      </Field>
      <Field label="From">{input("from", { placeholder: "e.g. SFO" })}</Field>
      <Field label="To">{input("to", { placeholder: "e.g. NRT" })}</Field>
      <Field label="Departure date">{input("date", { type: "date" })}</Field>
      <Field label="Departure time">{input("time", { type: "time" })}</Field>
      <Field label="Notes" className="col-span-2">{input("notes", { placeholder: "Seat, terminal, baggage…" })}</Field>
    </div>
  );
}

// Inputs for one hotel. A hotel from the trip itself (source "trip") only edits its code
// and notes; its name, address and dates are shown read-only.
export function HotelFields({ value, onChange }) {
  const input = (key, props = {}) => (
    <input
      className={inputClass}
      value={value[key] || ""}
      onChange={(e) => onChange({ [key]: e.target.value })}
      {...props}
    />
  );
  const fromTrip = value.source === "trip";

  return (
    <div className="grid grid-cols-2 gap-3">
      {fromTrip ? (
        <div className="col-span-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <p className="font-medium text-gray-900">{value.name}</p>
          {value.address && <p className="text-gray-600">{value.address}</p>}
          <p className="mt-1 text-xs text-gray-500">From your trip details for {value.city}</p>
        </div>
      ) : (
        <>
          <Field label="Hotel name" className="col-span-2">{input("name", { placeholder: "e.g. Hotel Gracery Shinjuku" })}</Field>
          <Field label="Address" className="col-span-2">{input("address")}</Field>
          <Field label="Check-in">{input("checkIn", { type: "date" })}</Field>
          <Field label="Check-out">{input("checkOut", { type: "date" })}</Field>
        </>
      )}
      <Field label="Confirmation code" className="col-span-2">
        {input("confirmationCode", { placeholder: "e.g. 84720193", className: `${inputClass} font-mono uppercase` })}
      </Field>
      <Field label="Notes" className="col-span-2">{input("notes", { placeholder: "Room type, check-in instructions…" })}</Field>
    </div>
  );
}
