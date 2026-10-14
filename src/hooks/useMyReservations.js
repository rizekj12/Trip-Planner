import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyReservations, addMyReservation, updateMyReservation, deleteMyReservation } from "../utils/aiService";

// A travel partner's own flights and hotels on a trip: { flights, hotels }. Nobody else
// (not the organizer, not other travelers) can see them. `who` is { tripId } for a signed-in
// member or { guestToken } for a guest.
const keyFor = (who) => ["my-reservations", who.guestToken || who.tripId];

export function useMyReservations(who) {
  return useQuery({
    queryKey: keyFor(who),
    queryFn: () => getMyReservations(who),
    enabled: !!(who.guestToken || who.tripId),
  });
}

// mutate({ action: "save" | "delete", kind, value }): value.id decides add vs. update
export function useChangeMyReservation(who) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, kind, value }) => {
      if (action === "delete") return deleteMyReservation(who, value.id);
      // Only the details are sent; the server keeps the fields it knows and drops the rest
      const { id, kind: _kind, source: _source, ...details } = value;
      return id ? updateMyReservation(who, id, details) : addMyReservation(who, kind, details);
    },
    // Every change returns the updated list
    onSuccess: (list) => qc.setQueryData(keyFor(who), list),
  });
}
