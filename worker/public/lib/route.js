// @ts-check
// Routes in de webapp, en het formaat voor het horloge (docs/route-format.md).

/** @typedef {{lat: number, lon: number}} Coordinate */
/** @typedef {{id: string, number: number, coordinate?: Coordinate | null}} Step */
/** @typedef {{id: string, name: string, steps: Step[], track?: Coordinate[] | null}} Route */

import { simplify, turns } from "./trackguide.js";

export const SCALE = 100_000;

/** @param {string} [name] @returns {Route} */
export function createRoute(name = "Nieuwe route") {
  return { id: newId(), name, steps: [] };
}

/** @param {Route} route @param {number[]} numbers */
export function appendNumbers(route, numbers) {
  route.steps.push(...numbers.map((number) => ({ id: newId(), number, coordinate: null })));
}

/** Een ander nummer is een ander knooppunt: de locatie vervalt. @param {Route} route @param {string} id @param {number} number */
export function setNumber(route, id, number) {
  const step = route.steps.find((s) => s.id === id);
  if (!step || step.number === number) return;
  step.number = number;
  step.coordinate = null;
}

/** @param {Route} route @param {string} id */
export function removeStep(route, id) {
  route.steps = route.steps.filter((s) => s.id !== id);
}

/** Stap één plek omhoog (-1) of omlaag (+1). @param {Route} route @param {string} id @param {-1 | 1} delta */
export function moveStep(route, id, delta) {
  const i = route.steps.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= route.steps.length) return;
  [route.steps[i], route.steps[j]] = [route.steps[j], route.steps[i]];
}

/** Aantal stappen zonder locatie. @param {Route} route */
export function missingLocations(route) {
  return route.steps.filter((s) => !s.coordinate).length;
}

/**
 * JSON voor het horloge (docs/route-format.md), met gesorteerde sleutels, zodat dezelfde
 * route altijd byte-voor-byte hetzelfde wordt. Met een GPX-track gaan ook
 * de vereenvoudigde track (`t`, als delta's) en de afslagen (`b`) mee.
 * @param {Route} route
 */
export function encode(route) {
  /** @type {{t?: number[][], b?: number[][]}} */
  const extra = {};
  if (route.track && route.track.length >= 2) {
    const simple = simplify(route.track);
    extra.t = deltas(simple);
    extra.b = turns(simple);
  }
  const j = route.steps.map((s) =>
    s.coordinate ? [s.number, scaled(s.coordinate.lat), scaled(s.coordinate.lon)] : [s.number]);
  /** @type {Record<string, unknown>} */
  const payload = {};
  if (extra.b) payload.b = extra.b;
  payload.j = j;
  payload.n = route.name;
  if (extra.t) payload.t = extra.t;
  payload.v = 1;
  return JSON.stringify(payload); // geen escapes
}

/** Eerste punt absoluut, daarna verschillen met het vorige punt (1e-5 graad). @param {Coordinate[]} points */
export function deltas(points) {
  let lat = 0, lon = 0;
  return points.map((c) => {
    const d = [scaled(c.lat) - lat, scaled(c.lon) - lon];
    lat = scaled(c.lat);
    lon = scaled(c.lon);
    return d;
  });
}

/** Graden -> eenheden van 1e-5 graad; .5 van nul af. @param {number} degrees */
export function scaled(degrees) {
  const x = degrees * SCALE;
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

function newId() {
  return globalThis.crypto.randomUUID();
}
