import React from "react";
import { ReservationsView } from "./ReservationsPanel";
import { useMyReservations, useChangeMyReservation } from "../../hooks/useMyReservations";

// A travel partner's own reservations on a trip they joined: the flights and hotels they
// booked, with their confirmation codes. Only they can see these; the organizer's codes and
// other travelers' codes are never shown here. Signed-in members pass tripId; guests pass
// their guestToken.
export default function MyReservationsPanel({ tripId, guestToken }) {
  const who = guestToken ? { guestToken } : { tripId };
  const list = useMyReservations(who);
  const change = useChangeMyReservation(who);

  if (list.isError) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 text-center text-gray-700 shadow-xl">
        Couldn't load your reservations: {list.error.message}
      </div>
    );
  }

  return (
    <ReservationsView
      flights={list.data?.flights || []}
      hotels={list.data?.hotels || []}
      isLoading={list.isLoading}
      save={change}
      saveChange={(editing) => ({ action: "save", kind: editing.kind, value: editing.value })}
      deleteChange={(editing) => ({ action: "delete", kind: editing.kind, value: editing.value })}
      subtitle="Your own flights and hotels for this trip"
      notice="Only you can see these. The organizer and other travelers can't see your confirmation codes, and you can't see theirs."
      footnote={guestToken ? null : "Your reservations are included when you download the PDF, so you'll have them offline."}
    />
  );
}
