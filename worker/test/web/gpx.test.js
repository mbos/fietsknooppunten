import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { distance } from "../../public/lib/geo.js";
import { GpxError, importGpx } from "../../public/lib/gpx.js";
import { encode } from "../../public/lib/route.js";
import { simplify, turns } from "../../public/lib/trackguide.js";
import { parseXml } from "../../public/lib/xml.js";

const repo = new URL("../../../", import.meta.url);
const lokaal = () => importGpx(readFileSync(new URL("lokaal.gpx", repo), "utf8"), "bestand");

// Zelfde gevallen als GPXImporterTests in de (verwijderde) Mac-app.
test("imports the ANWB route as 22 steps", () => {
  const route = lokaal();
  assert.equal(route.name, "lokaal");
  assert.deepEqual(route.steps.map((s) => s.number),
    [93, 99, 94, 80, 5, 4, 82, 72, 77, 76, 21, 40, 9, 8, 84, 88, 53, 59, 51, 3, 42, 93]);
  assert.ok(route.steps.every((s) => s.coordinate));
  assert.notEqual(route.steps[0].id, route.steps.at(-1).id);
  assert.equal(route.track.length, 1076);
});

/** De testroute van het horloge is precies wat de webapp voor lokaal.gpx verstuurt (npm run watch-route). */
test("sends exactly the watch test route for lokaal.gpx", () => {
  const expected = readFileSync(new URL("watch/resources/jsonData/route.json", repo), "utf8");
  assert.equal(encode(lokaal()), expected);
});

test("reads GPX 1.1 with metadata name and only junction waypoints", () => {
  const route = importGpx(`<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
      <metadata><name>Rondje Rosmalen</name></metadata>
      <wpt lat="51.7" lon="5.36"><name>12</name></wpt>
      <wpt lat="51.71" lon="5.37"><name>Parkeerplaats</name></wpt>
      <wpt lat="51.72" lon="5.38"><name>Knooppunt 07</name></wpt>
    </gpx>`, "bestand");
  assert.equal(route.name, "Rondje Rosmalen");
  assert.deepEqual(route.steps.map((s) => s.number), [12, 7]);
  assert.equal(route.track, null);
});

test("keeps the same number far away as a separate step", () => {
  const route = importGpx(`<gpx version="1.1"><wpt lat="51.65" lon="5.33"><name>21</name></wpt>
    <wpt lat="51.69" lon="5.33"><name>21</name></wpt></gpx>`, "x");
  assert.deepEqual(route.steps.map((s) => s.number), [21, 21]);
});

test("merges nearby duplicates into their centroid", () => {
  const route = importGpx(`<gpx><wpt lat="51.680587" lon="5.367857"><name>82</name></wpt>
    <wpt lat="51.679610" lon="5.367979"><name>82</name></wpt></gpx>`, "x");
  assert.equal(route.steps.length, 1);
  assert.ok(Math.abs(route.steps[0].coordinate.lat - 51.6800985) < 1e-9);
});

test("uses the fallback name, entities and namespaced tags", () => {
  assert.equal(importGpx(`<gpx version="1.1"><wpt lat="51.7" lon="5.36"><name>1</name></wpt></gpx>`, "mijnroute").name, "mijnroute");
  const route = importGpx(`<g:gpx xmlns:g="x"><g:trk><g:name>Rit &amp; terug</g:name></g:trk><g:wpt lat='51.7' lon='5.36'><g:name><![CDATA[Knooppunt 3]]></g:name></g:wpt></g:gpx>`, "x");
  assert.equal(route.name, "Rit & terug");
  assert.deepEqual(route.steps.map((s) => s.number), [3]);
});

test("rejects files without junctions and non-GPX files", () => {
  assert.throws(() => importGpx(`<gpx version="1.1"><wpt lat="51.7" lon="5.36"><name>Café</name></wpt></gpx>`, "x"),
    (e) => e instanceof GpxError && /geen knooppunten/.test(e.message));
  for (const bad of ["<html></html>", "geen xml", "<gpx><wpt></gpx>", ""]) {
    assert.throws(() => importGpx(bad, "x"), GpxError, bad);
  }
});

test("distance is haversine", () => {
  assert.ok(Math.abs(distance({ lat: 51, lon: 5 }, { lat: 52, lon: 5 }) - 111_195) < 10);
});

test("xml reader handles comments, attributes with > and self-closing tags", () => {
  const seen = [];
  parseXml(`<?xml version="1.0"?><!-- x --><a b="1>2"><c/>tekst</a>`, {
    start: (n, a) => seen.push(["start", n, a]),
    end: (n) => seen.push(["end", n]),
    text: (t) => seen.push(["text", t]),
  });
  assert.deepEqual(seen, [["start", "a", { b: "1>2" }], ["start", "c", {}], ["end", "c"], ["text", "tekst"], ["end", "a"]]);
});

// Zelfde gevallen als TrackGuideTests in de (verwijderde) Mac-app.
const point = (north = 0, east = 0) => {
  const perDegree = 6_371_000 * Math.PI / 180;
  return { lat: 51.7 + north / perDegree, lon: 5.36 + east / (perDegree * Math.cos(51.7 * Math.PI / 180)) };
};

test("track guide: straight lines, corners and turns", () => {
  const line = Array.from({ length: 21 }, (_, i) => point(i * 50));
  assert.deepEqual(simplify(line), [line[0], line[20]]);
  const corner = [...Array.from({ length: 11 }, (_, i) => point(i * 50)), ...Array.from({ length: 10 }, (_, i) => point(500, (i + 1) * 50))];
  assert.equal(simplify(corner).length, 3);
  assert.deepEqual(turns([point(), point(200, 5), point(400), point(600, -5), point(800)]), []);
  assert.deepEqual(turns([point(), point(300), point(300, -300), point(600, -300)]), [[1, -1], [2, 1]]);
  assert.deepEqual(turns([point(), point(300), point(100, 150)]), [[1, 2]]);
  assert.deepEqual(turns([point(), point(300), point(600, 200)]), []);
});

test("track guide: a roundabout is one turn", () => {
  const route = [point(-300)];
  for (let degrees = 270; degrees <= 360; degrees += 22.5) {
    const a = degrees * Math.PI / 180;
    route.push(point(15 * Math.sin(a), 15 * Math.cos(a)));
  }
  route.push(point(0, 300));
  const result = turns(route);
  assert.equal(result.length, 1);
  assert.equal(result[0][1], 1);
});

test("routes without a track have no track fields", () => {
  const route = importGpx(`<gpx><wpt lat="51.7" lon="5.36"><name>1</name></wpt></gpx>`, "x");
  assert.doesNotMatch(encode(route), /"t"|"b"/);
});
