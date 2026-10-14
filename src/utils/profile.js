// The signed-in user's profile details, travel documents and saved travelers
// (supabase/profiles.sql). Row-level security limits every query to the user's own rows.
// Travel documents go through the server instead, which encrypts their numbers (issue #56).
import { supabase } from "./supabase";
import { apiJson } from "./api";

// ---- Profile details ----

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data || { id: userId };
}

// Saves only the given fields; creates the row the first time
export async function saveProfile(userId, changes) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...changes, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export { ACCESSIBILITY_OPTIONS } from "../../shared/accessibility.js";

export const GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

export const BIO_MAX = 280;

// ---- Travel documents ----

export const DOCUMENT_KINDS = {
  passport: { label: "Passport", labelField: "Issuing country", numberField: "Passport number" },
  known_traveler: { label: "TSA PreCheck / Known Traveler", labelField: "Program", numberField: "Known Traveler Number" },
  drivers_license: { label: "Driver's license", labelField: "Issued by", numberField: "License number" },
  visa: { label: "Visa", labelField: "Country", numberField: "Visa number" },
  insurance: { label: "Travel insurance", labelField: "Insurer", numberField: "Policy number" },
  frequent_flyer: { label: "Frequent flyer", labelField: "Airline or alliance", numberField: "Member number" },
  vaccination: { label: "Vaccination record", labelField: "Vaccine", numberField: "Certificate number" },
  other: { label: "Other document", labelField: "Name", numberField: "Number" },
};

// The user's documents: { id, kind, label, hasNumber, last4, expires_on, notes, ... }.
// Never includes full numbers; see revealDocumentNumber.
export const fetchDocuments = () => apiJson("GET", "/api/documents", null, { auth: true });

// Creates a document, or updates it when `id` is given. For `number`: leave it out to keep
// the saved one, "" to remove it, or a new number to replace it.
export const saveDocument = ({ id, ...fields }) =>
  id
    ? apiJson("PUT", `/api/documents/${id}`, fields, { auth: true })
    : apiJson("POST", "/api/documents", fields, { auth: true });

export const deleteDocument = (id) => apiJson("DELETE", `/api/documents/${id}`, null, { auth: true });

// The full number of one document (decrypted by the server), for "Show"
export const revealDocumentNumber = async (id) =>
  (await apiJson("GET", `/api/documents/${id}/number`, null, { auth: true })).number;

// "•••• 4821" (or "" with no number) from a document's last 4 characters
export const maskNumber = (last4) => (last4 ? `•••• ${last4}` : "");

// How a document's expiry looks: { text, tone: "ok" | "warn" | "bad" | "none" }.
// Passports warn 6 months out, since many countries require that much validity left.
export function expiryStatus(doc, today = new Date()) {
  if (!doc.expires_on) return { text: "No expiry", tone: "none" };
  const expires = new Date(`${doc.expires_on}T00:00:00`);
  const months = (expires.getFullYear() - today.getFullYear()) * 12 + (expires.getMonth() - today.getMonth());
  if (expires < today) return { text: "Expired", tone: "bad" };
  const warnMonths = doc.kind === "passport" ? 6 : 1;
  if (months < warnMonths) {
    return { text: months < 1 ? "Expires this month" : `Expires in ${months} month${months === 1 ? "" : "s"}`, tone: "warn" };
  }
  return { text: "Valid", tone: "ok" };
}

// ---- Saved travelers ----

export const RELATION_OPTIONS = ["Partner", "Family", "Friend", "Coworker", "Other"];

export async function fetchSavedTravelers() {
  const { data, error } = await supabase.from("saved_travelers").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function saveTraveler(ownerId, { id, ...fields }) {
  const row = { ...fields, email: fields.email?.trim().toLowerCase() || null, owner_id: ownerId };
  const query = id
    ? supabase.from("saved_travelers").update(row).eq("id", id)
    : supabase.from("saved_travelers").insert(row);
  const { data, error } = await query.select().single();
  if (error) {
    if (error.code === "23505") throw new Error("You've already saved someone with that email.");
    throw error;
  }
  return data;
}

export async function deleteTraveler(id) {
  const { error } = await supabase.from("saved_travelers").delete().eq("id", id);
  if (error) throw error;
}
