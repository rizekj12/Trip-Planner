// @vitest-environment jsdom
// The chat questionnaire: the assistant asks the old form's questions one at a time, answers
// are taps or small inline cards, and it sends the same form data the old form did (Quick vs
// Detailed plans, "No preference", old drafts, Edit from the review)
import { describe, test, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../hooks/useProfile", () => ({
  useProfile: () => ({ isLoading: false, data: { accessibility_needs: ["Vegan", "Limited walking"] } }),
}));
vi.mock("../DestinationPicker", () => ({
  default: ({ value, onChange }) => (
    <button type="button" onClick={() => onChange("Japan")}>{value || "Pick Japan"}</button>
  ),
}));
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

const setup = (initialFormData = null) => {
  const onComplete = vi.fn();
  render(
    <MemoryRouter>
      <TripQuestionnaire initialFormData={initialFormData} onComplete={onComplete} onHome={vi.fn()} isGenerating={false} botDelay={0} />
    </MemoryRouter>
  );
  return onComplete;
};
const tap = (name) => fireEvent.click(screen.getByRole("button", { name }));
const generate = () => tap(/Generate Itinerary/);
const editCard = (title) =>
  fireEvent.click(within(screen.getByRole("heading", { name: title }).closest("div.border-2")).getByRole("button", { name: /Edit/ }));

// Travel style and vacation type are asked together
const pickStyle = (style, type) => {
  tap(style);
  tap(type);
  tap("Done");
};

// Plan choice, destination, Tokyo and its dates
const startTrip = (plan) => {
  tap(plan);
  tap("Pick Japan");
  tap("Send");
  fireEvent.change(screen.getByLabelText("City name"), { target: { value: "Tokyo" } });
  tap("Send");
  fireEvent.change(screen.getByLabelText("Check-in"), { target: { value: "2030-04-01" } });
  fireEvent.change(screen.getByLabelText("Check-out"), { target: { value: "2030-04-04" } });
  tap("Send");
};

describe("TripQuestionnaire chat", () => {
  test("a Quick plan asks only the essentials and sends the form data", () => {
    const onComplete = setup();
    expect(screen.getByText(/I'm your TriptAi travel assistant/)).toBeInTheDocument();
    startTrip(/Quick plan/);
    tap("No, that's all");
    expect(screen.getByText(/flights booked/)).toBeInTheDocument();
    tap("Not yet");
    tap("Not booked yet");
    pickStyle("Flexible", "Balanced");

    // Straight to the review: no detailed questions in a Quick plan
    expect(screen.queryByText(/Who's coming along/)).toBeNull();
    generate();
    const sent = onComplete.mock.calls[0][0];
    expect(sent.country).toBe("Japan");
    expect(sent.cities).toHaveLength(1);
    expect(sent.cities[0]).toMatchObject({ name: "Tokyo", checkIn: "2030-04-01", checkOut: "2030-04-04", homebaseType: "skip" });
    expect(sent.travelStyle).toBe("flexible");
    expect(sent.vacationType).toBe("balanced");
    expect(sent.preferences.planDetail).toBe("quick");
  });

  test("answers show as chat bubbles", () => {
    setup();
    startTrip(/Quick plan/);
    expect(screen.getByText("Quick plan")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Apr 1 to Apr 4")).toBeInTheDocument();
  });

  test("dates must be in order before they can be sent", () => {
    setup();
    tap(/Quick plan/);
    tap("Pick Japan");
    tap("Send");
    fireEvent.change(screen.getByLabelText("City name"), { target: { value: "Tokyo" } });
    tap("Send");
    fireEvent.change(screen.getByLabelText("Check-in"), { target: { value: "2030-04-05" } });
    fireEvent.change(screen.getByLabelText("Check-out"), { target: { value: "2030-04-02" } });
    expect(screen.getByText("Check-out must be after check-in.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  test("a second city gets its own name, dates and stay questions", () => {
    const onComplete = setup();
    startTrip(/Quick plan/);
    tap("Add another city");
    expect(screen.getByText("Which city is next?")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("City name"), { target: { value: "Kyoto" } });
    tap("Send");
    fireEvent.change(screen.getByLabelText("Check-in"), { target: { value: "2030-04-04" } });
    fireEvent.change(screen.getByLabelText("Check-out"), { target: { value: "2030-04-07" } });
    tap("Send");
    tap("No, that's all");
    tap("Not yet");
    expect(screen.getByText(/Where are you staying in Tokyo/)).toBeInTheDocument();
    tap("Not booked yet");
    expect(screen.getByText(/Where are you staying in Kyoto/)).toBeInTheDocument();
    tap("Not booked yet");
    pickStyle("Flexible", "Balanced");
    generate();
    expect(onComplete.mock.calls[0][0].cities.map((c) => c.name)).toEqual(["Tokyo", "Kyoto"]);
  });

  test("an old draft opens on the review as a Detailed plan, with everything No preference", () => {
    const onComplete = setup(oldDraft());
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
    expect(screen.getAllByText("No preference").length).toBeGreaterThan(10);
    generate();
    const { preferences } = onComplete.mock.calls[0][0];
    expect(preferences.planDetail).toBe("detailed");
    expect(preferences.budget.noPreference).toBe(true);
    expect(preferences.interests.noPreference).toBe(true);
  });

  test("Edit on the review asks that part again, with who's going asked together", () => {
    const onComplete = setup(oldDraft());
    editCard("Who's going & budget");
    expect(screen.getByText(/let's update who's going & budget/)).toBeInTheDocument();
    // Group, travelers and pets are one card with one Done
    tap("Couple");
    tap("More adults");
    tap("Yes");
    tap("Done");
    expect(screen.getByText("Couple · 3 adults · with a pet")).toBeInTheDocument();
    tap("No preference"); // budget
    tap("No preference"); // splurge or save
    generate();
    const { preferences } = onComplete.mock.calls[0][0];
    expect(preferences.groupType).toEqual({ value: "couple", noPreference: false });
    expect(preferences.travelers).toEqual({ value: { kids: 0, teens: 0, adults: 3, seniors: 0 }, noPreference: false });
    expect(preferences.pets).toBe(true);
    expect(preferences.budget.noPreference).toBe(true);
  });

  test("a combined card left blank is all No preference", () => {
    const onComplete = setup(oldDraft());
    editCard("Who's going & budget");
    tap("Skip these");
    expect(screen.getByRole("button", { name: "Change answer: No preference" })).toBeInTheDocument();
    tap("No preference");
    tap("No preference");
    generate();
    const { preferences } = onComplete.mock.calls[0][0];
    expect(preferences.groupType.noPreference).toBe(true);
    expect(preferences.travelers.noPreference).toBe(true);
    expect(preferences.pets).toBe(false);
  });

  test("tapping an earlier answer asks it again", () => {
    const onComplete = setup();
    startTrip(/Quick plan/);
    tap("No, that's all");
    tap("Not yet");
    tap("Not booked yet");
    pickStyle("Flexible", "Balanced");
    fireEvent.click(screen.getByRole("button", { name: "Change answer: Flexible · Balanced" }));
    pickStyle("Night owl", "Adventure");
    generate();
    expect(onComplete.mock.calls[0][0].travelStyle).toBe("night_owl");
  });

  test("interests cycle through some, a lot and must, and profile needs are mentioned", () => {
    const onComplete = setup(oldDraft());
    editCard("Interests & food");
    const food = () => screen.getByRole("button", { name: /^Food & drink/ });
    fireEvent.click(food());
    fireEvent.click(food());
    expect(food()).toHaveAccessibleName("Food & drink: A lot");
    tap("Done");
    tap("Skip these"); // sights, must-dos, avoid
    // Dining style, adventurousness and food tours are one card
    expect(screen.getByText(/dietary needs from your profile in mind \(Vegan\)/)).toBeInTheDocument();
    tap("Street food");
    tap("Try everything");
    tap("Yes");
    tap("Done");
    generate();
    const { preferences } = onComplete.mock.calls[0][0];
    expect(preferences.interests).toEqual({ value: { food: 2 }, noPreference: false });
    expect(preferences.diningStyle).toEqual({ value: "street", noPreference: false });
    expect(preferences.foodAdventure).toEqual({ value: 5, noPreference: false });
    expect(preferences.foodExperiences).toBe(true);
    expect(preferences.mustDo.noPreference).toBe(true);
  });
});
