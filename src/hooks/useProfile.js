import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  fetchProfile, saveProfile, fetchDocuments, saveDocument, deleteDocument,
  fetchSavedTravelers, saveTraveler, deleteTraveler,
} from "../utils/profile";

// The signed-in user's profile details ({ id } only until they first save)
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user.id),
    enabled: !!user,
  });
}

// mutate(changes) saves those profile fields
export function useSaveProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (changes) => saveProfile(user.id, changes),
    onSuccess: (row) => qc.setQueryData(["profile", user.id], row),
  });
}

export function useDocuments() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["documents", user?.id], queryFn: fetchDocuments, enabled: !!user });
}

export function useSaveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useSavedTravelers() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["savedTravelers", user?.id], queryFn: fetchSavedTravelers, enabled: !!user });
}

export function useSaveTraveler() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (traveler) => saveTraveler(user.id, traveler),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedTravelers"] }),
  });
}

export function useDeleteTraveler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTraveler,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savedTravelers"] }),
  });
}
