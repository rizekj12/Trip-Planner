// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CalendarPage from "../CalendarPage";

// The page's data comes from these hooks; the header and tab bar aren't under test
vi.mock("../../hooks/useTrips", () => ({ useTrips: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me", created_at: "2026-01-05T00:00:00Z" } }),
}));
vi.mock("../../components/AppHeader", () => ({ default: () => null }));
vi.mock("../../components/BottomTabBar", () => ({ default: () => null }));

import { useTrips } from "../../hooks/useTrips";

const trip = (id, destination, checkIn, checkOut, extra = {}) => ({
  id,
  user_id: "me",
  destination,
  cities: ["City"],
  status: "ready",
  itinerary_data: { _form_data: { cities: [{ name: "City", checkIn, checkOut }] } },
  ...extra,
});

const renderAt = (month) =>
  render(
    <MemoryRouter initialEntries={[`/calendar${month ? `?month=${month}` : ""}`]}>
      <CalendarPage />
    </MemoryRouter>
  );

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T12:00:00"));
    useTrips.mockReturnValue({
      isLoading: false,
      data: [
        trip("t1", "Japan", "2026-10-20", "2026-10-27"),
        trip("t2", "Chile", "2026-12-03", "2026-12-10", { user_id: "friend" }),
        trip("t3", "Italy", "2026-03-01", "2026-03-08"),
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  test("shows the month, its trips on the grid and in the side list", () => {
    renderAt("2026-10");
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getAllByTitle(/Japan · Oct 20 – 27/).length).toBeGreaterThan(0);
    const list = screen.getByRole("heading", { name: /In Oct 2026/ }).closest("section");
    expect(within(list).getByText(/Japan/)).toBeInTheDocument();
    expect(within(list).getByText("In 7 days")).toBeInTheDocument();
  });

  test("next trip jumps to the next month with a trip, and shared trips are labeled", () => {
    renderAt("2026-10");
    fireEvent.click(screen.getByRole("button", { name: /Next trip/ }));
    expect(screen.getByRole("heading", { name: "December 2026" })).toBeInTheDocument();
    expect(screen.getByText("Shared")).toBeInTheDocument();
  });

  test("empty months offer a jump to the next trip", () => {
    renderAt("2026-11");
    expect(screen.getByText("No trips this month")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Jump to Chile/ }));
    expect(screen.getByRole("heading", { name: "December 2026" })).toBeInTheDocument();
  });

  test("the year summary counts that year's trips", () => {
    renderAt("2026-10");
    const glance = screen.getByRole("heading", { name: "2026 at a glance" }).closest("section");
    expect(glance.textContent).toContain("3trips");
    expect(glance.textContent).toContain("21days away"); // 7 + 7 + 7
    expect(glance.textContent).toContain("3countries");
  });
});
