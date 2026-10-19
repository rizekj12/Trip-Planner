// @vitest-environment jsdom
// The questionnaire's detailed, optional questions (issue #90): Quick vs Detailed plans, nothing
// new blocks Next, old drafts still load, and only real answers are sent
import { describe, test, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../hooks/useProfile", () => ({
  useProfile: () => ({ isLoading: false, data: { accessibility_needs: ["Vegan", "Limited walking"] } }),
}));
vi.mock("../DestinationPicker", () => ({ default: ({ value }) => <div>{value}</div> }));
// Steps swap instantly (AnimatePresence would wait for the exit animation)
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const strip = ({ initial: _i, animate: _a, exit: _e, transition: _t, ...rest }) => rest;
  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: { div: React.forwardRef(function MotionDiv(props, ref) { return <div ref={ref} {...strip(props)} />; }) },
  };
});
const TripQuestionnaire = (await import("../TripQuestionnaire")).default;

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// A draft saved before issue #90: no `preferences` at all
const oldDraft = () => ({
  country: "Japan",
  cities: [{ name: "Tokyo", checkIn: "2030-04-01", checkOut: "2030-04-04", homebaseType: "skip", hotel: { name: "", address: "" }, customAddress: "" }],
  travelStyle: "flexible",
  vacationType: "balanced",
  reservations: { flights: [], hotels: [] },
});

const setup = (initialFormData = oldDraft()) => {
  const onComplete = vi.fn();
  render(
    <MemoryRouter>
      <TripQuestionnaire initialFormData={initialFormData} onComplete={onComplete} onHome={vi.fn()} isGenerating={false} />
    </MemoryRouter>
  );
  return onComplete;
};
const progress = () => screen.getByText(/^Step \d+ of \d+/).textContent;
const next = () => fireEvent.click(screen.getByRole("button", { name: /Next/ }));
const nextUntilReview = () => {
  for (let i = 0; i < 10 && !progress().includes("Review"); i++) next();
};

describe("TripQuestionnaire", () => {
  test("an old draft loads as a Detailed plan, and nothing new blocks Next", () => {
    const onComplete = setup();
    expect(progress()).toBe("Step 1 of 8 · Where & when");
    nextUntilReview();
    expect(progress()).toBe("Step 8 of 8 · Review");

    fireEvent.click(screen.getByRole("button", { name: /Generate Itinerary/ }));
    const { preferences } = onComplete.mock.calls[0][0];
    expect(preferences.planDetail).toBe("detailed");
    expect(preferences.budget.noPreference).toBe(true);
    expect(preferences.interests.noPreference).toBe(true);
  });

  test("a Quick plan is the original five steps", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /Quick plan/ }));
    expect(progress()).toBe("Step 1 of 5 · Where & when");
    nextUntilReview();
    expect(progress()).toBe("Step 5 of 5 · Review");
    expect(screen.queryByText("Who's going & budget")).toBeNull();
  });

  test("answering a question unticks No preference and is sent", () => {
    const onComplete = setup();
    next(); next(); next(); // to "Who's going & budget"
    expect(progress()).toContain("Who's going & budget");
    const group = screen.getByRole("group", { name: /Who's going\?/ });
    expect(within(group).getByRole("checkbox", { name: "No preference" })).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: "Couple" }));
    expect(within(group).getByRole("checkbox", { name: "No preference" })).not.toBeChecked();

    nextUntilReview();
    expect(screen.getByText("Couple")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Generate Itinerary/ }));
    expect(onComplete.mock.calls[0][0].preferences.groupType).toEqual({ value: "couple", noPreference: false });
  });

  test("ticking No preference again sets the answer aside", () => {
    const onComplete = setup();
    next(); next(); next();
    const group = screen.getByRole("group", { name: /Who's going\?/ });
    fireEvent.click(within(group).getByRole("radio", { name: "Family" }));
    fireEvent.click(within(group).getByRole("checkbox", { name: "No preference" }));
    nextUntilReview();
    fireEvent.click(screen.getByRole("button", { name: /Generate Itinerary/ }));
    expect(onComplete.mock.calls[0][0].preferences.groupType.noPreference).toBe(true);
  });

  test("review shows No preference and Edit jumps back to that step", () => {
    setup();
    nextUntilReview();
    expect(screen.getAllByText("No preference").length).toBeGreaterThan(10);
    const card = screen.getByRole("heading", { name: "Interests & food" }).closest("div.border-2");
    fireEvent.click(within(card).getByRole("button", { name: /Edit/ }));
    expect(progress()).toBe("Step 6 of 8 · Interests & food");
  });

  test("profile needs are shown read-only on the food and getting-around steps", () => {
    setup();
    for (let i = 0; i < 5; i++) next();
    expect(progress()).toContain("Interests & food");
    expect(screen.getByText("Vegan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit in profile" })).toHaveAttribute("href", "/profile?tab=safety");
    next();
    expect(screen.getByText("Limited walking")).toBeInTheDocument();
  });

  test("interests cycle through some, a lot and must", () => {
    const onComplete = setup();
    for (let i = 0; i < 5; i++) next();
    const food = () => screen.getByRole("button", { name: /^Food & drink/ });
    fireEvent.click(food());
    fireEvent.click(food());
    expect(food()).toHaveAccessibleName("Food & drink: A lot");
    nextUntilReview();
    fireEvent.click(screen.getByRole("button", { name: /Generate Itinerary/ }));
    expect(onComplete.mock.calls[0][0].preferences.interests).toEqual({ value: { food: 2 }, noPreference: false });
  });
});
