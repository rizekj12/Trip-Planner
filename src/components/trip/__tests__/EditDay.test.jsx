// @vitest-environment jsdom
// Editing a day (issue #37): the real hooks and an optimistic cache, with saving to Supabase,
// place search and Claude mocked. The "server" applies each edit to its own copy, like the
// revision-checked save does.
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

const server = vi.hoisted(() => ({ itinerary: null, fail: false }));
vi.mock("../../../utils/trips", () => ({
  editItinerary: async (_id, edit) => {
    if (server.fail) throw new Error("offline");
    server.itinerary = edit(server.itinerary);
    return { days: server.itinerary.days, spots: server.itinerary.spots };
  },
}));
const api = vi.hoisted(() => ({ searchPlaces: vi.fn(), regenerateTripDay: vi.fn() }));
vi.mock("../../../utils/aiService", () => api);
vi.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
// Reorder needs layout measurements jsdom doesn't have; a plain list is enough here
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const strip = ({ axis: _a, values: _v, onReorder: _o, value: _val, dragListener: _d, dragControls: _c, onDragEnd: _e, ...rest }) => rest;
  return {
    Reorder: { Group: (p) => <ul {...strip(p)} />, Item: (p) => <li {...strip(p)} /> },
    useDragControls: () => ({ start: () => {} }),
  };
});

const DayDetails = (await import("../DayDetails")).default;

const start = () => ({
  days: [
    { key: "d1", city: "Tokyo", title: "One", markers: ["a", "b", "c"], notes: [] },
    { key: "d2", city: "Tokyo", title: "Two", markers: ["d"], notes: [] },
  ],
  spots: { a: { title: "Senso-ji" }, b: { title: "Skytree" }, c: { title: "Ueno Park" }, d: { title: "Meiji Shrine" } },
});
const DAYS = [{ key: "d1", n: 1, city: "Tokyo" }, { key: "d2", n: 2, city: "Tokyo" }];

// Reads the trip from the cache, as the trip page does
function Day({ dayIndex = 0, canEdit = true }) {
  const { data } = useQuery({ queryKey: ["trip", "t1"], queryFn: () => new Promise(() => {}) });
  const it = data.itinerary_data;
  return <DayDetails day={it.days[dayIndex]} spots={it.spots} canEdit={canEdit} tripId="t1" days={DAYS} country="Japan" />;
}
const setup = (props) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  qc.setQueryData(["trip", "t1"], { id: "t1", itinerary_data: start() });
  render(<QueryClientProvider client={qc}><Day {...props} /></QueryClientProvider>);
  return qc;
};
const titles = () => screen.getAllByRole("listitem").map((li) => li.textContent);
const startEditing = () => fireEvent.click(screen.getByRole("button", { name: /Edit day/ }));

beforeEach(() => {
  server.itinerary = start();
  server.fail = false;
  vi.clearAllMocks();
});

describe("marking stops done", () => {
  test("the organizer taps a stop's number to tick it off", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Mark Skytree as done" }));
    expect(await screen.findByRole("button", { name: /Skytree: done/ })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(server.itinerary.days[0].done).toEqual(["b"]));
  });

  test("travel partners see ticks but can't change anything", () => {
    server.itinerary.days[0].done = ["a"];
    const qc = new QueryClient();
    qc.setQueryData(["trip", "t1"], { id: "t1", itinerary_data: { ...start(), days: [{ ...start().days[0], done: ["a"] }, start().days[1]] } });
    render(<QueryClientProvider client={qc}><Day canEdit={false} /></QueryClientProvider>);
    expect(screen.queryByRole("button", { name: /Edit day/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Mark/ })).toBeNull();
    expect(screen.getByText(/Stop 1 \(done\)/)).toBeInTheDocument();
  });
});

describe("editing a day", () => {
  test("move a stop down, and to another day", async () => {
    setup();
    startEditing();
    fireEvent.click(screen.getByRole("button", { name: "Move Senso-ji down" }));
    await waitFor(() => expect(server.itinerary.days[0].markers).toEqual(["b", "a", "c"]));
    fireEvent.change(screen.getByRole("combobox", { name: /Move Ueno Park to another day/ }), { target: { value: "d2" } });
    await waitFor(() => expect(server.itinerary.days[1].markers).toEqual(["d", "c"]));
    expect(titles().join(" ")).not.toContain("Ueno Park");
  });

  test("remove a stop, then undo", async () => {
    setup();
    startEditing();
    fireEvent.click(screen.getByRole("button", { name: "Remove Skytree" }));
    await waitFor(() => expect(server.itinerary.days[0].markers).toEqual(["a", "c"]));
    expect(screen.getByRole("status")).toHaveTextContent("Removed Skytree");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(server.itinerary.days[0].markers).toEqual(["a", "b", "c"]));
    expect(server.itinerary.spots.b).toEqual({ title: "Skytree" });
  });

  test("add a stop from a place search near the day's city", async () => {
    api.searchPlaces.mockResolvedValue([{ title: "Tsukiji Outer Market", address: "4 Chome Tsukiji", coords: [35.66, 139.77] }]);
    setup();
    startEditing();
    fireEvent.change(screen.getByLabelText(/Add a stop/), { target: { value: "tsukiji" } });
    fireEvent.click(await screen.findByRole("button", { name: /Tsukiji Outer Market/ }));
    await waitFor(() => expect(server.itinerary.days[0].markers).toEqual(["a", "b", "c", "tsukiji_outer_market"]));
    expect(api.searchPlaces).toHaveBeenCalledWith("tsukiji", { city: "Tokyo", country: "Japan" });
    expect(server.itinerary.spots.tsukiji_outer_market).toMatchObject({ coords: [35.66, 139.77], location: "verified" });
  });

  test("re-plan the day with a note", async () => {
    api.regenerateTripDay.mockResolvedValue({ days: [{ ...start().days[0], title: "Food day", markers: ["e"] }, start().days[1]], spots: { e: { title: "Afuri Ramen" }, d: { title: "Meiji Shrine" } } });
    const qc = setup();
    startEditing();
    fireEvent.click(screen.getByRole("button", { name: /Re-plan this day with AI/ }));
    fireEvent.change(screen.getByLabelText(/Re-plan this day/), { target: { value: "more food" } });
    fireEvent.click(screen.getByRole("button", { name: /^Re-plan$/ }));
    await waitFor(() => expect(qc.getQueryData(["trip", "t1"]).itinerary_data.days[0].title).toBe("Food day"));
    expect(api.regenerateTripDay).toHaveBeenCalledWith("t1", "d1", "more food");
    expect(titles().join(" ")).toContain("Afuri Ramen");
  });

  test("if saving fails, the day goes back to how it was and says so", async () => {
    server.fail = true;
    setup();
    startEditing();
    fireEvent.click(screen.getByRole("button", { name: "Move Senso-ji down" }));
    expect(await screen.findByText(/Couldn't save that change: offline/)).toBeInTheDocument();
    expect(within(screen.getAllByRole("listitem")[0]).getByText("Senso-ji")).toBeInTheDocument();
  });
});
