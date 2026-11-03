// Food spots shared across trips. A city's first batch depends only on the city, the country
// and the traveler's dietary needs (that's everything in the prompt), so a list made for one
// trip is reused by the next trip to the same place with the same needs, for CACHE_DAYS. That
// skips the Claude call (~$0.015 and ~20 s per city) and the Geoapify lookups.
//
// Table: food_spot_cache (supabase/migrations), server-only. It stores the place list and the
// dietary categories it was made for, never who asked.
import { createClient } from "@supabase/supabase-js";
import { DIETARY_NEEDS } from "../shared/accessibility.js";
import { logger } from "./logger.js";

export const CACHE_DAYS = 30;
// Lists shorter than this (e.g. Claude found little, or the reply was trimmed) aren't shared
export const MIN_SPOTS_TO_SHARE = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

const norm = (s) => String(s || "").trim().toLowerCase();

// The traveler's dietary needs as a cache key ("", or e.g. "gluten-free,vegan"): the only
// part of their profile the food spot prompt uses
export function dietaryKey(traveler) {
  return [...new Set((traveler?.needs || []).filter((n) => DIETARY_NEEDS.includes(n)).map(norm))].sort().join(",");
}

// { get(place), put(place, spots) } where place is { country, city, traveler }. Both never
// throw: without the service key, or on any error, the cache is simply skipped.
export function createFoodSpotCache({ supabaseUrl, serviceKey }) {
  const admin = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  const keyOf = ({ country, city, traveler }) => ({ country: norm(country), city: norm(city), dietary: dietaryKey(traveler) });

  return {
    // A fresh shared list for this place, or null
    async get(place) {
      if (!admin) return null;
      const key = keyOf(place);
      const { data, error } = await admin
        .from("food_spot_cache")
        .select("spots, created_at")
        .eq("country", key.country)
        .eq("city", key.city)
        .eq("dietary", key.dietary)
        .maybeSingle();
      if (error) {
        logger.warn({ err: error, ...key }, "Couldn't read the food spot cache");
        return null;
      }
      if (!data || Date.now() - Date.parse(data.created_at) > CACHE_DAYS * DAY_MS) return null;
      return Array.isArray(data.spots) && data.spots.length ? data.spots : null;
    },

    async put(place, spots) {
      if (!admin || !Array.isArray(spots) || spots.length < MIN_SPOTS_TO_SHARE) return;
      const key = keyOf(place);
      const { error } = await admin
        .from("food_spot_cache")
        .upsert({ ...key, spots, created_at: new Date().toISOString() }, { onConflict: "country,city,dietary" });
      if (error) logger.warn({ err: error, ...key }, "Couldn't save to the food spot cache");
    },
  };
}
