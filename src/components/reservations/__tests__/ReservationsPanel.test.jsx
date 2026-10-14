// @vitest-environment jsdom
// The organizer's Reservations tab still reads from and saves to the trip's form data.
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const trips = vi.hoisted(() => ({ updateTripFormData: vi.fn(async (id, update) => ({ id, itinerary_data: { _form_data: update({}) } })) }));
vi.mock("../../../utils/trips", async (importOriginal) => ({ ...(await importOriginal()), ...trips }));

import ReservationsPanel from "../ReservationsPanel";

const formData = {
  cities: [{ name: "Tokyo", checkIn: "2030-04-01", checkOut: "2030-04-05", homebaseType: "hotel", hotel: { name: "Hotel Sakura", address: "Ginza", confirmationCode: "hotel1" } }],
  reservations: { flights: [{ id: "f1", airline: "United", confirmationCode: "fly1" }], hotels: [] },
};

test("shows the organizer's questionnaire hotel and flights, and saves to the trip", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReservationsPanel tripId="trip-1" formData={formData} />
    </QueryClientProvider>
  );
  expect(screen.getByText("HOTEL1")).toBeInTheDocument();
  expect(screen.getByText("FLY1")).toBeInTheDocument();
  expect(screen.getByText("Your stay in Tokyo")).toBeInTheDocument();
  expect(screen.queryByText(/Only you can see these/)).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: /Edit/ })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(trips.updateTripFormData).toHaveBeenCalledWith("trip-1", expect.any(Function)));
});
