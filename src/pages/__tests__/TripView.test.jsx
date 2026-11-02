// @vitest-environment jsdom
// Itinerary page (Design A): every day in a strip, arrows, previous/next, and the URL
import { describe, test, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("../../hooks/useTrips", () => ({ useDownloadPdf: () => ({ mutate: vi.fn(), isPending: false }), useTrip: vi.fn(), useStartGeneration: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { id: "me" } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../components/DayMap", () => ({ default: ({ items }) => <div data-testid="map">{items.length} pins</div> }));
vi.mock("../../components/crew/CrewBubbles", () => ({ default: () => null }));
vi.mock("../../components/EventsPanel", () => ({ default: () => <div>Events panel</div> }));
vi.mock("../../components/FoodSpotsPanel", () => ({ default: () => <div>Food panel</div> }));
vi.mock("../../components/reservations/ReservationsPanel", () => ({ default: () => <div>Reservations panel</div> }));
vi.mock("../../components/reservations/MyReservationsPanel", () => ({ default: () => <div>My reservations panel</div> }));
vi.mock("../../components/crew/CrewPanel", () => ({ default: () => <div>Crew panel</div> }));
vi.mock("../../components/photos/PhotosPanel", () => ({ default: ({ days }) => <div>Photos panel ({days.length} days)</div> }));

const { TripView } = await import("../TripPage");

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn(); // not in jsdom
});

const spot = (title) => ({ title, coords: [35, 139], address: `${title} address`, links: {} });
const itinerary = {
  days: [
    { key: "d1", date: "Day 1 (Tokyo)", title: "Arrival in Asakusa", markers: ["a", "b"], notes: ["Rest up"], hotel: { name: "Hotel Sakura", address: "Ginza", coords: [35, 139] } },
    { key: "d2", date: "Day 2 (Tokyo)", title: "Shibuya and Harajuku", markers: ["c"], notes: [] },
    { key: "d3", date: "Day 3 (Kyoto)", title: "Bullet train to Kyoto", markers: [], notes: [] },
  ],
  spots: { a: spot("Senso-ji"), b: spot("Skytree"), c: spot("Meiji Shrine") },
  events: [],
};
const formData = {
  country: "Japan",
  cities: [
    { name: "Tokyo", checkIn: "2030-04-01", checkOut: "2030-04-03" },
    { name: "Kyoto", checkIn: "2030-04-03", checkOut: "2030-04-04" },
  ],
};

let location;
function Where() {
  location = useLocation();
  return null;
}
const renderAt = (path = "/trip/t1", viewer = "owner") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TripView tripId="t1" itinerary={itinerary} formData={formData} foodSpots={{}} homebases={{}} viewer={viewer} />
      <Where />
    </MemoryRouter>
  );

const dayHeading = () => screen.getByRole("heading", { level: 2 });
const days = () => within(screen.getByRole("navigation", { name: "Days" }));

describe("TripView", () => {
  test("shows every day in the strip and opens on day 1", () => {
    renderAt();
    expect(days().getAllByRole("button", { name: /^Day \d/ })).toHaveLength(3);
    expect(dayHeading()).toHaveTextContent("Arrival in Asakusa");
    expect(screen.getByText(/Day 1 of 3 · Mon, Apr 1 · Tokyo/)).toBeInTheDocument();
    expect(screen.getByTestId("map")).toHaveTextContent("3 pins"); // 2 stops + hotel
    expect(screen.getByText("Hotel Sakura")).toBeInTheDocument();
  });

  test("the arrows move between days and stop at the ends", () => {
    renderAt();
    expect(days().getByRole("button", { name: "Previous day" })).toBeDisabled();
    fireEvent.click(days().getByRole("button", { name: "Next day" }));
    expect(dayHeading()).toHaveTextContent("Shibuya and Harajuku");
    expect(location.search).toBe("?day=2");
    fireEvent.click(days().getByRole("button", { name: "Next day" }));
    expect(dayHeading()).toHaveTextContent("Bullet train to Kyoto");
    expect(screen.getByText(/Day 3 of 3 · Wed, Apr 3 · Kyoto/)).toBeInTheDocument();
    expect(days().getByRole("button", { name: "Next day" })).toBeDisabled();
  });

  test("tapping a day chip, and the previous/next cards, change the day", () => {
    renderAt();
    fireEvent.click(days().getByRole("button", { name: /Day 3, Wed, Apr 3, Kyoto/ }));
    expect(dayHeading()).toHaveTextContent("Bullet train to Kyoto");
    fireEvent.click(screen.getByRole("button", { name: /Previous · Day 2/ }));
    expect(dayHeading()).toHaveTextContent("Shibuya and Harajuku");
  });

  test("?day= and ?section= open straight on a day or section", () => {
    renderAt("/trip/t1?day=2");
    expect(dayHeading()).toHaveTextContent("Shibuya and Harajuku");
  });

  test("section tabs are always visible and switch panels", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "Food spots" }));
    expect(screen.getByText("Food panel")).toBeInTheDocument();
    expect(location.search).toBe("?section=food");
    fireEvent.click(screen.getByRole("button", { name: "Itinerary" }));
    expect(dayHeading()).toHaveTextContent("Arrival in Asakusa");
  });

  test("the Photos tab opens the shared album with the trip's days", () => {
    renderAt("/trip/t1", "guest");
    fireEvent.click(screen.getByRole("button", { name: "Photos" }));
    expect(screen.getByText("Photos panel (3 days)")).toBeInTheDocument();
    expect(location.search).toBe("?section=photos");
  });

  test("partners and guests get their own reservations tab and no organizer panel", () => {
    renderAt("/trip/t1?section=reservations", "member");
    expect(screen.getByRole("button", { name: "My reservations" })).toBeInTheDocument();
    expect(screen.getByText("My reservations panel")).toBeInTheDocument();
    expect(screen.queryByText("Reservations panel")).toBeNull();
  });

  test("a trip in your own country is named after its cities", () => {
    auth.user = { id: "me", user_metadata: { home_country: "Japan" } };
    renderAt();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("3 days in Tokyo & Kyoto");
    auth.user = { id: "me" };
  });

  test("swiping the plan changes day", () => {
    renderAt();
    const plan = screen.getByRole("heading", { name: "The plan" }).closest("div.md\\:col-span-2");
    fireEvent.touchStart(plan, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(plan, { changedTouches: [{ clientX: 150, clientY: 110 }] });
    expect(dayHeading()).toHaveTextContent("Shibuya and Harajuku");
  });
});
