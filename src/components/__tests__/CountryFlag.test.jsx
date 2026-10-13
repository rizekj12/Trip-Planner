// @vitest-environment jsdom
// Example React component test: copy this pattern for new component tests.
import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import CountryFlag from "../CountryFlag";

describe("CountryFlag", () => {
  test("shows a flag emoji for a known country", () => {
    const { container } = render(<CountryFlag name="Japan" />);
    expect(container.textContent).toBe("🇯🇵");
  });

  test("falls back to a map pin icon for an unknown destination", () => {
    const { container } = render(<CountryFlag name="Atlantis" />);
    expect(container.textContent).toBe("");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
