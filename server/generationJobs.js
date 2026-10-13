// Durable itinerary generation (issue #29). Each generation is a row in generation_jobs
// (supabase/generation-jobs.sql). While this process works on it, it refreshes the row's
// heartbeat; if the server restarts or redeploys mid-generation the heartbeat goes stale, and
// the sweeper (on startup and every minute, on whichever server is running) retries the job
// once, then marks the trip failed in the database and gives back the daily generation slot.
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { generateItinerary } from "./itinerary.js";
import { foodSpotsForTrip } from "./foodSpots.js";
import { homebasesForTrip } from "./geoapify.js";
import { patchItineraryData } from "./tripData.js";

const MAX_ATTEMPTS = 2; // the first run plus one automatic retry after a restart
export const GENERATION_TIMEOUT_MS = 10 * 60 * 1000; // per attempt, for all the Claude calls together
const HEARTBEAT_MS = 30 * 1000;
const STALE_AFTER_MS = 2 * 60 * 1000; // no heartbeat for this long: the worker is gone
const SWEEP_EVERY_MS = 60 * 1000;
// Trips the browser marked pending whose generation never started (e.g. the request was lost)
const UNSTARTED_AFTER_MS = 15 * 60 * 1000;

const TIMEOUT_MESSAGE = "Generating this itinerary took too long. Please try again.";
const LOST_MESSAGE = "The server restarted while generating this itinerary. Please try again.";

export function createGenerationJobs({ supabaseUrl, serviceKey, anthropicKey, geoapifyKey, guards, notifier }) {
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
      console.error("Couldn't record generation job:", error);
      throw new Error("Couldn't start generation (run supabase/generation-jobs.sql)");
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
        .then(({ error }) => error && console.error("Heartbeat failed for trip", tripId, error.message));
    }, HEARTBEAT_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    let destination = null;
    try {
      const { data: trip, error } = await admin
        .from("trips")
        .select("destination, itinerary_data")
        .eq("id", tripId)
        .maybeSingle();
      if (error) throw new Error(`Couldn't read trip: ${error.message}`);
      if (!trip) return finish(job, "done"); // deleted while waiting; nothing to do
      destination = trip.destination;
      const formData = trip.itinerary_data?._form_data;
      if (!formData) throw new Error("This trip has no questionnaire answers to generate from.");

      // Food spots and homebase locations are prepared alongside the itinerary, so the
      // Food Spots tab (list, distances, map) is ready when the trip is
      const signal = controller.signal;
      const [itinerary, foodSpots, homebases] = await Promise.all([
        generateItinerary(formData, anthropicKey, { signal }),
        foodSpotsForTrip(formData, { anthropicKey, geoapifyKey, signal }),
        homebasesForTrip(formData, geoapifyKey),
      ]);
      await patchItineraryData(admin, tripId, {
        ...itinerary,
        _status: "ready",
        _error: null,
        _food_spots: foodSpots,
        _homebases: homebases,
      });
      await finish(job, "done");
      await notifier?.notify(job.user_id, "itinerary_ready", { tripId, data: { destination } });
    } catch (err) {
      const message = controller.signal.aborted ? TIMEOUT_MESSAGE : err.message || "Generation failed";
      console.error("Itinerary generation failed for trip", tripId, err);
      await fail(job, message, destination);
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
    if (error) console.error("Couldn't update generation job", job.trip_id, error.message);
  }

  // Marks the trip and its job failed, gives back the user's generation slot so the failure
  // doesn't count against the daily cap, and lets them know. Never throws.
  async function fail(job, message, destination) {
    await guards.releaseGeneration(job.reservation_id).catch((err) =>
      console.error("Couldn't release generation for trip", job.trip_id, err)
    );
    await patchItineraryData(admin, job.trip_id, { _status: "failed", _error: message }).catch((err) =>
      console.error("Couldn't mark trip as failed:", job.trip_id, err.message)
    );
    await finish(job, "failed", message);
    await notifier?.notify(job.user_id, "itinerary_failed", { tripId: job.trip_id, data: { destination } });
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
    if (error) return console.error("Generation sweep failed:", error.message);

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
        .select("destination, itinerary_data")
        .eq("id", job.trip_id)
        .maybeSingle();
      if (!trip || trip.itinerary_data?._status !== "pending") {
        await finish(job, "done"); // deleted, or already settled some other way
        continue;
      }
      if (retry) {
        console.log(`Retrying generation for trip ${job.trip_id} (attempt ${job.attempts + 1})`);
        run(job);
      } else {
        console.log(`Giving up on generation for trip ${job.trip_id}`);
        await fail(job, LOST_MESSAGE, trip.destination);
      }
    }

    await failUnstartedTrips();
  }

  // The browser marks a trip pending and then asks the server to generate it; if that
  // request never arrived (or was rejected), nothing would ever finish the trip
  async function failUnstartedTrips() {
    const { data: pending, error } = await admin
      .from("trips")
      .select("id, itinerary_data")
      .eq("itinerary_data->>_status", "pending");
    if (error) return console.error("Pending trip sweep failed:", error.message);

    const old = pending.filter((t) => {
      const started = Date.parse(t.itinerary_data?._started_at);
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
      await patchItineraryData(admin, trip.id, {
        _status: "failed",
        _error: "Generation didn't start. Please try again.",
      }).catch((err) => console.error("Couldn't mark trip as failed:", trip.id, err.message));
    }
  }

  // Sweep now (picking up anything a previous server left behind) and then every minute
  function startSweeper() {
    if (!admin) return;
    const safeSweep = () => sweep().catch((err) => console.error("Generation sweep failed:", err));
    safeSweep();
    setInterval(safeSweep, SWEEP_EVERY_MS).unref();
  }

  return { start, isRunning, startSweeper };
}
