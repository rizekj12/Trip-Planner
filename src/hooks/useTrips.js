import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrips, fetchTrip, deleteTrip, saveDraft, tripStatus } from "../utils/trips";
import { startGeneration, loadMoreFoodSpots, downloadTripPdf } from "../utils/aiService";

// How often to re-check while an itinerary is being generated
const PENDING_POLL_MS = 4000;

export function useTrips() {
  return useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
    refetchInterval: (query) =>
      query.state.data?.some((t) => tripStatus(t) === "pending") ? PENDING_POLL_MS : false,
  });
}

export function useTrip(id) {
  return useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTrip(id),
    enabled: !!id,
    refetchInterval: (query) =>
      tripStatus(query.state.data) === "pending" ? PENDING_POLL_MS : false,
  });
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
    mutationFn: (trip) =>
      downloadTripPdf({ tripId: trip.id, filename: pdfFilename(trip.destination) }),
    // The server may have filled in missing food spots while building it; pick them up
    onSuccess: (_, trip) => qc.invalidateQueries({ queryKey: ["trip", trip.id] }),
  });
}

function pdfFilename(destination) {
  const name = (destination || "trip").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return `${name || "trip"}-itinerary.pdf`;
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
