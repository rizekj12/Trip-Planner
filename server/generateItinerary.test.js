// The itinerary request (issue #35): a JSON schema is sent, the reply is validated, stops are
// checked, and token usage is logged per trip. The Anthropic client is mocked.
import { test, expect, vi, beforeEach } from "vitest";
import { formData } from "./test/fixtures.js";

const sdk = vi.hoisted(() => ({ requests: [], reply: null }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: (body) => {
        sdk.requests.push(body);
        return { finalMessage: async () => sdk.reply };
      },
    };
  },
}));
const verify = vi.hoisted(() => ({ verifyStops: vi.fn(async (itinerary) => itinerary) }));
vi.mock("./verifyStops.js", () => verify);
const { logger } = await import("./logger.js");
const { generateItinerary } = await import("./itinerary.js");

const body = {
  days: [1, 2, 3, 4].map((n) => ({ city: "Tokyo", title: `Day ${n}`, stops: ["senso_ji"], notes: [] })),
  spots: [{ key: "senso_ji", title: "Senso-ji", address: "2-3-1 Asakusa", city: "Tokyo", lat: 35.71, lon: 139.79 }],
};
const usage = { input_tokens: 1200, output_tokens: 5400, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

beforeEach(() => {
  sdk.requests.length = 0;
  sdk.reply = { model: "claude-sonnet-5", stop_reason: "end_turn", usage, content: [{ type: "text", text: JSON.stringify(body) }] };
  vi.clearAllMocks();
});

test("sends the JSON schema, returns the validated itinerary and checks its stops", async () => {
  const itinerary = await generateItinerary(formData(), "anthropic-key", { geoapifyKey: "geo-key", tripId: "trip-9" });

  const [request] = sdk.requests;
  expect(request.model).toBe("claude-sonnet-5");
  expect(request.output_config.format.type).toBe("json_schema");
  expect(request.output_config.format.schema.properties.days.items.properties.city.enum).toEqual(["Tokyo"]);
  // A plain schema, so the SDK doesn't parse a cut-off reply before we check why it stopped
  expect(request.output_config.format.parse).toBeUndefined();
  expect(request.thinking).toBeUndefined();

  expect(itinerary.days).toHaveLength(4);
  expect(itinerary.spots.senso_ji.coords).toEqual([35.71, 139.79]);
  expect(verify.verifyStops).toHaveBeenCalledWith(itinerary, expect.objectContaining({ country: "Japan" }), "geo-key", { tripId: "trip-9" });
});

test("logs token usage with the trip id", async () => {
  const info = vi.spyOn(logger, "info");
  await generateItinerary(formData(), "anthropic-key", { tripId: "trip-9" });
  expect(info).toHaveBeenCalledWith(expect.objectContaining({ tripId: "trip-9", model: "claude-sonnet-5", input_tokens: 1200, output_tokens: 5400 }), "Itinerary response");
});

test("a reply cut off by max_tokens is reported as such", async () => {
  sdk.reply = { ...sdk.reply, stop_reason: "max_tokens", content: [{ type: "text", text: JSON.stringify(body).slice(0, 40) }] };
  await expect(generateItinerary(formData(), "anthropic-key")).rejects.toThrow("too long and got cut off");
});
