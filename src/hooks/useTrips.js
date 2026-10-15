import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../utils/supabase";
import { fetchTrips, fetchTrip, deleteTrip, saveDraft, tripStatus, updateTripFormData, markPdfDownloaded } from "../utils/trips";
import { startGeneration, loadMoreFoodSpots, downloadTripPdf, refreshTripEvents } from "../utils/aiService";
import { useAuth } from "../context/AuthContext";

// While an itinerary is being generated:
// - on the organizer's own trips, Supabase Realtime tells us the moment the row changes, and
//   polling is only a fallback (e.g. if Realtime is blocked or not enabled);
// - travel partners can't read the row (or get Realtime events for it, issue #62), so a shared
//   trip is re-fetched from the server's shared view on a shorter interval instead.
const PENDING_POLL_MS = 15_000;
const SHARED_PENDING_POLL_MS = 5_000;

// How often to re-check these trips: sooner while a shared one is generating
function pollInterval(trips, userId) {
  const pending = trips.filter((t) => t && tripStatus(t) === "pending");
  if (pending.some((t) => t.user_id !== userId)) return SHARED_PENDING_POLL_MS;
  return pending.length ? PENDING_POLL_MS : false;
}

// Ids of the user's own trips that are generating (the ones Realtime can tell us about)
const ownPendingIds = (trips, userId) =>
  trips.filter((t) => t && t.user_id === userId && tripStatus(t) === "pending").map((t) => t.id);

export function useTrips() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
    refetchInterval: (query) => pollInterval(query.state.data || [], user?.id),
  });
  useLiveUpdates(ownPendingIds(query.data || [], user?.id));
  return query;
}

export function useTrip(id) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTrip(id),
    enabled: !!id,
    refetchInterval: (query) => pollInterval([query.state.data], user?.id),
  });
  useLiveUpdates(ownPendingIds([query.data], user?.id));
  return query;
}

// Refetches as soon as any of these (own) trips' rows change (e.g. generation finished)
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
        foodSpots: { ...trip.foodSpots, [city]: spots },
        homebases: { ...trip.homebases, [city]: homebase },
      });
    },
  });
}

// Fetches real local events for a trip (Ticketmaster) and puts them in the trip's cache
export function useRefreshEvents(tripId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshTripEvents(tripId),
    onSuccess: ({ events, source, checkedAt }) => {
      qc.setQueryData(["trip", tripId], (trip) => trip && {
        ...trip,
        itinerary_data: { ...trip.itinerary_data, events, _events_source: source, _events_checked_at: checkedAt },
      });
    },
  });
}

// Builds and downloads a trip's offline PDF. Call mutate(trip): a trip row, or
// { id, destination, isOwner }.
export function useDownloadPdf() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (trip) => {
      await downloadTripPdf({ tripId: trip.id, filename: pdfFilename(trip.destination) });
      // The checklist mark lives on the trip, which only its organizer can change. Not worth
      // failing the download over.
      const isOwner = trip.isOwner ?? trip.user_id === user?.id;
      if (isOwner) await markPdfDownloaded(trip.id).catch(console.error);
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
