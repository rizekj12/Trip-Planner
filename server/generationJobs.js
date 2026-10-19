// Durable itinerary generation (issue #29). Each generation is a row in generation_jobs
// (supabase/migrations). While this process works on it, it refreshes the row's
// heartbeat; if the server restarts or redeploys mid-generation the heartbeat goes stale, and
// the sweeper (on startup and every minute, on whichever server is running) retries the job
// once, then marks the trip failed in the database and gives back the daily generation slot.
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { generateItinerary, withHotels } from "./itinerary.js";
import { foodSpotsForTrip } from "./foodSpots.js";
import { homebasesForTrip } from "./geoapify.js";
import { updateTrip, saveFoodSpots } from "./tripData.js";
import { travelerNeeds } from "./travelerProfile.js";
import { eventsForTrip } from "./events.js";
import { logger } from "./logger.js";
import { UserFacingError, publicMessage } from "./errors.js";

const MAX_ATTEMPTS = 2; // the first run plus one automatic retry after a restart
export const GENERATION_TIMEOUT_MS = 10 * 60 * 1000; // per attempt, for all the Claude calls together
const HEARTBEAT_MS = 30 * 1000;
const STALE_AFTER_MS = 2 * 60 * 1000; // no heartbeat for this long: the worker is gone
const SWEEP_EVERY_MS = 60 * 1000;
// Trips the browser marked pending whose generation never started (e.g. the request was lost)
const UNSTARTED_AFTER_MS = 15 * 60 * 1000;

const TIMEOUT_MESSAGE = "Generating this itinerary took too long. Please try again.";
const LOST_MESSAGE = "The server restarted while generating this itinerary. Please try again.";

export function createGenerationJobs({ supabaseUrl, serviceKey, anthropicKey, geoapifyKey, ticketmasterKey, guards, notifier }) {
  const admin = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  // Identifies this server process, so a job's heartbeat is only refreshed by its own worker
  const workerId = crypto.randomUUID();
  const now = () => new Date().toISOString();

  // Records a new generation (or a user's retry of a failed one) and starts it in the
  // background. Throws if the job couldn't be recorded, before anything is spent.
  async function start({ tripId, userId, reservationId }) {
    if (!admin) throw new Error("Generation jobs aren't set up on the server (SUPABASE_SERVICE_ROLE_KEY missing)");
    const { error } = await admin.from("generation_jobs").upsert({
      trip_id: String(tripId),
      user_id: userId,
      status: "running",
      attempts: 1,
      worker: workerId,
      started_at: now(),
      heartbeat_at: now(),
      last_error: null,
      reservation_id: reservationId ?? null,
      updated_at: now(),
    });
    if (error) {
      logger.error({ err: error, tripId }, "Couldn't record generation job");
      throw new Error("Couldn't start generation (apply supabase/migrations)");
    }
    run({ trip_id: String(tripId), user_id: userId, reservation_id: reservationId });
  }

  // True if another healthy worker is already generating this trip
  async function isRunning(tripId) {
    if (!admin) return false;
    const { data } = await admin
      .from("generation_jobs")
      .select("status, heartbeat_at")
      .eq("trip_id", String(tripId))
      .maybeSingle();
    return data?.status === "running" && Date.now() - Date.parse(data.heartbeat_at) < STALE_AFTER_MS;
  }

  // Does the work for a job this process owns. Never throws.
  async function run(job) {
    const tripId = job.trip_id;
    const heartbeat = setInterval(() => {
      admin
        .from("generation_jobs")
        .update({ heartbeat_at: now() })
        .eq("trip_id", tripId)
        .eq("worker", workerId)
        .then(({ error }) => error && logger.warn({ err: error, tripId }, "Heartbeat failed"));
    }, HEARTBEAT_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    // Where the trip goes, for notifications: { destination, cities } (the app names a trip in
    // the reader's own country after its cities, shared/tripName.js)
    let place = {};
    try {
      const { data: trip, error } = await admin
        .from("trips")
        .select("destination, cities, itinerary_data")
        .eq("id", tripId)
        .maybeSingle();
      if (error) throw new Error(`Couldn't read trip: ${error.message}`);
      if (!trip) return finish(job, "done"); // deleted while waiting; nothing to do
      place = { destination: trip.destination, cities: trip.cities || [] };
      const formData = trip.itinerary_data?._form_data;
      if (!formData) throw new UserFacingError("This trip has no questionnaire answers to generate from.");

      // Food spots and homebase locations are prepared alongside the itinerary, so the
      // Food Spots tab (list, distances, map) is ready when the trip is
      const signal = controller.signal;
      // The organizer's accessibility and dietary needs (profile page), if they set any
      const traveler = await travelerNeeds(admin, job.user_id);
      // Local events come from Ticketmaster, not the model (server/events.js, issue #36)
      const [itinerary, foodSpots, homebases, localEvents] = await Promise.all([
        generateItinerary(formData, anthropicKey, { signal, traveler, geoapifyKey, tripId }),
        foodSpotsForTrip(formData, { anthropicKey, geoapifyKey, signal, traveler }),
        homebasesForTrip(formData, geoapifyKey),
        eventsForTrip(formData, { ticketmasterKey, geoapifyKey, anthropicKey, signal }),
      ]);
      // Each day's hotel pin comes from the traveler's own hotel or address, not the model
      withHotels(itinerary, formData, homebases);

      // Food spots first, so they're there the moment the trip shows as ready
      const cities = new Set([...Object.keys(foodSpots || {}), ...Object.keys(homebases || {})]);
      for (const city of cities) {
        await saveFoodSpots(admin, tripId, city, { spots: foodSpots?.[city], homebase: homebases?.[city] });
      }
      await updateTrip(admin, tripId, {
        columns: { status: "ready", error: null },
        patch: {
          ...itinerary,
          events: localEvents.events,
          _events_source: localEvents.source,
          _events_checked_at: localEvents.checkedAt,
        },
      });
      await finish(job, "done");
      await notifier?.notify(job.user_id, "itinerary_ready", { tripId, data: place });
    } catch (err) {
      // Only messages written for the traveler reach the app; everything else stays in the log
      const message = controller.signal.aborted ? TIMEOUT_MESSAGE : publicMessage(err, "Generation failed. Please try again.");
      logger.error({ err, tripId }, "Itinerary generation failed");
      await fail(job, message, place);
    } finally {
      clearInterval(heartbeat);
      clearTimeout(timer);
    }
  }

  async function finish(job, status, lastError = null) {
    const { error } = await admin
      .from("generation_jobs")
      .update({ status, last_error: lastError, updated_at: now() })
      .eq("trip_id", job.trip_id);
    if (error) logger.error({ err: error, tripId: job.trip_id }, "Couldn't update generation job");
  }

  // Marks the trip and its job failed, gives back the user's generation slot so the failure
  // doesn't count against the daily cap, and lets them know. Never throws.
  async function fail(job, message, place = {}) {
    await guards.releaseGeneration(job.reservation_id).catch((err) =>
      logger.error({ err, tripId: job.trip_id }, "Couldn't release generation")
    );
    await updateTrip(admin, job.trip_id, { columns: { status: "failed", error: message } }).catch((err) =>
      logger.error({ err, tripId: job.trip_id }, "Couldn't mark trip as failed")
    );
    await finish(job, "failed", message);
    await notifier?.notify(job.user_id, "itinerary_failed", { tripId: job.trip_id, data: place });
  }

  // Finds jobs whose worker stopped (server restarted mid-generation): retries each once,
  // then marks it failed. Also fails trips left pending whose generation never started.
  async function sweep() {
    if (!admin) return;
    const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString();
    const { data: stale, error } = await admin
      .from("generation_jobs")
      .select("trip_id, user_id, attempts, heartbeat_at, reservation_id")
      .eq("status", "running")
      .lt("heartbeat_at", staleBefore);
    if (error) return logger.error({ err: error }, "Generation sweep failed");

    for (const job of stale) {
      // Claim it; matching the old heartbeat means only one server wins if several sweep at once
      const retry = job.attempts < MAX_ATTEMPTS;
      const { data: claimed } = await admin
        .from("generation_jobs")
        .update(
          retry
            ? { worker: workerId, attempts: job.attempts + 1, started_at: now(), heartbeat_at: now(), updated_at: now() }
            : { worker: workerId, heartbeat_at: now(), updated_at: now() }
        )
        .eq("trip_id", job.trip_id)
        .eq("status", "running")
        .eq("heartbeat_at", job.heartbeat_at)
        .select("trip_id");
      if (!claimed?.length) continue;

      const { data: trip } = await admin
        .from("trips")
        .select("destination, cities, status")
        .eq("id", job.trip_id)
        .maybeSingle();
      if (!trip || trip.status !== "pending") {
        await finish(job, "done"); // deleted, or already settled some other way
        continue;
      }
      if (retry) {
        logger.info({ tripId: job.trip_id, attempt: job.attempts + 1 }, "Retrying generation");
        run(job);
      } else {
        logger.warn({ tripId: job.trip_id }, "Giving up on generation");
        await fail(job, LOST_MESSAGE, { destination: trip.destination, cities: trip.cities || [] });
      }
    }

    await failUnstartedTrips();
  }

  // The browser marks a trip pending and then asks the server to generate it; if that
  // request never arrived (or was rejected), nothing would ever finish the trip
  async function failUnstartedTrips() {
    const { data: pending, error } = await admin
      .from("trips")
      .select("id, started_at")
      .eq("status", "pending");
    if (error) return logger.error({ err: error }, "Pending trip sweep failed");

    const old = pending.filter((t) => {
      const started = Date.parse(t.started_at);
      return !started || Date.now() - started > UNSTARTED_AFTER_MS;
    });
    if (!old.length) return;
    const { data: jobs = [] } = await admin
      .from("generation_jobs")
      .select("trip_id, status")
      .in("trip_id", old.map((t) => String(t.id)));
    const running = new Set(jobs.filter((j) => j.status === "running").map((j) => j.trip_id));

    for (const trip of old) {
      if (running.has(String(trip.id))) continue;
      await updateTrip(admin, trip.id, {
        columns: { status: "failed", error: "Generation didn't start. Please try again." },
      }).catch((err) => logger.error({ err, tripId: trip.id }, "Couldn't mark trip as failed"));
    }
  }

  // Sweep now (picking up anything a previous server left behind) and then every minute
  function startSweeper() {
    if (!admin) return;
    const safeSweep = () => sweep().catch((err) => logger.error({ err }, "Generation sweep failed"));
    safeSweep();
    setInterval(safeSweep, SWEEP_EVERY_MS).unref();
  }

  return { start, isRunning, startSweeper };
}
