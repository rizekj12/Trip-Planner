import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Plus, RotateCcw, Utensils } from "lucide-react";
import DayMap from "./DayMap";
import { useLoadFoodSpots } from "../hooks/useTrips";
import { gmaps, distanceKm, formatDistance } from "../utils/helpers";
import { theme } from "../utils/theme";

// Top places to eat in each city of the trip, picked by Claude.
// foodSpots: { [cityName]: [{ name, cuisine, price, neighborhood, description, coords?, address? }] },
// saved on the trip. `coords` comes from Geoapify; null means no confident match, so no pin.
// homebases: { [cityName]: { type: "hotel" | "custom", name, coords } | null } — where the
// traveler is staying, used for distances and a 🏨 pin.
export default function FoodSpotsPanel({ tripId, cities, foodSpots, homebases }) {
  const [city, setCity] = useState(cities[0]);
  const [closestFirst, setClosestFirst] = useState(false);
  const load = useLoadFoodSpots(tripId);
  const homebaseLookup = useLoadFoodSpots(tripId);
  const requested = useRef(new Set());
  const requestedHomebase = useRef(new Set());

  const spots = foodSpots[city] || [];
  const homebase = homebases[city];
  const isThisCity = load.variables?.city === city;
  const loading = load.isPending && isThisCity;
  const error = load.isError && isThisCity ? load.error.message : null;

  // First visit to a city: fetch its first batch. The ref stops a second request when
  // React StrictMode runs the effect twice, or when an earlier attempt failed.
  useEffect(() => {
    if (!city || spots.length || requested.current.has(city)) return;
    requested.current.add(city);
    load.mutate({ city });
  }, [city, spots.length]);

  // Trips whose spots were saved before homebases were tracked: look the homebase up once.
  // (A first batch returns the homebase too, so this only runs for those older trips.)
  useEffect(() => {
    if (!city || !spots.length || city in homebases || requestedHomebase.current.has(city)) return;
    requestedHomebase.current.add(city);
    homebaseLookup.mutate({ city, homebaseOnly: true });
  }, [city, spots.length, homebases]);

  const homebaseLabel = homebase?.type === "hotel" ? "from hotel" : "from homebase";

  // Each row keeps its original number (which matches its map pin) even when re-sorted.
  // "Closest to homebase" sorts by distance; spots without one go last, in their usual order.
  const rows = useMemo(() => {
    const list = spots.map((spot, i) => ({
      spot,
      number: i + 1,
      km: homebase?.coords && spot.coords ? distanceKm(homebase.coords, spot.coords) : null,
    }));
    if (!closestFirst) return list;
    return [...list].sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
  }, [spots, homebase, closestFirst]);
  const canSortByDistance = rows.some((r) => r.km !== null);

  // Pins keep their list number, so #4 on the map is #4 in the list even if #3 has no pin
  const mapItems = useMemo(() => {
    const pins = spots
      .map((s, i) => s.coords && {
        id: `food-${i}`,
        number: i + 1,
        title: s.name,
        coords: s.coords,
        description: s.description,
      })
      .filter(Boolean);
    return homebase?.coords
      ? [{ id: "homebase", type: "hotel", title: homebase.name, coords: homebase.coords }, ...pins]
      : pins;
  }, [spots, homebase]);

  const loadMore = () => load.mutate({ city });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
      <div className="md:col-span-3">
        <div className="md:sticky md:top-4">
          {/* No popups: each list item already links to Google Maps */}
          <DayMap items={mapItems} clickable={false} />
        </div>
      </div>

      <div className={`md:col-span-2 rounded-2xl p-6 shadow-xl ${theme.card}`}>
        <div className={`mb-4 rounded-xl p-4 ${theme.header}`}>
          <h2 className="text-2xl font-semibold">Food Spots</h2>
          <p className="mt-1 text-sm opacity-80">
            {city ? `Top places to eat in ${city}` : "No cities on this trip"}
          </p>
        </div>

        {/* City switcher (multi-city trips) */}
        {cities.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  c === city ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* First load */}
        {spots.length === 0 && loading && (
          <div className="py-10 text-center text-gray-600">
            <Loader2 size={28} className="mx-auto mb-3 animate-spin text-indigo-600" />
            <p className="font-medium">Finding the best places to eat in {city}…</p>
            <p className="mt-1 text-sm text-gray-500">This usually takes 20–30 seconds.</p>
          </div>
        )}

        {canSortByDistance && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              role="switch"
              aria-checked={closestFirst}
              onClick={() => setClosestFirst((v) => !v)}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <span
                className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors ${
                  closestFirst ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    closestFirst ? "translate-x-[18px]" : "translate-x-0.5"
                  }`}
                />
              </span>
              Closest to homebase
            </button>
          </div>
        )}

        {spots.length > 0 && (
          <ol className="space-y-3">
            {rows.map(({ spot, number, km }) => (
              <li key={`${spot.name}-${number}`} className={`flex gap-3 rounded-xl p-4 ${theme.sub}`}>
                <span
                  className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: theme.markerColor }}
                >
                  {number}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-semibold text-gray-900">{spot.name}</h3>
                    <a
                      href={gmaps(spot.address ? `${spot.name}, ${spot.address}` : `${spot.name} ${spot.neighborhood || ""} ${city}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                    >
                      <MapPin size={12} />
                      Maps
                    </a>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[spot.cuisine, spot.price, spot.neighborhood].filter(Boolean).join(" · ")}
                    {spot.coords === null && <span className="text-gray-400"> · not on map</span>}
                  </p>
                  {km !== null && (
                    <p className="mt-0.5 text-xs font-medium text-indigo-600">
                      {formatDistance(km)} {homebaseLabel}
                    </p>
                  )}
                  {spot.description && <p className="mt-1.5 text-sm text-gray-700">{spot.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}

        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={loadMore}
              className="inline-flex flex-none items-center gap-1 font-semibold hover:underline"
            >
              <RotateCcw size={14} />
              Try again
            </button>
          </div>
        )}

        {/* Load more */}
        {spots.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {loading ? "Finding 10 more…" : "Load 10 more"}
            </button>
          </div>
        )}

        {!city && (
          <div className="py-10 text-center text-gray-500">
            <Utensils size={40} className="mx-auto mb-3 text-gray-300" />
            Add a city to this trip to see food spots.
          </div>
        )}
      </div>
    </div>
  );
}
