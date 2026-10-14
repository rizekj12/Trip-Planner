// Encryption for travel document numbers (issue #56). Numbers are encrypted here, on the
// server, with a key that lives only in the server's environment (DOCUMENT_ENCRYPTION_KEYS),
// never in Supabase. Someone with database access, the service role key or a leaked row sees
// only ciphertext; reading a number takes both the database and this server's key.
//
// DOCUMENT_ENCRYPTION_KEYS: comma-separated "version:base64key" pairs, e.g. "1:AbC...=".
//   Each key is 32 random bytes, base64-encoded. Generate one with:
//     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//   The highest version encrypts new values; older versions are kept only to decrypt values
//   saved before a rotation (re-saving a document, or server/scripts/reencryptDocuments.js,
//   moves it to the newest key).
//   ⚠️ Losing every copy of a key makes the numbers encrypted with it unreadable for good:
//   keep a copy outside the host (e.g. a password manager). Local and Railway share one
//   database, so they must use the same keys.
//
// Stored format: "v<version>:<iv>:<auth tag>:<ciphertext>" (base64 parts). AES-256-GCM with a
// random 96-bit IV per value; the owner's user id is bound in as associated data, so a value
// copied onto another person's row won't decrypt.
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

// { current: version, keys: Map<version, Buffer> } from the env value, or throws a clear error
export function parseKeys(value) {
  const keys = new Map();
  for (const entry of String(value || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const match = /^(\d+):(.+)$/.exec(entry);
    if (!match) throw new Error('DOCUMENT_ENCRYPTION_KEYS entries must look like "1:<base64 key>"');
    const key = Buffer.from(match[2], "base64");
    if (key.length !== 32) throw new Error(`Document encryption key v${match[1]} must be 32 bytes (base64 of 32 random bytes)`);
    keys.set(Number(match[1]), key);
  }
  if (!keys.size) return null;
  return { current: Math.max(...keys.keys()), keys };
}

export function createDocumentCrypto(envValue) {
  const config = parseKeys(envValue);

  // The owner's id, as associated data: authenticated, not secret
  const aad = (userId) => Buffer.from(`travel_documents:${userId}`, "utf8");

  function encrypt(plaintext, userId) {
    if (!config) throw new Error("Document encryption isn't configured");
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, config.keys.get(config.current), iv);
    cipher.setAAD(aad(userId));
    const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
    return ["v" + config.current, iv, cipher.getAuthTag(), ciphertext]
      .map((part) => (Buffer.isBuffer(part) ? part.toString("base64") : part))
      .join(":");
  }

  // Throws if the value was tampered with, belongs to someone else, or its key is gone
  function decrypt(stored, userId) {
    if (!config) throw new Error("Document encryption isn't configured");
    const [versionTag, iv, tag, ciphertext] = String(stored).split(":");
    const key = config.keys.get(Number(versionTag?.slice(1)));
    if (!key || !iv || !tag || ciphertext === undefined) throw new Error("Unreadable document number");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
    decipher.setAAD(aad(userId));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
  }

  // Files (document attachments, issue #55): the same AES-256-GCM, on bytes. Bound to the
  // owner AND the document, so a file can't be moved to another document or person.
  // Layout: "v<version>:" then IV (12 bytes), auth tag (16 bytes), ciphertext.
  const fileAad = (userId, documentId) => Buffer.from(`travel_documents:${userId}:${documentId}:file`, "utf8");

  function encryptFile(bytes, userId, documentId) {
    if (!config) throw new Error("Document encryption isn't configured");
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, config.keys.get(config.current), iv);
    cipher.setAAD(fileAad(userId, documentId));
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    return Buffer.concat([Buffer.from(`v${config.current}:`), iv, cipher.getAuthTag(), ciphertext]);
  }

  function decryptFile(stored, userId, documentId) {
    if (!config) throw new Error("Document encryption isn't configured");
    const colon = stored.indexOf(0x3a); // ":" after "v<version>"
    const version = colon > 1 && stored[0] === 0x76 ? Number(stored.subarray(1, colon).toString()) : NaN;
    const key = config.keys.get(version);
    if (!key || stored.length < colon + 1 + IV_BYTES + 16) throw new Error("Unreadable document file");
    const iv = stored.subarray(colon + 1, colon + 1 + IV_BYTES);
    const tag = stored.subarray(colon + 1 + IV_BYTES, colon + 1 + IV_BYTES + 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(fileAad(userId, documentId));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(stored.subarray(colon + 1 + IV_BYTES + 16)), decipher.final()]);
  }

  // Whether a stored value was encrypted with an older key (and should be re-encrypted)
  const isStale = (stored) => !!config && !String(stored).startsWith(`v${config.current}:`);

  return { ready: !!config, encrypt, decrypt, encryptFile, decryptFile, isStale };
}
