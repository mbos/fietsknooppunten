import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { distance } from "../../public/lib/geo.js";
import { importGpx } from "../../public/lib/gpx.js";
import { clusters, findPlaces, nodesAround, resolve, searchKey, unconnectedSteps } from "../../public/lib/resolver.js";
import { appendNumbers, createRoute } from "../../public/lib/route.js";

// Zelfde gevallen als JunctionResolverTests in de (verwijderde) Mac-app.
const k21Near = { lat: 51.65411, lon: 5.33312 };
const k21Far = { lat: 51.691, lon: 5.333 };
const k76 = { lat: 51.65018, lon: 5.3522 };
const k40 = { lat: 51.66164, lon: 5.33991 };
const node = (number, coordinate) => ({ number, coordinate });
const route = (numbers) => { const r = createRoute("r"); appendNumbers(r, numbers); return r; };

test("clusters nodes of the same junction", () => {
  const result = clusters([
    node(84, { lat: 51.684893, lon: 5.3094684 }), node(84, { lat: 51.6851085, lon: 5.3093229 }),
    node(84, { lat: 51.6853316, lon: 5.3091185 }), node(21, k21Near), node(21, k21Far),
  ]);
  assert.deepEqual(result.filter((c) => c.number === 84).map((c) => c.points.length), [3]);
  assert.equal(result.filter((c) => c.number === 21).length, 2);
});

test("chains merge through a middle point", () => {
  const a = { lat: 51, lon: 5 }, b = { lat: 51.00135, lon: 5 }, c = { lat: 51.0027, lon: 5 };
  assert.equal(clusters([a, c, b].map((p) => node(1, p))).length, 1);
});

test("picks the duplicate number that keeps the route short", () => {
  const r = route([76, 21, 40]);
  const missing = resolve(r, k76, clusters([node(76, k76), node(21, k21Far), node(21, k21Near), node(40, k40)]));
  assert.deepEqual(missing, []);
  assert.deepEqual(r.steps[1].coordinate, k21Near);
});

test("looks ahead instead of choosing greedily", () => {
  const anchor = { lat: 51.675, lon: 5.33 };
  assert.ok(distance(anchor, k21Far) < distance(anchor, k21Near));
  const r = route([21, 76]);
  resolve(r, anchor, clusters([node(21, k21Far), node(21, k21Near), node(76, k76)]));
  assert.deepEqual(r.steps[0].coordinate, k21Near);
});

test("keeps steps that already have a location", () => {
  const r = route([21, 40]);
  r.steps[0].coordinate = k21Far;
  resolve(r, k76, clusters([node(21, k21Near), node(40, k40)]));
  assert.deepEqual(r.steps[0].coordinate, k21Far);
  assert.deepEqual(r.steps[1].coordinate, k40);
});

test("reports missing numbers and resolves the rest", () => {
  const r = route([40, 55, 9, 55]);
  assert.deepEqual(resolve(r, k40, clusters([node(40, k40)])), [55, 9]);
  assert.deepEqual(r.steps[0].coordinate, k40);
  assert.equal(r.steps[1].coordinate, null);
});

test("connections must exist near both junctions", () => {
  const file = { c: [[21, 40, 5165800, 533600], [53, 59, 5300000, 600000]], j: [], p: [] };
  const r = route([21, 40, 59, 53]);
  r.steps[0].coordinate = k21Near;
  r.steps[1].coordinate = k40;
  r.steps[2].coordinate = { lat: 51.66, lon: 5.3 };
  r.steps[3].coordinate = { lat: 51.67, lon: 5.3 };
  assert.deepEqual(unconnectedSteps(r, file), [2, 3]); // 40-59 bestaat niet; 53-59 alleen ver weg
});

test("searches places ignoring case and accents, and names twins", () => {
  const file = { j: [], c: [], p: [["Oosterhout", 5164000, 485900], ["Oosterhout", 5188000, 582000], ["Breda", 5158900, 477600],
    ["Nijmegen", 5184200, 585300], ["Sint-Oedenrode", 5156500, 546400], ["Liège", 5063200, 557900]] };
  assert.deepEqual(findPlaces(file, "ooster").map((p) => p.label), ["Oosterhout, bij Breda", "Oosterhout, bij Nijmegen"]);
  assert.deepEqual(findPlaces(file, "liege").map((p) => p.label), ["Liège"]);
  assert.deepEqual(findPlaces(file, "oedenrode").map((p) => p.label), ["Sint-Oedenrode"]);
  assert.deepEqual(findPlaces(file, ""), []);
  assert.equal(searchKey("Sint-Oedenrode"), "sint oedenrode");
});

// Met het echte knooppuntbestand (alleen als het gebouwd is: tools/knooppunten/update.sh).
const dataFile = new URL("../../public/data/knooppunten.json", import.meta.url);
test("finds all junctions of lokaal.gpx by number around Rosmalen", { skip: !existsSync(dataFile) }, () => {
  const file = JSON.parse(readFileSync(dataFile, "utf8"));
  const gpx = importGpx(readFileSync(new URL("../../../lokaal.gpx", import.meta.url), "utf8"), "x");
  const manual = route(gpx.steps.map((s) => s.number));
  const [rosmalen] = findPlaces(file, "Rosmalen");
  assert.equal(rosmalen.label, "Rosmalen");
  const numbers = new Set(manual.steps.map((s) => s.number));
  const missing = resolve(manual, rosmalen.coordinate, clusters(nodesAround(file, numbers, rosmalen.coordinate)));
  assert.deepEqual(missing, []);
  manual.steps.forEach((s, i) => {
    assert.ok(distance(s.coordinate, gpx.steps[i].coordinate) < 100, `${s.number}: ${distance(s.coordinate, gpx.steps[i].coordinate)} m`);
  });
  // Zelfde uitkomst als de live Overpass-test op de Mac: 59→51 en 51→3 zijn niet verbonden.
  assert.deepEqual(unconnectedSteps(manual, file).map((i) => `${manual.steps[i - 1].number}-${manual.steps[i].number}`), ["59-51", "51-3"]);
});
