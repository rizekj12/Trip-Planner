// Re-encrypts travel document numbers saved with an older key, after adding a new key to
// DOCUMENT_ENCRYPTION_KEYS (see server/documentCrypto.js). Run once, with every key
// (old and new) still in the env, then the old key can be removed:
//   node --env-file=.env server/scripts/reencryptDocuments.js
// Prints counts only, never numbers.
import { createClient } from "@supabase/supabase-js";
import { createDocumentCrypto } from "../documentCrypto.js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const crypt = createDocumentCrypto(process.env.DOCUMENT_ENCRYPTION_KEYS);
if (!crypt.ready) throw new Error("DOCUMENT_ENCRYPTION_KEYS is not set");

const { data: rows, error } = await admin
  .from("travel_documents")
  .select("id, user_id, number_encrypted")
  .not("number_encrypted", "is", null);
if (error) throw error;

let updated = 0;
let failed = 0;
for (const row of rows.filter((r) => crypt.isStale(r.number_encrypted))) {
  try {
    const number = crypt.decrypt(row.number_encrypted, row.user_id);
    const { error: saveError } = await admin
      .from("travel_documents")
      .update({ number_encrypted: crypt.encrypt(number, row.user_id) })
      .eq("id", row.id);
    if (saveError) throw saveError;
    updated++;
  } catch {
    failed++;
  }
}
console.log(`Re-encrypted ${updated} of ${rows.length} document numbers${failed ? `; ${failed} failed (is its old key still in the env?)` : ""}.`);
