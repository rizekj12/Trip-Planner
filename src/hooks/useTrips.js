import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../utils/supabase";
import { fetchTrips, fetchTrip, deleteTrip, saveDraft, tripStatus, updateTripFormData, markPdfDownloaded } from "../utils/trips";
import { startGeneration, loadMoreFoodSpots, downloadTripPdf } from "../utils/aiService";

// While an itinerary is being generated, Supabase Realtime tells us the moment the trip row
// changes; polling this often is only a fallback (e.g. if Realtime is blocked or not enabled)
const PENDING_POLL_MS = 15_000;

export function useTrips() {
  const query = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
    refetchInterval: (query) =>
      query.state.data?.some((t) => tripStatus(t) === "pending") ? PENDING_POLL_MS : false,
  });
  useLiveUpdates((query.data || []).filter((t) => tripStatus(t) === "pending").map((t) => t.id));
  return query;
}

export function useTrip(id) {
  const query = useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTrip(id),
    enabled: !!id,
    refetchInterval: (query) =>
      tripStatus(query.state.data) === "pending" ? PENDING_POLL_MS : false,
  });
  useLiveUpdates(tripStatus(query.data) === "pending" ? [id] : []);
  return query;
}

// Refetches as soon as any of these trips' rows change (e.g. generation finished)
let channelCount = 0;
function useLiveUpdates(tripIds) {
  const qc = useQueryClient();
  const key = [...tripIds].sort().join(",");
  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    const channel = supabase
      .channel(`trip-updates-${++channelCount}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trips", filter: `id=in.(${ids.join(",")})` },
        () => {
          qc.invalidateQueries({ queryKey: ["trips"] });
          qc.invalidateQueries({ queryKey: ["trip"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [key, qc]);
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: (_, id) => {
      qc.setQueryData(["trips"], (prev) => prev?.filter((t) => t.id !== id));
      qc.removeQueries({ queryKey: ["trip", id] });
    },
  });
}

// Saves the trip as pending and starts generation; resolves with the saved row
export function useStartGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startGeneration,
    onSuccess: (row) => {
      qc.setQueryData(["trip", row.id], row);
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

// Fetches the next batch of food spots for one city (or, with homebaseOnly, just its
// homebase location) and writes the results into the trip's cache
export function useLoadFoodSpots(tripId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ city, homebaseOnly }) => loadMoreFoodSpots({ tripId, city, homebaseOnly }),
    onSuccess: ({ spots, homebase }, { city }) => {
      qc.setQueryData(["trip", tripId], (trip) => trip && {
        ...trip,
        itinerary_data: {
          ...trip.itinerary_data,
          _food_spots: { ...trip.itinerary_data._food_spots, [city]: spots },
          _homebases: { ...trip.itinerary_data._homebases, [city]: homebase },
        },
      });
    },
  });
}

// Builds and downloads a trip's offline PDF. Call mutate(trip).
export function useDownloadPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trip) => {
      await downloadTripPdf({ tripId: trip.id, filename: pdfFilename(trip.destination) });
      // Not worth failing the download over
      await markPdfDownloaded(trip.id).catch(console.error);
    },
    // Picks up the download mark, plus any food spots the server filled in while building it
    onSuccess: (_, trip) => {
      qc.invalidateQueries({ queryKey: ["trip", trip.id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

function pdfFilename(destination) {
  const name = (destination || "trip").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return `${name || "trip"}-itinerary.pdf`;
}

// Edits a trip's reservations. Call mutate(update) with update(formData) => newFormData,
// e.g. one of the updaters in utils/reservations.js.
export function useUpdateReservations(tripId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update) => updateTripFormData(tripId, update),
    onSuccess: (row) => qc.setQueryData(["trip", tripId], row),
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveDraft,
    onSuccess: (row) => {
      qc.setQueryData(["trip", row.id], row);
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}
