import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCrew, getInviteToken, removeCrewMember, joinTrip, answerJoinRequest } from "../utils/aiService";

// Who's on a trip: { isOwner, maxTravelers, people: [{ id, role, status, name, avatarUrl, email?, isYou }] }.
// The owner also gets pending join requests (status "pending").
export function useCrew(tripId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["crew", tripId],
    queryFn: () => getCrew(tripId),
    enabled: !!tripId && enabled,
    staleTime: 30_000,
  });
}

// The trip's invite link and settings. mutate() gets it (creating one if needed);
// mutate({ reset: true }) replaces it so old links stop working; mutate({ requireApproval })
// changes whether new travelers need the organizer's approval.
export function useInviteLink(tripId) {
  return useMutation({
    mutationFn: (options = {}) => getInviteToken(tripId, options),
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

// Owner approves or denies a join request: mutate({ tripId, memberId, decision: "approve" | "deny" }).
// Used from the crew tab and from notifications, so the trip id comes with each call.
export function useAnswerJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, memberId, decision }) => answerJoinRequest(tripId, memberId, decision),
    onSettled: (_data, _error, { tripId }) => {
      qc.invalidateQueries({ queryKey: ["crew", tripId] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
