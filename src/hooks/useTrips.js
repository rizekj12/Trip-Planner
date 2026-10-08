import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrips, fetchTrip, deleteTrip, saveTrip, saveDraft } from "../utils/trips";

export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: fetchTrips });
}

export function useTrip(id) {
  return useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTrip(id),
    enabled: !!id,
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

export function useSaveTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveTrip,
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
