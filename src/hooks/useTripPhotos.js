import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTripPhotos, addTripPhoto, updateTripPhoto, deleteTripPhoto } from "../utils/photos";

// The trip's shared photo album. `who` is { tripId } (signed in) or { guestToken } (guest).
const keyFor = (who) => ["trip-photos", who.guestToken || who.tripId];

export function useTripPhotos(who) {
  return useQuery({
    queryKey: keyFor(who),
    queryFn: () => getTripPhotos(who),
    enabled: !!(who.guestToken || who.tripId),
    // Photo links are signed for an hour; reload well before they stop working, and pick up
    // what others added in the meantime
    staleTime: 60_000,
    refetchInterval: 20 * 60_000,
  });
}

// Every change returns the updated album
function useAlbumMutation(who, mutationFn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn, onSuccess: (album) => qc.setQueryData(keyFor(who), album) });
}

// mutate({ prepared, day }), prepared from preparePhoto (src/utils/photoFile.js)
export const useAddTripPhoto = (who) => useAlbumMutation(who, ({ prepared, day }) => addTripPhoto(who, prepared, day));

// mutate({ id, changes: { caption?, day? } })
export const useUpdateTripPhoto = (who) => useAlbumMutation(who, ({ id, changes }) => updateTripPhoto(who, id, changes));

export const useDeleteTripPhoto = (who) => useAlbumMutation(who, (id) => deleteTripPhoto(who, id));
