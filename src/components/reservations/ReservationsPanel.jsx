import React, { useState } from "react";
import { Plane, Hotel, Plus, Pencil, Copy, Check, Loader2, Trash2 } from "lucide-react";
import Modal from "../Modal";
import { FlightFields, HotelFields } from "./ReservationFields";
import { useUpdateReservations } from "../../hooks/useTrips";
import {
  BLANK_FLIGHT, BLANK_HOTEL, getFlights, getHotels, saveFlight, deleteFlight, saveHotel, deleteHotel, hasDetails,
} from "../../utils/reservations";
import { theme } from "../../utils/theme";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// The confirmation code, large and monospaced, with a copy button
function CodeChip({ code }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. not https); the code is still visible to copy by hand
    }
  };
  return (
    <button
      onClick={copy}
      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 font-mono text-base font-semibold tracking-wider text-indigo-800 hover:bg-indigo-100 transition"
      title="Copy confirmation code"
    >
      {code.toUpperCase()}
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="opacity-60" />}
    </button>
  );
}

function ReservationCard({ icon: Icon, title, badge, lines, code, emptyCodeHint, onEdit }) {
  return (
    <div className={`flex gap-3 rounded-xl p-4 ${theme.sub}`}>
      <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {badge && <p className="text-xs text-gray-500">{badge}</p>}
          </div>
          <button
            onClick={onEdit}
            className="inline-flex flex-none items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-white hover:text-indigo-700 transition"
          >
            <Pencil size={13} />
            Edit
          </button>
        </div>
        {lines.filter(Boolean).map((line, i) => (
          <p key={i} className="mt-0.5 text-sm text-gray-700">{line}</p>
        ))}
        {code ? (
          <CodeChip code={code} />
        ) : (
          <button onClick={onEdit} className="mt-2 text-sm font-medium text-indigo-600 hover:underline">
            {emptyCodeHint}
          </button>
        )}
      </div>
    </div>
  );
}

// Flights and hotels with their confirmation codes, all editable. Saved in the trip's form data.
export default function ReservationsPanel({ tripId, formData }) {
  const save = useUpdateReservations(tripId);
  // { kind: "flight" | "hotel", value, isNew }
  const [editing, setEditing] = useState(null);

  const flights = getFlights(formData);
  const hotels = getHotels(formData);

  const close = () => {
    setEditing(null);
    save.reset();
  };
  const submit = (update) => save.mutate(update, { onSuccess: close });

  const onSave = () =>
    submit((fd) => (editing.kind === "flight" ? saveFlight(fd, editing.value) : saveHotel(fd, editing.value)));
  const onDelete = () =>
    submit((fd) => (editing.kind === "flight" ? deleteFlight(fd, editing.value.id) : deleteHotel(fd, editing.value)));

  const isTripHotel = editing?.kind === "hotel" && editing.value.source === "trip";
  // A new hotel needs a name; a flight needs at least one field filled in
  const canSave =
    editing &&
    (editing.kind === "flight" ? hasDetails(editing.value) : isTripHotel || !!editing.value.name?.trim());

  return (
    <div className={`mx-auto max-w-3xl rounded-2xl p-6 shadow-xl ${theme.card}`}>
      <div className={`mb-6 rounded-xl p-4 ${theme.header}`}>
        <h2 className="text-2xl font-semibold">Reservations</h2>
        <p className="mt-1 text-sm opacity-80">Your flight and hotel confirmation codes, in one place</p>
      </div>

      {/* Flights */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Flights</h3>
          <button
            onClick={() => setEditing({ kind: "flight", value: { ...BLANK_FLIGHT }, isNew: true })}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition"
          >
            <Plus size={15} />
            Add flight
          </button>
        </div>
        {flights.length ? (
          <div className="space-y-3">
            {flights.map((f) => (
              <ReservationCard
                key={f.id}
                icon={Plane}
                title={[f.airline, f.flightNumber].filter(Boolean).join(" ") || "Flight"}
                lines={[
                  (f.from || f.to) && `${f.from || "?"} → ${f.to || "?"}`,
                  [formatDate(f.date), formatTime(f.time)].filter(Boolean).join(" · "),
                  f.notes,
                ]}
                code={f.confirmationCode}
                emptyCodeHint="+ Add confirmation code"
                onEdit={() => setEditing({ kind: "flight", value: f })}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            No flights yet. Add yours to keep confirmation codes handy, even offline.
          </p>
        )}
      </section>

      {/* Hotels */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Hotels</h3>
          <button
            onClick={() => setEditing({ kind: "hotel", value: { ...BLANK_HOTEL, source: "manual" }, isNew: true })}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition"
          >
            <Plus size={15} />
            Add hotel
          </button>
        </div>
        {hotels.length ? (
          <div className="space-y-3">
            {hotels.map((h) => (
              <ReservationCard
                key={h.id}
                icon={Hotel}
                title={h.name || "Hotel"}
                badge={h.source === "trip" ? `Your stay in ${h.city}` : null}
                lines={[
                  h.address,
                  (h.checkIn || h.checkOut) && `${formatDate(h.checkIn) || "?"} – ${formatDate(h.checkOut) || "?"}`,
                  h.notes,
                ]}
                code={h.confirmationCode}
                emptyCodeHint="+ Add confirmation code"
                onEdit={() => setEditing({ kind: "hotel", value: h })}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            No hotels yet. Add one to keep its confirmation code with your trip.
          </p>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-gray-500">
        Reservations are included when you download the PDF, so you'll have them offline.
      </p>

      {/* Add / edit */}
      <Modal open={!!editing} onClose={close} className="max-w-lg max-h-[90vh] overflow-y-auto p-6">
        {editing && (
          <>
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              {editing.isNew ? "Add" : "Edit"} {editing.kind}
            </h3>
            {editing.kind === "flight" ? (
              <FlightFields
                value={editing.value}
                onChange={(patch) => setEditing((e) => ({ ...e, value: { ...e.value, ...patch } }))}
              />
            ) : (
              <HotelFields
                value={editing.value}
                onChange={(patch) => setEditing((e) => ({ ...e, value: { ...e.value, ...patch } }))}
              />
            )}

            {save.isError && <p className="mt-3 text-sm text-red-600">Couldn't save: {save.error.message}</p>}

            <div className="mt-6 flex items-center gap-3">
              {!editing.isNew && (
                <button
                  onClick={onDelete}
                  disabled={save.isPending}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                >
                  <Trash2 size={15} />
                  {isTripHotel ? "Clear code" : "Delete"}
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={close}
                  className="rounded-lg border-2 border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={save.isPending || !canSave}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {save.isPending && <Loader2 size={15} className="animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
