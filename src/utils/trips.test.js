// Trip status (issue #34): drives the dashboard badges, polling, and the Retry button.
import { describe, test, expect, vi, afterEach } from "vitest";
import { tripStatus } from "./trips";

const trip = (itinerary_data) => ({ itinerary_data });
const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();

afterEach(() => vi.useRealTimers());

describe("tripStatus", () => {
  test("drafts", () => {
    expect(tripStatus(trip({ _draft: true, _status: "pending" }))).toBe("draft");
  });

  test("failed", () => {
    expect(tripStatus(trip({ _status: "failed", _error: "x" }))).toBe("failed");
  });

  test("a recent pending trip is still pending", () => {
    expect(tripStatus(trip({ _status: "pending", _started_at: minutesAgo(2) }))).toBe("pending");
  });

  test("a pending trip that has been stuck too long counts as failed", () => {
    expect(tripStatus(trip({ _status: "pending", _started_at: minutesAgo(60 * 24) }))).toBe("failed");
  });

  test("ready, including rows saved before statuses existed", () => {
    expect(tripStatus(trip({ _status: "ready", days: [] }))).toBe("ready");
    expect(tripStatus(trip({ days: [] }))).toBe("ready");
    expect(tripStatus({})).toBe("ready");
    expect(tripStatus(undefined)).toBe("ready");
  });
});
