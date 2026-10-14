// Server logging. One JSON line per entry in production (Railway's log viewer can search
// and filter by level); readable, colored lines in development.
//
//   import { logger } from "./logger.js";
//   logger.info({ tripId }, "Generation started");
//   logger.error({ err, tripId }, "Generation failed");   // pass errors as `err` to get the stack
//
// LOG_LEVEL overrides the level (trace, debug, info, warn, error, fatal, silent).
// Never log form data, reservations, confirmation codes or travel document numbers.
import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test" || !!process.env.VITEST;

export const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? "silent" : isProduction ? "info" : "debug"),
  // Safety net in case an object with secrets or private trip details is ever logged
  redact: {
    paths: [
      "apiKey", "*.apiKey", "token", "*.token", "guestToken", "*.guestToken",
      "headers.authorization", "*.headers.authorization",
      "reservations", "*.reservations", "_form_data", "*._form_data",
      "confirmationCode", "*.confirmationCode", "number", "*.number",
    ],
    censor: "[redacted]",
  },
  ...(!isProduction && !isTest && {
    transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
  }),
});
