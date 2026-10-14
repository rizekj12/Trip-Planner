// Travel documents (profile page): passport, Known Traveler Number, insurance and so on.
// Private to their owner. Since issue #56 the browser can't touch travel_documents directly
// (RLS with no policies, see supabase/encrypt-travel-documents.sql); everything goes through
// these routes, which encrypt document numbers before they're stored (server/documentCrypto.js).
//
// The list only ever carries the last 4 characters of a number. The full number is decrypted
// for its owner on request ("Show"), one document at a time, and never cached.
//
// Routes (signed in; each person only ever sees their own documents)
//   GET    /api/documents              list, numbers masked
//   POST   /api/documents              add
//   PUT    /api/documents/:id          change (omit `number` to keep it, null or "" to clear it)
//   DELETE /api/documents/:id
//   GET    /api/documents/:id/number   { number }, the full number
import { createClient } from "@supabase/supabase-js";
import { createDocumentCrypto } from "./documentCrypto.js";
import { logger } from "./logger.js";

export const DOCUMENT_KINDS = [
  "passport", "known_traveler", "drivers_license", "visa", "insurance", "frequent_flyer", "vaccination", "other",
];
export const MAX_DOCUMENTS = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNS = "id, user_id, kind, label, number_encrypted, number_last4, expires_on, notes, created_at, updated_at";

// "AB-12 3456" -> "3456": the last 4 letters or digits, shown masked as "•••• 3456"
export const lastFour = (number) => String(number).replace(/[^\p{L}\p{N}]/gu, "").slice(-4);

// What the browser gets for a stored row: never the ciphertext, never the full number
export const toDocument = (row) => ({
  id: row.id,
  kind: row.kind,
  label: row.label,
  hasNumber: !!row.number_encrypted,
  last4: row.number_encrypted ? row.number_last4 : null,
  expires_on: row.expires_on,
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// Checks and trims the editable fields sent by the browser: { fields } or { error }.
// `number` is left out of `fields` (it's encrypted separately): undefined = unchanged,
// null = remove, string = new number.
export function cleanDocument(body, { partial = false } = {}) {
  if (!body || typeof body !== "object") return { error: "Missing document details" };
  const fields = {};
  const text = (key, max) => {
    if (body[key] === undefined) return null;
    if (body[key] !== null && typeof body[key] !== "string") return `Invalid ${key}`;
    const value = (body[key] || "").trim();
    if (value.length > max) return `${key} is too long`;
    fields[key] = value || null;
    return null;
  };

  if (body.kind !== undefined || !partial) {
    if (!DOCUMENT_KINDS.includes(body.kind)) return { error: "Unknown document type" };
    fields.kind = body.kind;
  }
  const error = text("label", 100) || text("notes", 500);
  if (error) return { error };
  if (body.expires_on !== undefined) {
    if (body.expires_on !== null && body.expires_on !== "" && !DATE_RE.test(body.expires_on)) return { error: "Invalid expiry date" };
    fields.expires_on = body.expires_on || null;
  }

  let number;
  if (body.number !== undefined) {
    if (body.number !== null && typeof body.number !== "string") return { error: "Invalid number" };
    number = (body.number || "").trim() || null;
    if (number && number.length > 100) return { error: "That number is too long" };
  }
  return { fields, number };
}

export function registerTravelDocumentRoutes(app, { supabaseUrl, serviceKey, encryptionKeys }) {
  const admin = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  let crypt;
  try {
    crypt = createDocumentCrypto(encryptionKeys);
  } catch (err) {
    // A malformed key shouldn't take the whole site down; numbers just can't be saved or shown
    logger.error({ err: err.message }, "DOCUMENT_ENCRYPTION_KEYS is invalid; travel document numbers are disabled");
    crypt = createDocumentCrypto("");
  }
  if (!crypt.ready) logger.warn("DOCUMENT_ENCRYPTION_KEYS not set; travel document numbers can't be saved or shown");

  const NOT_CONFIGURED = "Document numbers can't be saved or shown right now (encryption isn't set up on the server).";

  // The signed-in user, or sends 401/500 and returns null
  async function owner(req, res) {
    if (!admin) {
      res.status(500).json({ error: "Travel documents aren't set up on the server (SUPABASE_SERVICE_ROLE_KEY missing)" });
      return null;
    }
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const { data } = token ? await admin.auth.getUser(token) : { data: null };
    if (!data?.user) {
      res.status(401).json({ error: "Please sign in" });
      return null;
    }
    return data.user;
  }

  // One of the user's own documents, or sends 404 and returns null
  async function ownDocument(req, res, user) {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: "Document not found" }), null;
    const { data } = await admin
      .from("travel_documents")
      .select(COLUMNS)
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) return res.status(404).json({ error: "Document not found" }), null;
    return data;
  }

  // Columns for a new or removed number
  const numberColumns = (number, userId) =>
    number
      ? { number_encrypted: crypt.encrypt(number, userId), number_last4: lastFour(number) }
      : { number_encrypted: null, number_last4: null };

  const failed = (res, err, message) => {
    logger.error({ err }, message);
    res.status(500).json({ error: `${message}. Please try again.` });
  };

  app.get("/api/documents", async (req, res) => {
    const user = await owner(req, res);
    if (!user) return;
    const { data, error } = await admin.from("travel_documents").select(COLUMNS).eq("user_id", user.id).order("created_at");
    if (error) return failed(res, error, "Couldn't load your documents");
    res.json(data.map(toDocument));
  });

  app.post("/api/documents", async (req, res) => {
    const user = await owner(req, res);
    if (!user) return;
    const { fields, number, error } = cleanDocument(req.body);
    if (error) return res.status(400).json({ error });
    if (number && !crypt.ready) return res.status(503).json({ error: NOT_CONFIGURED });

    const { count } = await admin.from("travel_documents").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count || 0) >= MAX_DOCUMENTS) return res.status(409).json({ error: `You can save up to ${MAX_DOCUMENTS} documents.` });

    const { data, error: insertError } = await admin
      .from("travel_documents")
      .insert({ ...fields, ...numberColumns(number, user.id), user_id: user.id })
      .select(COLUMNS)
      .single();
    if (insertError) return failed(res, insertError, "Couldn't save the document");
    res.status(201).json(toDocument(data));
  });

  app.put("/api/documents/:id", async (req, res) => {
    const user = await owner(req, res);
    if (!user) return;
    const doc = await ownDocument(req, res, user);
    if (!doc) return;
    const { fields, number, error } = cleanDocument(req.body, { partial: true });
    if (error) return res.status(400).json({ error });
    if (number && !crypt.ready) return res.status(503).json({ error: NOT_CONFIGURED });

    const changes = { ...fields, ...(number !== undefined && numberColumns(number, user.id)), updated_at: new Date().toISOString() };
    const { data, error: updateError } = await admin
      .from("travel_documents")
      .update(changes)
      .eq("id", doc.id)
      .eq("user_id", user.id)
      .select(COLUMNS)
      .single();
    if (updateError) return failed(res, updateError, "Couldn't save the document");
    res.json(toDocument(data));
  });

  app.delete("/api/documents/:id", async (req, res) => {
    const user = await owner(req, res);
    if (!user) return;
    const doc = await ownDocument(req, res, user);
    if (!doc) return;
    const { error } = await admin.from("travel_documents").delete().eq("id", doc.id).eq("user_id", user.id);
    if (error) return failed(res, error, "Couldn't delete the document");
    res.json({ ok: true });
  });

  // The full number, for its owner only. Not cached by the browser or any proxy.
  app.get("/api/documents/:id/number", async (req, res) => {
    const user = await owner(req, res);
    if (!user) return;
    const doc = await ownDocument(req, res, user);
    if (!doc) return;
    res.set("Cache-Control", "no-store");
    if (!doc.number_encrypted) return res.json({ number: null });
    if (!crypt.ready) return res.status(503).json({ error: NOT_CONFIGURED });
    try {
      res.json({ number: crypt.decrypt(doc.number_encrypted, user.id) });
    } catch (err) {
      // Wrong or missing key, or a tampered value. Never log the value itself.
      logger.error({ err: err.message, documentId: doc.id }, "Couldn't decrypt a document number");
      res.status(500).json({ error: "Couldn't read this document's number." });
    }
  });

  return { crypt };
}
