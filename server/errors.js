// Errors whose message is written for the traveler and is safe to show in the app, e.g.
// "The itinerary was too long and got cut off." Anything else (database, network or SDK
// errors) may contain internal details, so clients get a generic message instead and the
// real error goes to the server log.
export class UserFacingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "UserFacingError";
  }
}

// The message to send to a client for `err`: its own message if it's a UserFacingError,
// otherwise `fallback`
export function publicMessage(err, fallback = "Something went wrong. Please try again.") {
  return err instanceof UserFacingError ? err.message : fallback;
}
