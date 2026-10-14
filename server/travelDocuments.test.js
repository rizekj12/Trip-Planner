// Travel documents (issue #56): numbers are stored encrypted, listed masked, and only ever
// shown in full to their owner
import { describe, test, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import express from "express";
import request from "supertest";
import { db } from "./test/fakeSupabase.js";
import { OWNER, MEMBER, USERS, TOKENS, auth } from "./test/fixtures.js";

vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
const { registerTravelDocumentRoutes, cleanDocument, lastFour, MAX_DOCUMENTS } = await import("./travelDocuments.js");

const KEYS = `1:${crypto.randomBytes(32).toString("base64")}`;
const appWith = (encryptionKeys) => {
  const app = express();
  app.use(express.json());
  registerTravelDocumentRoutes(app, { supabaseUrl: "http://fake", serviceKey: "service", encryptionKeys });
  return app;
};
const app = appWith(KEYS);

const PASSPORT = { kind: "passport", label: "United States", number: "X12345678", expires_on: "2031-03-14" };
const rows = () => db.rows("travel_documents");
const add = (doc = PASSPORT, token = "token-owner") => request(app).post("/api/documents").set(auth(token)).send(doc);

beforeEach(() => {
  db.reset({ travel_documents: [] }, { users: USERS, tokens: TOKENS });
});

describe("saving", () => {
  test("stores only ciphertext and the last 4; the reply never has the full number", async () => {
    const res = await add();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ kind: "passport", label: "United States", hasNumber: true, last4: "5678" });
    expect(res.text).not.toContain("X12345678");

    const [row] = rows();
    expect(row.user_id).toBe(OWNER.id);
    expect(row.number_encrypted).toMatch(/^v1:/);
    expect(JSON.stringify(row)).not.toContain("X12345678");
    expect(row.number).toBeUndefined();
  });

  test("requires sign-in", async () => {
    expect((await request(app).post("/api/documents").send(PASSPORT)).status).toBe(401);
    expect((await request(app).get("/api/documents")).status).toBe(401);
  });

  test("validates the document", async () => {
    expect((await add({ ...PASSPORT, kind: "spaceship" })).status).toBe(400);
    expect((await add({ ...PASSPORT, expires_on: "next year" })).status).toBe(400);
    expect((await add({ ...PASSPORT, number: "x".repeat(101) })).status).toBe(400);
  });

  test(`at most ${MAX_DOCUMENTS} per person`, async () => {
    db.reset(
      { travel_documents: Array.from({ length: MAX_DOCUMENTS }, (_, i) => ({ id: crypto.randomUUID(), user_id: OWNER.id, kind: "other", label: `#${i}` })) },
      { users: USERS, tokens: TOKENS }
    );
    expect((await add()).status).toBe(409);
  });

  test("with no encryption key, a number is refused instead of stored in plain text", async () => {
    const res = await request(appWith(undefined)).post("/api/documents").set(auth("token-owner")).send(PASSPORT);
    expect(res.status).toBe(503);
    expect(rows()).toHaveLength(0);
    // Documents without a number still work
    const noNumber = await request(appWith(undefined)).post("/api/documents").set(auth("token-owner")).send({ kind: "insurance", label: "Acme" });
    expect(noNumber.status).toBe(201);
  });
});

describe("reading", () => {
  test("the list is masked and only has the caller's own documents", async () => {
    await add();
    await add({ kind: "visa", label: "Japan", number: "VISA-0001" }, "token-member");
    const res = await request(app).get("/api/documents").set(auth("token-owner"));
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ last4: "5678", hasNumber: true });
    expect(res.text).not.toMatch(/X12345678|number_encrypted|VISA-0001/);
  });

  test("Show returns the full number to its owner, uncached", async () => {
    const { body } = await add();
    const res = await request(app).get(`/api/documents/${body.id}/number`).set(auth("token-owner"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ number: "X12345678" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  test("nobody else can read or change someone's document", async () => {
    const { body } = await add();
    for (const call of [
      request(app).get(`/api/documents/${body.id}/number`),
      request(app).put(`/api/documents/${body.id}`).send({ label: "Hacked" }),
      request(app).delete(`/api/documents/${body.id}`),
    ]) {
      const res = await call.set(auth("token-member"));
      expect(res.status).toBe(404);
      expect(res.text).not.toContain("X12345678");
    }
    expect(rows()[0].label).toBe("United States");
  });

  test("a value moved onto another person's row can't be decrypted", async () => {
    const { body } = await add();
    rows()[0].user_id = MEMBER.id; // e.g. a database edit
    const res = await request(app).get(`/api/documents/${body.id}/number`).set(auth("token-member"));
    expect(res.status).toBe(500);
    expect(res.text).not.toContain("X12345678");
  });
});

describe("changing", () => {
  test("leaving out the number keeps it; a new one replaces it; empty removes it", async () => {
    const { body } = await add();
    const url = `/api/documents/${body.id}`;
    const before = rows()[0].number_encrypted;

    await request(app).put(url).set(auth("token-owner")).send({ label: "USA" });
    expect(rows()[0].number_encrypted).toBe(before);
    expect(rows()[0].label).toBe("USA");

    const replaced = await request(app).put(url).set(auth("token-owner")).send({ number: "Y99990000" });
    expect(replaced.body.last4).toBe("0000");
    expect((await request(app).get(`${url}/number`).set(auth("token-owner"))).body.number).toBe("Y99990000");

    const removed = await request(app).put(url).set(auth("token-owner")).send({ number: "" });
    expect(removed.body).toMatchObject({ hasNumber: false, last4: null });
    expect(rows()[0].number_encrypted).toBeNull();
  });

  test("delete", async () => {
    const { body } = await add();
    expect((await request(app).delete(`/api/documents/${body.id}`).set(auth("token-owner"))).status).toBe(200);
    expect(rows()).toHaveLength(0);
  });
});

describe("helpers", () => {
  test("lastFour ignores spaces and dashes", () => {
    expect(lastFour("AB-12 3456")).toBe("3456");
    expect(lastFour("12")).toBe("12");
  });

  test("cleanDocument: number undefined keeps, empty removes", () => {
    expect(cleanDocument({ label: "x" }, { partial: true }).number).toBeUndefined();
    expect(cleanDocument({ number: "" }, { partial: true }).number).toBeNull();
    expect(cleanDocument({ kind: "passport", number: " X1 " }).number).toBe("X1");
  });
});
