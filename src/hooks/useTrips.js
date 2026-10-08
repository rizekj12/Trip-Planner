import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrips, fetchTrip, deleteTrip, saveDraft, tripStatus } from "../utils/trips";
import { startGeneration } from "../utils/aiService";

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
