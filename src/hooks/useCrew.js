import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCrew, getInviteToken, removeCrewMember, joinTrip } from "../utils/aiService";

// Who's on a trip: { isOwner, people: [{ id, role, name, avatarUrl, email?, isYou }] }
export function useCrew(tripId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["crew", tripId],
    queryFn: () => getCrew(tripId),
    enabled: !!tripId && enabled,
    staleTime: 30_000,
  });
}

// The trip's invite link. mutate() gets it (creating one if needed); mutate({ reset: true })
// replaces it so old links stop working.
export function useInviteLink(tripId) {
  return useMutation({
    mutationFn: ({ reset = false } = {}) => getInviteToken(tripId, reset),
  });
}

// Built in the browser so the link always points at the site the user is on
export const inviteUrl = (token) => `${window.location.origin}/join/${token}`;

// Owner removes someone, or a member removes themselves (leave the trip)
export function useRemoveCrewMember(tripId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId) => removeCrewMember(tripId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crew", tripId] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

// Join from an invite link: signed in -> member; guest ({ name, email }) -> view-only link
export function useJoinTrip(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (guest) => joinTrip(token, guest),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
}
