// Token usage and estimated cost per trip (issue #47)
import { test, expect } from "vitest";
import { createUsageTracker } from "./usage.js";

test("adds up calls per model and estimates the cost", () => {
  const usage = createUsageTracker();
  usage.add("claude-sonnet-5", { input_tokens: 2000, output_tokens: 3000 });
  usage.add("claude-sonnet-5", { input_tokens: 250, output_tokens: 1500, cache_read_input_tokens: 10 });
  usage.add("claude-haiku-5-5", { input_tokens: 1000, output_tokens: 1000 });
  usage.add("claude-sonnet-5", undefined); // a call that never returned
  const s = usage.summary();
  expect(s).toMatchObject({ calls: 3, input_tokens: 3250, output_tokens: 5500, cache_read_input_tokens: 10 });
  // Sonnet 5: 2,250 in × $2/M + 4,500 out × $10/M = $0.0495; Haiku 5.5: 1,000 × $0.1/M + 1,000 × $0.5/M = $0.0006
  expect(s.estimated_usd).toBe(0.0501);
  expect(s.by_model["claude-sonnet-5"].calls).toBe(2);
});

test("an unknown model counts tokens but not dollars", () => {
  const usage = createUsageTracker();
  usage.add("some-future-model", { input_tokens: 10, output_tokens: 10 });
  expect(usage.summary()).toMatchObject({ calls: 1, estimated_usd: 0 });
});
