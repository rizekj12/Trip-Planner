// @vitest-environment jsdom
// A travel partner's Reservations screen: shows only their own list (from the server), says
// so, and saves through the partner API, never by editing the trip itself.
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  getMyReservations: vi.fn(),
  addMyReservation: vi.fn(),
  updateMyReservation: vi.fn(),
  deleteMyReservation: vi.fn(),
}));
vi.mock("../../../utils/aiService", () => api);
const trips = vi.hoisted(() => ({ updateTripFormData: vi.fn() }));
vi.mock("../../../utils/trips", async (importOriginal) => ({ ...(await importOriginal()), ...trips }));

import MyReservationsPanel from "../MyReservationsPanel";

const renderPanel = (props) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MyReservationsPanel {...props} />
    </QueryClientProvider>
  );

const FLIGHT = { id: "r1", kind: "flight", airline: "Delta", flightNumber: "DL 9", confirmationCode: "abc123", from: "ATL", to: "HND" };

beforeEach(() => vi.clearAllMocks());

describe("MyReservationsPanel", () => {
  test("shows the partner's own reservations and the privacy notice", async () => {
    api.getMyReservations.mockResolvedValue({ flights: [FLIGHT], hotels: [] });
    renderPanel({ tripId: "trip-1" });
    expect(await screen.findByText("ABC123")).toBeInTheDocument();
    expect(screen.getByText(/Only you can see these/)).toBeInTheDocument();
    expect(api.getMyReservations).toHaveBeenCalledWith({ tripId: "trip-1" });
  });

  test("guests load by their link, not by trip", async () => {
    api.getMyReservations.mockResolvedValue({ flights: [], hotels: [] });
    renderPanel({ tripId: "trip-1", guestToken: "guest-token" });
    await waitFor(() => expect(api.getMyReservations).toHaveBeenCalledWith({ guestToken: "guest-token" }));
  });

  test("adding a hotel goes through the partner API and never edits the trip", async () => {
    api.getMyReservations.mockResolvedValue({ flights: [], hotels: [] });
    api.addMyReservation.mockResolvedValue({ flights: [], hotels: [{ id: "h1", kind: "hotel", name: "Capsule Inn", confirmationCode: "zz9" }] });
    renderPanel({ tripId: "trip-1" });

    fireEvent.click(await screen.findByRole("button", { name: /Add hotel/ }));
    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Capsule Inn" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("ZZ9")).toBeInTheDocument();
    expect(api.addMyReservation).toHaveBeenCalledWith({ tripId: "trip-1" }, "hotel", expect.objectContaining({ name: "Capsule Inn" }));
    expect(trips.updateTripFormData).not.toHaveBeenCalled();
  });

  test("editing sends the id and details only", async () => {
    api.getMyReservations.mockResolvedValue({ flights: [FLIGHT], hotels: [] });
    api.updateMyReservation.mockResolvedValue({ flights: [FLIGHT], hotels: [] });
    renderPanel({ tripId: "trip-1" });

    fireEvent.click(await screen.findByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(api.updateMyReservation).toHaveBeenCalled());
    const [, id, details] = api.updateMyReservation.mock.calls[0];
    expect(id).toBe("r1");
    expect(details).not.toHaveProperty("id");
    expect(details).not.toHaveProperty("kind");
    expect(details.confirmationCode).toBe("abc123");
  });
});
