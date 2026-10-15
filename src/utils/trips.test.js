// Trip status (issues #34 and #31): drives the dashboard badges, polling, and the Retry button.
import { describe, test, expect, vi, afterEach } from "vitest";
import { tripStatus } from "./trips";

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();

afterEach(() => vi.useRealTimers());

describe("tripStatus", () => {
  test("drafts and failed trips", () => {
    expect(tripStatus({ status: "draft" })).toBe("draft");
    expect(tripStatus({ status: "failed", error: "x" })).toBe("failed");
  });

  test("a recent pending trip is still pending", () => {
    expect(tripStatus({ status: "pending", started_at: minutesAgo(2) })).toBe("pending");
  });

  test("a pending trip that has been stuck too long counts as failed", () => {
    expect(tripStatus({ status: "pending", started_at: minutesAgo(60 * 24) })).toBe("failed");
  });

  test("ready", () => {
    expect(tripStatus({ status: "ready" })).toBe("ready");
    expect(tripStatus({})).toBe("ready");
    expect(tripStatus(undefined)).toBe("ready");
  });
});
