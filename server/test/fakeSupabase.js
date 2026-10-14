// A small in-memory stand-in for the Supabase client, for server route tests. Supports the
// query builder calls the server uses (select/insert/update/upsert/delete with eq, gte, lt,
// in, order, single, maybeSingle, count) plus auth.getUser and auth.admin.getUserById.
//
// It does NOT enforce row-level security: every client sees every row. Tests of the server's
// own permission checks are meaningful; anything that relies on RLS has to be tested in Supabase.
//
// Usage in a test file:
//   vi.mock("@supabase/supabase-js", async () => (await import("./test/fakeSupabase.js")).supabaseModule);
//   import { db } from "./test/fakeSupabase.js";
//   db.reset({ trips: [...], trip_members: [...] }, { users: [...], tokens: { "token-a": "user-a" } });

let tables = {};
let users = new Map();
let tokens = new Map();
let files = new Map(); // "bucket/path" -> { body: Buffer, contentType }

export const db = {
  reset(initialTables = {}, { users: userList = [], tokens: tokenMap = {} } = {}) {
    tables = Object.fromEntries(Object.entries(initialTables).map(([t, rows]) => [t, rows.map((r) => ({ ...r }))]));
    users = new Map(userList.map((u) => [u.id, u]));
    tokens = new Map(Object.entries(tokenMap));
    files = new Map();
  },
  // Storage objects in a bucket: { path: { body, contentType } }
  files(bucket) {
    return Object.fromEntries(
      [...files].filter(([key]) => key.startsWith(`${bucket}/`)).map(([key, v]) => [key.slice(bucket.length + 1), v])
    );
  },
  rows(table) {
    return tables[table] || [];
  },
};

const clone = (value) => (value == null ? value : structuredClone(value));

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.action = "select";
    this.payload = null;
    this.countMode = null;
    this.head = false;
    this.orderBy = null;
    this.returnRows = false;
    this.mode = "many";
  }

  // Reads (or, after insert/update/upsert, asks for the written rows back)
  select(_columns, { count, head } = {}) {
    if (this.action === "select") {
      this.countMode = count || null;
      this.head = !!head;
    } else {
      this.returnRows = true;
    }
    return this;
  }
  insert(values) { this.action = "insert"; this.payload = values; return this; }
  update(values) { this.action = "update"; this.payload = values; return this; }
  upsert(values, { onConflict, ignoreDuplicates } = {}) {
    this.action = "upsert";
    this.payload = values;
    this.conflict = onConflict ? onConflict.split(",").map((c) => c.trim()) : ["id"];
    this.ignoreDuplicates = !!ignoreDuplicates;
    return this;
  }
  delete() { this.action = "delete"; return this; }

  eq(column, value) { this.filters.push((r) => String(r[column]) === String(value) && r[column] != null); return this; }
  neq(column, value) { this.filters.push((r) => String(r[column]) !== String(value)); return this; }
  gte(column, value) { this.filters.push((r) => r[column] >= value); return this; }
  lt(column, value) { this.filters.push((r) => r[column] < value); return this; }
  in(column, values) { this.filters.push((r) => values.map(String).includes(String(r[column]))); return this; }
  order(column, { ascending = true } = {}) { this.orderBy = { column, ascending }; return this; }
  limit() { return this; }

  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybeSingle"; return this; }

  then(resolve, reject) {
    try {
      resolve(this.run());
    } catch (err) {
      reject(err);
    }
  }

  matching() {
    const rows = tables[this.table] || (tables[this.table] = []);
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  run() {
    const rows = tables[this.table] || (tables[this.table] = []);
    let result;

    if (this.action === "select") {
      result = this.matching();
      if (this.orderBy) {
        const { column, ascending } = this.orderBy;
        result = [...result].sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * (ascending ? 1 : -1));
      }
      if (this.countMode) return { data: this.head ? null : clone(result), count: result.length, error: null };
    } else if (this.action === "insert") {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((v) => ({
        id: v.id ?? crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...v,
      }));
      rows.push(...list);
      result = list;
    } else if (this.action === "update") {
      result = this.matching();
      result.forEach((r) => Object.assign(r, this.payload));
    } else if (this.action === "upsert") {
      result = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((v) => {
        const existing = rows.find((r) => this.conflict.every((c) => String(r[c]) === String(v[c])));
        if (existing) {
          if (!this.ignoreDuplicates) Object.assign(existing, v);
          return existing;
        }
        const row = { id: v.id ?? crypto.randomUUID(), created_at: new Date().toISOString(), ...v };
        rows.push(row);
        return row;
      });
    } else if (this.action === "delete") {
      result = this.matching();
      tables[this.table] = rows.filter((r) => !result.includes(r));
    }

    if (this.action !== "select" && !this.returnRows && this.mode === "many") return { data: null, error: null };
    if (this.mode === "single") {
      return result.length === 1
        ? { data: clone(result[0]), error: null }
        : { data: null, error: { code: "PGRST116", message: `Expected 1 row, got ${result.length}` } };
    }
    if (this.mode === "maybeSingle") return { data: clone(result[0] ?? null), error: null };
    return { data: clone(result), error: null };
  }
}

function createClient() {
  return {
    from: (table) => new Query(table),
    auth: {
      async getUser(token) {
        const user = users.get(tokens.get(token));
        return user ? { data: { user: clone(user) }, error: null } : { data: { user: null }, error: { message: "Invalid token" } };
      },
      admin: {
        async getUserById(id) {
          const user = users.get(id);
          return { data: { user: user ? clone(user) : null }, error: null };
        },
      },
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    // Supabase Storage: upload / download / remove / createSignedUrls (what the server uses)
    storage: {
      from: (bucket) => ({
        async upload(path, body, { upsert = false, contentType } = {}) {
          const key = `${bucket}/${path}`;
          if (files.has(key) && !upsert) return { data: null, error: { message: "The resource already exists" } };
          files.set(key, { body: Buffer.from(body), contentType });
          return { data: { path }, error: null };
        },
        async download(path) {
          const file = files.get(`${bucket}/${path}`);
          return file ? { data: new Blob([file.body]), error: null } : { data: null, error: { message: "Object not found" } };
        },
        async createSignedUrls(paths, expiresIn) {
          return {
            data: paths.map((p) => ({ path: p, signedUrl: files.has(`${bucket}/${p}`) ? `https://fake.storage/${bucket}/${p}?expires=${expiresIn}` : null, error: null })),
            error: null,
          };
        },
        async remove(paths) {
          paths.forEach((p) => files.delete(`${bucket}/${p}`));
          return { data: paths.map((name) => ({ name })), error: null };
        },
      }),
    },
  };
}

export const supabaseModule = { createClient };
