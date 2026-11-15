import assert from "node:assert/strict";
import { test } from "node:test";
import { sendRoute, messageFor } from "../../public/lib/api.js";
import { ALPHABET, formatCode, generateCode, LENGTH, normalizeCode } from "../../public/lib/code.js";
import { parseNumber, parseSequence } from "../../public/lib/numbers.js";
import { appendNumbers, createRoute, encode, missingLocations, moveStep, removeStep, scaled, setNumber } from "../../public/lib/route.js";
import { load, save } from "../../public/lib/storage.js";
import { normalizeCode as workerNormalize } from "../../src/index.js";

// Zelfde gevallen als JunctionNumberTests in de (verwijderde) Mac-app.
test("parses numbers", () => {
  for (const [input, expected] of [["5", 5], ["05", 5], [" 9 ", 9], ["Knooppunt 05", 5], ["knooppunt 93", 93], ["99", 99]]) {
    assert.equal(parseNumber(input), expected, input);
  }
  for (const input of ["", "0", "100", "abc", "-3", "4a", "Knooppunt"]) {
    assert.equal(parseNumber(input), null, input);
  }
});

test("parses sequences", () => {
  assert.deepEqual(parseSequence("93 99-94, 80 → 05"), { numbers: [93, 99, 94, 80, 5], invalid: [] });
  assert.deepEqual(parseSequence("93 x 150"), { numbers: [], invalid: ["x", "150"] });
});

// Gesorteerde sleutels, integers, stap zonder locatie (docs/route-format.md).
test("encodes routes in the watch format", () => {
  const route = createRoute("lokaal");
  appendNumbers(route, [93, 5]);
  route.steps[0].coordinate = { lat: 51.71976, lon: 5.36379 };
  assert.equal(encode(route), '{"j":[[93,5171976,536379],[5]],"n":"lokaal","v":1}');
  route.track = [{ lat: 51.71976, lon: 5.36379 }, { lat: 51.72, lon: 5.36379 }];
  assert.equal(encode(route),
    '{"b":[],"j":[[93,5171976,536379],[5]],"n":"lokaal","t":[[5171976,536379],[24,0]],"v":1}');
  assert.equal(scaled(-0.000005), -1);
  assert.equal(scaled(0.000005), 1);
});

test("edits routes", () => {
  const route = createRoute();
  appendNumbers(route, [1, 2, 3]);
  route.steps[1].coordinate = { lat: 51, lon: 5 };
  setNumber(route, route.steps[1].id, 2);
  assert.ok(route.steps[1].coordinate, "zelfde nummer: locatie blijft");
  setNumber(route, route.steps[1].id, 7);
  assert.equal(route.steps[1].coordinate, null);
  moveStep(route, route.steps[2].id, -1);
  assert.deepEqual(route.steps.map((s) => s.number), [1, 3, 7]);
  moveStep(route, route.steps[0].id, -1);
  assert.deepEqual(route.steps.map((s) => s.number), [1, 3, 7]);
  removeStep(route, route.steps[0].id);
  assert.deepEqual(route.steps.map((s) => s.number), [3, 7]);
  assert.equal(missingLocations(route), 2);
});

test("generates codes the Worker accepts", () => {
  const codes = new Set();
  for (let i = 0; i < 200; i++) {
    const code = generateCode();
    assert.equal(code.length, LENGTH);
    assert.ok([...code].every((c) => ALPHABET.includes(c)));
    assert.equal(workerNormalize(formatCode(code).toUpperCase()), code);
    codes.add(code);
  }
  assert.equal(codes.size, 200);
  assert.equal(formatCode("k7m2x9qp4tvwhc3d"), "k7m2-x9qp-4tvw-hc3d");
  assert.equal(normalizeCode(" K7M2-X9QP 4TVW-HC3D "), "k7m2x9qp4tvwhc3d");
  assert.equal(normalizeCode("k7m2-x9qp-4tvw-hc30"), null);
});

test("sends with the code and explains failures in Dutch", async () => {
  /** @type {any[]} */
  const calls = [];
  const ok = await sendRoute("k7m2x9qp4tvwhc3d", "{}", async (url, init) => {
    calls.push([url, init]);
    return new Response('{"ok":true}', { status: 200 });
  });
  assert.deepEqual(ok, { ok: true });
  assert.equal(calls[0][0], "/route");
  assert.equal(calls[0][1].method, "PUT");
  assert.equal(calls[0][1].headers.Authorization, "Bearer k7m2x9qp4tvwhc3d");

  const limited = await sendRoute("x", "{}", async () => new Response('{"error":"too many requests"}', { status: 429 }));
  assert.equal(limited.ok, false);
  assert.match(/** @type {any} */ (limited).message, /morgen/);
  const offline = await sendRoute("x", "{}", async () => { throw new TypeError("offline"); });
  assert.match(/** @type {any} */ (offline).message, /verbinding/);
  assert.match(messageFor(400, "malformed step"), /malformed step/);
});

test("stores state and survives broken or blocked storage", () => {
  const memory = new Map();
  const storage = /** @type {any} */ ({ getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) });
  assert.deepEqual(load(storage), { code: null, routes: [], selected: null });
  const route = createRoute("a");
  assert.ok(save({ code: "abc", routes: [route], selected: route.id }, storage));
  assert.deepEqual(load(storage), { code: "abc", routes: [route], selected: route.id });
  memory.set("fietsknooppunten.v1", "{kapot");
  assert.deepEqual(load(storage).routes, []);
  const blocked = /** @type {any} */ ({ getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  assert.deepEqual(load(blocked).routes, []);
  assert.equal(save({ code: null, routes: [], selected: null }, blocked), false);
});

test("translations: every key exists in both languages and the browser language is detected", async () => {
  const { dictionaries, detectLanguage, setLanguage, t } = await import("../../public/lib/i18n.js");
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.nl).sort());
  for (const key of Object.keys(dictionaries.nl)) {
    assert.equal(typeof dictionaries.en[key], typeof dictionaries.nl[key], key);
  }
  assert.equal(detectLanguage(["nl-BE", "fr"]), "nl");
  assert.equal(detectLanguage(["de-DE", "en-GB"]), "en");
  assert.equal(detectLanguage(["fr-BE"]), "en");
  setLanguage("en");
  assert.equal(t("routes.count", 2), "2 junctions");
  assert.match(messageFor(429, ""), /tomorrow/);
  setLanguage("nl");
  assert.equal(t("routes.count", 1), "1 knooppunt");
});
