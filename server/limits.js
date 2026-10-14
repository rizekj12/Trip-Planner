// Sign-in checks, rate limits and the daily itinerary cap for the API (issue #27)
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger.js";

export const DAILY_GENERATIONS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

// Checked tokens are remembered briefly so verifying one on every request doesn't call
// Supabase every time
const TOKEN_CACHE_MS = 60 * 1000;
const TOKEN_CACHE_MAX = 1000;

export function createGuards({ supabaseUrl, anonKey, serviceKey }) {
  const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  const auth = supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey, clientOptions) : null;
  const admin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, clientOptions) : null;

  const tokenCache = new Map();
  async function userForToken(token) {
    const cached = tokenCache.get(token);
    if (cached && cached.expires > Date.now()) return cached.user;
    const { data } = await auth.auth.getUser(token);
    const user = data?.user || null;
    if (tokenCache.size >= TOKEN_CACHE_MAX) tokenCache.delete(tokenCache.keys().next().value);
    tokenCache.set(token, { user, expires: Date.now() + TOKEN_CACHE_MS });
    return user;
  }

  // Sets req.user from the Bearer token (null when signed out or the token is invalid).
  // Never rejects on its own; requireUser does that for routes that need an account.
  async function identify(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    req.user = token && auth ? await userForToken(token).catch(() => null) : null;
    next();
  }

  function requireUser(req, res, next) {
    if (req.user) return next();
    res.status(401).json({ error: "Please sign in" });
  }

  // Counted per account when signed in, per IP address otherwise
  const keyFor = (req) => (req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`);
  const limiter = (windowMs, limit, error) =>
    rateLimit({
      windowMs,
      limit,
      keyGenerator: keyFor,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (req, res) => res.status(429).json({ error }),
    });

  const limits = {
    // Every /api route
    api: limiter(60 * 1000, 120, "Too many requests. Please wait a minute and try again."),
    // Routes that call Claude (generate, food spots, PDF)
    ai: limiter(15 * 60 * 1000, 20, "Too many requests. Please wait a few minutes and try again."),
    // Hotel search and address checks (Geoapify's free quota)
    geo: limiter(60 * 1000, 30, "Too many hotel or address lookups. Please wait a minute and try again."),
    // Invite and guest links, which work without signing in
    public: limiter(60 * 1000, 30, "Too many requests. Please wait a minute and try again."),
    // Joining or asking to join a trip by invite link
    join: limiter(60 * 60 * 1000, 10, "Too many join requests. Please try again later."),
  };

  // Uses up one of the user's itinerary generations for the next 24 hours (rolling).
  // Returns { id } to release if generation fails, or { status, error } when not allowed.
  async function reserveGeneration(userId, tripId) {
    if (!admin) {
      return { status: 500, error: "Generation limits aren't set up on the server (SUPABASE_SERVICE_ROLE_KEY missing)" };
    }
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const { data: recent, error } = await admin
      .from("trip_generations")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at");
    if (error) {
      logger.error({ err: error }, "Couldn't read generation log");
      return { status: 500, error: "Generation limits aren't set up on the server (run supabase/generation-limits.sql)" };
    }

    if (recent.length >= DAILY_GENERATIONS) {
      const freesAt = new Date(recent[0].created_at).getTime() + DAY_MS;
      const hours = Math.max(1, Math.ceil((freesAt - Date.now()) / (60 * 60 * 1000)));
      return {
        status: 429,
        error: `You've reached the limit of ${DAILY_GENERATIONS} itineraries per day. You can create another in about ${hours} hour${hours === 1 ? "" : "s"}.`,
      };
    }

    const { data: row, error: insertError } = await admin
      .from("trip_generations")
      .insert({ user_id: userId, trip_id: String(tripId) })
      .select("id")
      .single();
    if (insertError) {
      logger.error({ err: insertError }, "Couldn't record generation");
      return { status: 500, error: "Couldn't start generation. Please try again." };
    }
    return { id: row.id };
  }

  // Gives a generation back, e.g. when Claude failed, so it doesn't count against the cap
  async function releaseGeneration(id) {
    if (admin && id) await admin.from("trip_generations").delete().eq("id", id);
  }

  return { identify, requireUser, limits, reserveGeneration, releaseGeneration };
}
