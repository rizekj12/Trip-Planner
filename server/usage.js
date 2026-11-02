// Token usage and estimated cost of the Claude calls behind a trip (issue #47). Output tokens
// (including thinking) are most of the bill; every call reports its usage here so the cost of
// a trip can be logged and saved with its generation job.

// US$ per million tokens: [input, output]. An estimate for logs and reports, not billing.
// https://platform.claude.com/docs/en/about-claude/pricing
export const PRICES = {
  "claude-sonnet-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

// Collects usage across calls: tracker.add(model, message.usage) after each one, then
// tracker.summary() → { calls, input_tokens, output_tokens, cache_read_input_tokens,
// estimated_usd, by_model }
export function createUsageTracker() {
  const byModel = {};
  return {
    add(model, usage) {
      if (!usage) return;
      const m = (byModel[model] ||= { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 });
      m.calls += 1;
      m.input_tokens += usage.input_tokens || 0;
      m.output_tokens += usage.output_tokens || 0;
      m.cache_read_input_tokens += usage.cache_read_input_tokens || 0;
    },
    summary() {
      const total = { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, estimated_usd: 0 };
      for (const [model, m] of Object.entries(byModel)) {
        for (const k of ["calls", "input_tokens", "output_tokens", "cache_read_input_tokens"]) total[k] += m[k];
        const [inPrice, outPrice] = PRICES[model] || [0, 0];
        total.estimated_usd += (m.input_tokens * inPrice + m.output_tokens * outPrice) / 1e6;
      }
      total.estimated_usd = Math.round(total.estimated_usd * 10000) / 10000;
      return { ...total, by_model: byModel };
    },
  };
}
