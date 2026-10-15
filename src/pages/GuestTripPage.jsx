import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import LoadingScreen from "../components/LoadingScreen";
import { TripView } from "./TripPage";
import { getGuestTrip } from "../utils/aiService";
import { tripStatus } from "../utils/trips";

// A guest's view-only trip (/guest/:token), open without signing in. The server leaves out
// the organizer's reservations and confirmation codes; the guest can keep their own in
// "My reservations", which only they can see. Until the organizer approves the guest,
// it only says the request is waiting (and checks back every 30 seconds).
export default function GuestTripPage() {
  const { token } = useParams();
  const guest = useQuery({
    queryKey: ["guest", token],
    queryFn: () => getGuestTrip(token),
    retry: false,
    // Keep checking while the organizer's itinerary is still being generated
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "pending") return 30_000;
      return tripStatus(data?.trip) === "pending" ? 5000 : false;
    },
  });

  if (guest.isLoading) return <LoadingScreen />;
  if (guest.isError) return <LoadingScreen message={guest.error.message || "This trip link is no longer valid."} />;
  if (guest.data.status === "pending") {
    return (
      <LoadingScreen
        message={`Hi ${guest.data.guestName}! Your request to join the trip to ${guest.data.destination} is waiting for ${guest.data.ownerName}'s approval. Bookmark this page — the trip opens here once you're approved.`}
      />
    );
  }

  const { trip, guestName, crew } = guest.data;
  const { _form_data, ...itinerary } = trip.itinerary_data || {};
  if (tripStatus(trip) !== "ready" || !itinerary.days?.length) {
    return <LoadingScreen message="The itinerary isn't ready yet — check back soon." />;
  }

  return (
    <>
      <div className="bg-violet-700 px-4 py-2 text-center text-sm text-white">
        Hi {guestName}! You're viewing this trip as a guest. Bookmark this page to come back to it.
      </div>
      <TripView
        tripId={trip.id}
        itinerary={itinerary}
        formData={_form_data || { country: trip.destination, cities: [] }}
        foodSpots={trip.foodSpots || {}}
        homebases={trip.homebases || {}}
        viewer="guest"
        crew={crew}
        guestToken={token}
      />
    </>
  );
}
