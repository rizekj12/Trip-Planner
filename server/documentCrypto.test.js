// Travel document number encryption (issue #56)
import { describe, test, expect } from "vitest";
import crypto from "node:crypto";
import { createDocumentCrypto, parseKeys } from "./documentCrypto.js";

const key = () => crypto.randomBytes(32).toString("base64");
const K1 = key();
const K2 = key();

describe("document encryption", () => {
  const crypt = createDocumentCrypto(`1:${K1}`);

  test("round-trips, and the stored value never contains the number", () => {
    const stored = crypt.encrypt("X12345678", "user-a");
    expect(stored).toMatch(/^v1:[^:]+:[^:]+:[^:]+$/);
    expect(stored).not.toContain("X12345678");
    expect(crypt.decrypt(stored, "user-a")).toBe("X12345678");
  });

  test("the same number encrypts differently every time (random IV)", () => {
    expect(crypt.encrypt("X12345678", "user-a")).not.toBe(crypt.encrypt("X12345678", "user-a"));
  });

  test("a value copied onto another person's row won't decrypt", () => {
    const stored = crypt.encrypt("X12345678", "user-a");
    expect(() => crypt.decrypt(stored, "user-b")).toThrow();
  });

  test("tampering is detected", () => {
    const [v, iv, tag, data] = crypt.encrypt("X12345678", "user-a").split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;
    expect(() => crypt.decrypt([v, iv, tag, flipped.toString("base64")].join(":"), "user-a")).toThrow();
  });

  test("the wrong key can't decrypt", () => {
    const stored = crypt.encrypt("X12345678", "user-a");
    expect(() => createDocumentCrypto(`1:${K2}`).decrypt(stored, "user-a")).toThrow();
  });

  test("rotation: the newest key encrypts, older keys still decrypt", () => {
    const old = crypt.encrypt("X12345678", "user-a");
    const rotated = createDocumentCrypto(`1:${K1},2:${K2}`);
    expect(rotated.decrypt(old, "user-a")).toBe("X12345678");
    expect(rotated.isStale(old)).toBe(true);
    const fresh = rotated.encrypt("X12345678", "user-a");
    expect(fresh.startsWith("v2:")).toBe(true);
    expect(rotated.isStale(fresh)).toBe(false);
  });

  test("files round-trip and are bound to their owner and document", () => {
    const file = Buffer.from("%PDF-1.7 passport X12345678");
    const stored = crypt.encryptFile(file, "user-a", "doc-1");
    expect(stored.toString("latin1")).not.toContain("X12345678");
    expect(stored.subarray(0, 3).toString()).toBe("v1:");
    expect(crypt.decryptFile(stored, "user-a", "doc-1")).toEqual(file);
    expect(() => crypt.decryptFile(stored, "user-a", "doc-2")).toThrow();
    expect(() => crypt.decryptFile(stored, "user-b", "doc-1")).toThrow();
    const tampered = Buffer.from(stored);
    tampered[tampered.length - 1] ^= 1;
    expect(() => crypt.decryptFile(tampered, "user-a", "doc-1")).toThrow();
  });

  test("not configured: refuses to encrypt rather than storing plain text", () => {
    const none = createDocumentCrypto(undefined);
    expect(none.ready).toBe(false);
    expect(() => none.encrypt("X1", "user-a")).toThrow();
  });

  test("bad keys are rejected with a clear message", () => {
    expect(() => parseKeys("not-a-key")).toThrow(/must look like/);
    expect(() => parseKeys(`1:${Buffer.from("short").toString("base64")}`)).toThrow(/32 bytes/);
  });
});
