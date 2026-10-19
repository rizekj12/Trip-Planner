// @vitest-environment jsdom
// The status line under each saved traveler (issue #57)
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TravelerStatus } from "../TravelersSection";

test.each([
  [{ onTripPlanner: true, tripsTogether: 3 }, "On Trip Planner · 3 trips together"],
  [{ onTripPlanner: true, tripsTogether: 1 }, "On Trip Planner · 1 trip together"],
  [{ onTripPlanner: false, tripsTogether: 2 }, "Joined as a guest · 2 trips together"],
  [{ onTripPlanner: false, tripsTogether: 0 }, "No trips together yet"],
])("%o", (status, text) => {
  render(<TravelerStatus status={status} />);
  expect(screen.getByText(text)).toBeInTheDocument();
});

test("nothing while the status is loading", () => {
  const { container } = render(<TravelerStatus status={undefined} />);
  expect(container).toBeEmptyDOMElement();
});
