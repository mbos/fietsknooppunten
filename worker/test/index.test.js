import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import worker, { cleanUp, LIMITS, normalizeCode, validate } from "../src/index.js";

const CODE = "k7m2-x9qp-4tvw-hc3d";
const OTHER = "abcd-efgh-jkmn-pqrs";
const LEGACY_KEY = "oud-geheim-van-de-prive-opzet";
const ROUTE = { v: 1, n: "lokaal", j: [[93, 5171976, 536379], [99, 5171068, 537615], [5]] };
const DAY = 24 * 3600 * 1000;

/** Minimale D1 bovenop node:sqlite, met het echte schema uit migrations/. */
function fakeD1() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8"));
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  });
  return {
    sqlite: db,
    prepare: (sql) => statement(sql),
    batch: async (statements) => Promise.all(statements.map((s) => s.run())),
  };
}

function env({ now = Date.UTC(2026, 10, 13, 12) } = {}) {
  const e = { DB: fakeD1(), time: now };
  e.NOW = () => e.time;
  return e;
}

function call(e, method, { code = CODE, body, path = "/route", ip = "203.0.113.7" } = {}) {
  const headers = { "CF-Connecting-IP": ip };
  if (code) headers.Authorization = `Bearer ${code}`;
  return worker.fetch(new Request(`https://fietsknooppunten.deboskes.eu${path}`, { method, headers, body }), e);
}

const put = (e, options = {}) => call(e, "PUT", { body: JSON.stringify(ROUTE), ...options });

test("stores a route per code and returns it as JSON", async () => {
  const e = env();
  const response = await put(e);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, steps: 3 });

  const get = await call(e, "GET");
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("Content-Type"), "application/json");
  assert.deepEqual(await get.json(), ROUTE);
});

test("codes are case, space and dash insensitive", async () => {
  const e = env();
  await put(e, { code: "K7M2X9QP4TVWHC3D" });
  assert.equal((await call(e, "GET", { code: " k7m2 x9qp 4tvw hc3d " })).status, 200);
});

test("two codes do not see each other's route", async () => {
  const e = env();
  await put(e);
  assert.equal((await call(e, "GET", { code: OTHER })).status, 404);
});

test("the code itself is never stored", async () => {
  const e = env();
  await put(e);
  const rows = e.DB.sqlite.prepare("SELECT code_hash FROM routes").all();
  assert.equal(rows.length, 1);
  assert.match(rows[0].code_hash, /^[0-9a-f]{64}$/);
  const dump = JSON.stringify(e.DB.sqlite.prepare("SELECT * FROM routes, counters").all());
  assert.ok(!dump.includes("k7m2") && !dump.includes("203.0.113.7"));
});

test("refuses missing or malformed codes", async () => {
  const e = env();
  assert.equal((await call(e, "GET", { code: null })).status, 401);
  assert.equal((await call(e, "GET", { code: "kort" })).status, 401);
  assert.equal((await call(e, "GET", { code: "k7m2-x9qp-4tvw-hc3dx" })).status, 401);
  assert.equal((await call(e, "GET", { code: "k7m2-x9qp-4tvw-hc30" })).status, 401); // 0 zit niet in het alfabet
  assert.equal((await put(e, { code: "fout" })).status, 401);
});

test("limits writes per code per day, and resets the next day", async () => {
  const e = env();
  for (let i = 0; i < LIMITS.writesPerCode; i++) {
    assert.equal((await put(e)).status, 200);
  }
  const blocked = await put(e);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("Retry-After"), "3600");
  assert.equal((await call(e, "GET")).status, 200); // lezen blijft werken
  e.time += DAY;
  assert.equal((await put(e)).status, 200);
});

test("limits writes per IP address across codes", async () => {
  const e = env();
  const codes = Array.from({ length: LIMITS.writesPerIp + 1 }, (_, i) =>
    "abcdefghjkmn" + [...i.toString(31).padStart(4, "0")].map((c) => "23456789abcdefghjkmnpqrstuvwxyz"[parseInt(c, 31)]).join(""));
  for (const code of codes.slice(0, -1)) {
    assert.equal((await put(e, { code })).status, 200, code);
  }
  assert.equal((await put(e, { code: codes.at(-1) })).status, 429);
  assert.equal((await put(e, { code: codes.at(-1), ip: "198.51.100.1" })).status, 200);
});

test("cleans up routes unused for 90 days and old counters", async () => {
  const e = env();
  await put(e);
  await put(e, { code: OTHER });
  e.time += 60 * DAY;
  await call(e, "GET", { code: OTHER }); // OTHER wordt nog gebruikt
  e.time += 31 * DAY;
  await cleanUp(e, e.time);
  assert.equal((await call(e, "GET")).status, 404);
  assert.equal((await call(e, "GET", { code: OTHER })).status, 200);
  const counters = e.DB.sqlite.prepare("SELECT day FROM counters").all();
  assert.deepEqual(counters, []);
});

test("fetching marks a route as used at most once per day", async () => {
  const e = env();
  await put(e);
  const fetchedAt = () => e.DB.sqlite.prepare("SELECT fetched_at FROM routes").get().fetched_at;
  const first = fetchedAt();
  e.time += 3600 * 1000;
  await call(e, "GET");
  assert.equal(fetchedAt(), first);
  e.time += DAY;
  await call(e, "GET");
  assert.equal(fetchedAt(), e.time);
});

test("the old private API key no longer works", async () => {
  const e = { ...env(), API_KEY: LEGACY_KEY };
  assert.equal((await call(e, "GET", { code: LEGACY_KEY })).status, 401);
});

test("reports unknown paths and methods, and serves assets when configured", async () => {
  const e = env();
  assert.equal((await call(e, "GET", { path: "/" })).status, 404);
  assert.equal((await call(e, "DELETE")).status, 405);
  e.ASSETS = { fetch: async () => new Response("webapp") };
  assert.equal(await (await call(e, "GET", { path: "/" })).text(), "webapp");
});

test("rejects invalid routes", async () => {
  const e = env();
  assert.equal((await call(e, "PUT", { body: "{" })).status, 400);
  assert.equal((await call(e, "PUT", { body: JSON.stringify({ v: 2, n: "x", j: [[1]] }) })).status, 400);
  assert.equal((await call(e, "PUT", { body: "x".repeat(17 * 1024) })).status, 413);
});

test("normalizes codes", () => {
  assert.equal(normalizeCode("K7M2-X9QP 4TVW-HC3D"), "k7m2x9qp4tvwhc3d");
  assert.equal(normalizeCode("k7m2x9qp4tvwhc3"), null);
  assert.equal(normalizeCode("i7m2x9qp4tvwhc3d"), null);
});

test("validates the optional track and turns", () => {
  const t = [[5171976, 536379], [10, -5], [3, 8], [-4, 2]];
  assert.equal(validate({ ...ROUTE, t, b: [[1, -1], [2, 2]] }), null);
  assert.equal(validate({ ...ROUTE, t }), null);
  assert.equal(validate({ ...ROUTE, t: [[1, 2]] }), "malformed track");
  assert.equal(validate({ ...ROUTE, t: [[1, 2], [3]] }), "malformed track");
  assert.equal(validate({ ...ROUTE, t: [[1, 2], [3, 4.5]] }), "malformed track");
  assert.equal(validate({ ...ROUTE, b: [[1, 1]] }), "malformed turns");
  assert.equal(validate({ ...ROUTE, t, b: [[3, 1]] }), "malformed turns");
  assert.equal(validate({ ...ROUTE, t, b: [[0, 1]] }), "malformed turns");
  assert.equal(validate({ ...ROUTE, t, b: [[1, 0]] }), "malformed turns");
});

test("validates the route format", () => {
  assert.equal(validate(ROUTE), null);
  assert.equal(validate([]), "not an object");
  assert.equal(validate({ v: 1, n: "x", j: [] }), "no steps");
  assert.equal(validate({ v: 1, n: "x", j: [[1, 2]] }), "malformed step");
  assert.equal(validate({ v: 1, n: "x", j: [[1.5]] }), "malformed step");
  assert.equal(validate({ v: 1, n: "x", j: [[100]] }), "malformed step");
  assert.equal(validate({ v: 1, j: [[1]] }), "missing name");
});

test("rejects oversized bodies without reading them fully, also when chunked", async () => {
  const e = env();
  const declared = await worker.fetch(new Request("https://x/route", {
    method: "PUT", headers: { Authorization: `Bearer ${CODE}`, "Content-Length": "999999" }, body: "{}",
  }), e);
  assert.equal(declared.status, 413);
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(8 * 1024).fill(32)); },
  });
  const chunked = await worker.fetch(new Request("https://x/route", {
    method: "PUT", headers: { Authorization: `Bearer ${CODE}` }, body: stream, duplex: "half",
  }), e);
  assert.equal(chunked.status, 413);
});

test("API responses are not cacheable and carry security headers", async () => {
  const e = env();
  await put(e);
  for (const response of [await call(e, "GET"), await call(e, "GET", { code: null }), await put(e)]) {
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.match(response.headers.get("Content-Security-Policy"), /default-src 'none'/);
  }
});

test("IP addresses are hashed with a secret salt and the day", async () => {
  const e = { ...env(), IP_SALT: "zout" };
  e.NOW = () => e.time;
  await put(e);
  const key = e.DB.sqlite.prepare("SELECT key FROM counters WHERE key LIKE 'ip:%'").get().key;
  const { createHash } = await import("node:crypto");
  const unsalted = createHash("sha256").update("ip:203.0.113.7").digest("hex");
  assert.notEqual(key, `ip:${unsalted}`);
  assert.equal(key, `ip:${createHash("sha256").update("ip:zout:2026-11-13:203.0.113.7").digest("hex")}`);
});
