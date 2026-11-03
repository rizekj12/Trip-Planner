import React, { useEffect, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ChevronDown, ChevronUp, GripVertical, Loader2, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useEditItinerary, useRegenerateDay } from "../../hooks/useTrips";
import { searchPlaces } from "../../utils/aiService";
import { reorderStops, moveStop, moveStopToDay, removeStop, restoreStop, addStop } from "../../../shared/itineraryEdits.js";

const iconButton =
  "flex h-11 w-11 flex-none items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30";

// The organizer's editing tools for one day (issue #37): reorder (drag the handle, or the
// arrows), move to another day, remove (with undo), add a stop from a place search, and
// re-plan the day with AI. Every change saves straight away.
// `days`: describeDays() for every day (labels for "Move to"); `country` narrows place search.
export default function EditDay({ tripId, day, spots, days, country }) {
  const edit = useEditItinerary(tripId);
  const markers = day.markers || [];
  // The order while a drag is in progress (saved when it ends, not on every swap); otherwise
  // the day's saved order
  const [dragOrder, setDragOrder] = useState(null);
  const order = dragOrder || markers;
  const drop = () => {
    if (dragOrder && dragOrder.join("|") !== markers.join("|")) save((it) => reorderStops(it, day.key, dragOrder));
    setDragOrder(null);
  };
  const [removed, setRemoved] = useState(null); // { key, spot, index } for Undo

  const save = (change) => edit.mutate(change);
  const remove = (key) => {
    setRemoved({ key, spot: spots[key], index: markers.indexOf(key) });
    save((it) => removeStop(it, day.key, key));
  };
  const undo = () => {
    const { key, spot, index } = removed;
    setRemoved(null);
    save((it) => restoreStop(it, day.key, key, spot, index));
  };

  return (
    // Swiping changes day; while editing, a drag must not
    <div className="space-y-5" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
      {order.length ? (
        <Reorder.Group axis="y" values={order} onReorder={setDragOrder} className="space-y-2">
          {order.map((key, i) => (
            <EditableStop
              key={key}
              spotKey={key}
              spot={spots[key]}
              index={i}
              count={order.length}
              day={day}
              days={days}
              onDrop={drop}
              onMove={(to) => save((it) => moveStop(it, day.key, key, to))}
              onMoveToDay={(toKey) => save((it) => moveStopToDay(it, day.key, key, toKey))}
              onRemove={() => remove(key)}
            />
          ))}
        </Reorder.Group>
      ) : (
        <p className="text-sm text-slate-600">No stops yet. Add one below.</p>
      )}

      {removed && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
          <span className="truncate">Removed {removed.spot?.title || "stop"}</span>
          <button onClick={undo} className="min-h-[40px] flex-none font-bold text-amber-300 hover:underline">Undo</button>
        </div>
      )}
      {edit.isError && <p className="text-sm text-red-600">Couldn't save that change: {edit.error.message}</p>}

      <AddStop
        city={day.city}
        country={country}
        onAdd={(place) => save((it) => addStop(it, day.key, place).itinerary)}
      />
      <ReplanDay tripId={tripId} day={day} />
    </div>
  );
}

function EditableStop({ spotKey, spot, index, count, day, days, onDrop, onMove, onMoveToDay, onRemove }) {
  const controls = useDragControls();
  const title = spot?.title || "Stop";
  return (
    <Reorder.Item
      value={spotKey}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className="rounded-2xl border border-slate-200 bg-white p-1.5"
    >
      {/* Phone first: the name gets its own line; moving controls sit underneath */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className={`${iconButton} cursor-grab touch-none active:cursor-grabbing`}
          aria-label={`Drag to reorder ${title}`}
        >
          <GripVertical size={18} />
        </button>
        <p className="min-w-0 flex-1 px-1 font-bold leading-snug text-slate-900">
          <span className="mr-1.5 text-violet-700">{index + 1}.</span>
          {title}
        </p>
        <button type="button" onClick={onRemove} className={`${iconButton} hover:bg-red-50 hover:text-red-600`} aria-label={`Remove ${title}`}>
          <Trash2 size={18} />
        </button>
      </div>
      <div className="flex items-center gap-1 pl-12">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Move {title} to another day</span>
          <select
            value=""
            onChange={(e) => e.target.value && onMoveToDay(e.target.value)}
            className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-white pl-2 pr-6 text-base text-slate-700 sm:text-sm"
          >
            <option value="">Move to day…</option>
            {days.filter((d) => d.key !== day.key).map((d) => (
              <option key={d.key} value={d.key}>
                Day {d.n}{d.shortDate ? ` · ${d.shortDate}` : ""}{d.city ? ` · ${d.city}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} className={iconButton} aria-label={`Move ${title} up`}>
          <ChevronUp size={18} />
        </button>
        <button type="button" onClick={() => onMove(index + 1)} disabled={index === count - 1} className={iconButton} aria-label={`Move ${title} down`}>
          <ChevronDown size={18} />
        </button>
      </div>
    </Reorder.Item>
  );
}

// Search for a place near the day's city and add it as the last stop
function AddStop({ city, country, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [state, setState] = useState("idle"); // idle | searching | error

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setState("idle");
      return undefined;
    }
    let cancelled = false;
    setState("searching");
    // Waits for a pause in typing, so each keystroke isn't a search
    const timer = setTimeout(() => {
      searchPlaces(q, { city, country })
        .then((places) => !cancelled && (setResults(places), setState("idle")))
        .catch(() => !cancelled && setState("error"));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, city, country]);

  const pick = (place) => {
    onAdd(place);
    setQuery("");
    setResults([]);
  };

  return (
    <div>
      <label htmlFor="add-stop" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-800">
        <Plus size={16} /> Add a stop
      </label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="add-stop"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search places in ${city || "this city"}`}
          className="min-h-[44px] w-full rounded-xl border-2 border-slate-200 py-2 pl-9 pr-3 text-base focus:border-violet-500 focus:outline-none"
          autoComplete="off"
        />
        {state === "searching" && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>
      {state === "error" && <p className="mt-1.5 text-sm text-red-600">Place search isn't available right now.</p>}
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {results.map((p) => (
            <li key={`${p.title}|${p.address}`}>
              <button type="button" onClick={() => pick(p)} className="block min-h-[44px] w-full px-3 py-2 text-left hover:bg-violet-50">
                <span className="block font-semibold text-slate-900">{p.title}</span>
                <span className="block truncate text-xs text-slate-600">{p.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && state === "idle" && !results.length && (
        <p className="mt-1.5 text-sm text-slate-600">No places found. Try another name.</p>
      )}
    </div>
  );
}

// "Re-plan this day": a new set of stops from Claude, with an optional note
function ReplanDay({ tripId, day }) {
  const replan = useRegenerateDay(tripId);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-violet-200 px-4 text-sm font-bold text-violet-800 hover:bg-violet-50"
      >
        <Sparkles size={16} /> Re-plan this day with AI
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4">
      <label htmlFor="replan-note" className="block text-sm font-bold text-slate-800">
        Re-plan this day
        <span className="mt-0.5 block text-xs font-normal text-slate-600">
          Replaces this day's stops and tips. Other days stay as they are.
        </span>
      </label>
      <textarea
        id="replan-note"
        rows={2}
        maxLength={300}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder='Anything to change? e.g. "more food, less museums"'
        className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base focus:border-violet-500 focus:outline-none"
      />
      {replan.isError && <p className="text-sm text-red-600">{replan.error.message}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={replan.isPending}
          onClick={() => replan.mutate({ dayKey: day.key, note: note.trim() }, { onSuccess: () => (setOpen(false), setNote("")) })}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60"
        >
          {replan.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {replan.isPending ? "Re-planning… (about 30 s)" : "Re-plan"}
        </button>
        <button
          type="button"
          disabled={replan.isPending}
          onClick={() => setOpen(false)}
          className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
